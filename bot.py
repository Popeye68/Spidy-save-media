# bot.py
import os, asyncio, logging, yt_dlp, threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from telethon import TelegramClient, events, Button, errors
import json

if not os.path.exists("users.json"):
    with open("users.json", "w") as f:
        json.dump([], f)
        
# Enable logging for debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
BOT_TOKEN = os.getenv("BOT_TOKEN")
API_ID = int(os.getenv("API_ID", 0))
API_HASH = os.getenv("API_HASH")
ADMIN_ID = int(os.getenv("ADMIN_ID", 0))
CHANNEL_USERNAME = os.getenv("CHANNEL_USERNAME")
# Ensure channel username is prefixed with @
if CHANNEL_USERNAME and not CHANNEL_USERNAME.startswith("@"):
    CHANNEL_USERNAME = "@" + CHANNEL_USERNAME
TELEGRAM_SESSION = os.getenv("TELEGRAM_SESSION")
PORT = int(os.getenv("PORT", 8080))

# File to store user chat IDs
USERS_FILE = 'users.json'

# Initialize the Telethon client
client = TelegramClient('bot', API_ID, API_HASH)

# Ensure the HTTP health-check server runs (for Koyeb)
class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'OK')
def run_health_server():
    try:
        server = HTTPServer(('0.0.0.0', PORT), HealthHandler)
        logger.info(f"Health server running on port {PORT}")
        server.serve_forever()
    except Exception as e:
        logger.error(f"Health server error: {e}")
# Start health server in background
threading.Thread(target=run_health_server, daemon=True).start()

# Helper to load/save user IDs
def load_users():
    try:
        with open(USERS_FILE, 'r') as f:
            return set(json.load(f))
    except Exception:
        return set()

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(list(users), f)

# Add a new user ID to storage
def add_user(chat_id):
    users = load_users()
    if chat_id not in users:
        users.add(chat_id)
        save_users(users)
        logger.info(f"Added new user {chat_id}")

# Check if a user has joined the channel (force-join logic)
async def is_user_joined(user_id):
    try:
        await client.get_permissions(CHANNEL_USERNAME, user_id)
        return True
    except errors.UserNotParticipantError:
        return False
    except Exception as e:
        # If other error, assume not joined
        logger.warning(f"Error checking membership for {user_id}: {e}")
        return False

# Force-join handler decorator
def require_join(handler):
    async def wrapper(event):
        # Skip groups/channels
        if not event.is_private:
            return await handler(event)
        user_id = event.sender_id
        if not await is_user_joined(user_id):
            # Prompt user to join
            buttons = [
                [Button.url("Join Channel", f"https://t.me/{CHANNEL_USERNAME.lstrip('@')}")],
                [Button.inline("Verify", data="verify")]
            ]
            await event.reply(
                "🚫 You must join our channel to use this bot.",
                buttons=buttons
            )
            return  # Do not proceed with the original handler
        # Mark user in our database
        add_user(user_id)
        return await handler(event)
    return wrapper

# /start and /help handler
@client.on(events.NewMessage(pattern=r'^/(start|help)$'))
@require_join
async def on_start(event):
    first = event.sender.first_name or "there"
    msg = (f"👋 Hello, {first}! Welcome to the bot.\n\n"
           "Send me a YouTube or Instagram link, and I'll download it for you. "
           "Use /broadcast (admin only) to send a message to all users.")
    await event.reply(msg)

# Handle YouTube links (videos and Shorts)
@client.on(events.NewMessage(func=lambda e: e.is_private and ('youtu.be' in (e.message.text or '') 
                                                   or 'youtube.com' in (e.message.text or ''))))
@require_join
async def youtube_handler(event):
    text = event.message.text.strip()
    # Extract URL (basic)
    url = text.split()[0]
    # Prompt for video or audio
    buttons = [
        [Button.inline("🎥 Video", data=f"yt_video|{url}"),
         Button.inline("🎧 Audio", data=f"yt_audio|{url}")]
    ]
    await event.reply("Choose format to download:", buttons=buttons)

# Handle Instagram links
@client.on(events.NewMessage(func=lambda e: e.is_private and 'instagram.com' in (e.message.text or '')))
@require_join
async def instagram_handler(event):
    text = event.message.text.strip()
    url = text.split()[0]
    await event.reply("Downloading Instagram content... 📥")
    try:
        ydl_opts = {'outtmpl': 'insta_%(id)s.%(ext)s', 'quiet': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
        file_path = ydl.prepare_filename(info)
        # Send the file
        caption = "🎉 Here is your Instagram media!"
        await client.send_file(
            event.chat_id, file_path,
            caption=caption,
            buttons=Button.inline("Join Channel ✅", data="noop")  # Data 'noop' does nothing
        )
        os.remove(file_path)
    except Exception as e:
        logger.error(f"Failed to download Instagram URL {url}: {e}")
        await event.reply("This account is private or content is not accessible.")

# CallbackQuery handler (for inline buttons)
@client.on(events.CallbackQuery)
async def callback_handler(event):
    data = event.data.decode('utf-8')
    user_id = event.sender_id

    # Verification after joining channel
    if data == "verify":
        if await is_user_joined(user_id):
            await event.answer("✅ Verified!", alert=False)
            add_user(user_id)
            await event.reply("Thank you for joining! You can now use the bot.")
        else:
            await event.answer("🚫 You must join our channel first.", alert=False)
        return

    # No-op (for static buttons)
    if data == "noop":
        await event.answer()
        return

    # Handle YouTube callback formats
    # Data format: "yt_video|<url>" or "yt_audio|<url>" or "yt_quality|<url>|<format>"
    parts = data.split("|")
    if parts[0] in ("yt_video", "yt_audio"):
        mode, url = parts
        if mode == "yt_video":
            # Ask for quality selection
            qualities = ["360p", "720p", "1080p"]
            buttons = [[Button.inline(q, data=f"yt_quality|{url}|{q}")] for q in qualities]
            await event.reply("Select video quality:", buttons=buttons)
        else:
            # Audio download directly
            await event.reply("Downloading audio... 🎧")
            try:
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': 'audio.%(ext)s',
                    'quiet': True
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                file_path = ydl.prepare_filename(info)
                await client.send_file(
                    event.chat_id, file_path,
                    caption="🎵 Here is your audio!",
                    buttons=Button.inline("Join Channel ✅", data="noop")
                )
                os.remove(file_path)
            except Exception as e:
                logger.error(f"YT audio download failed: {e}")
                await event.reply("Failed to download audio.")
        await event.answer()  # stop loading
        return

    # Handle quality selection for video
    if parts[0] == "yt_quality":
        _, url, quality = parts
        await event.reply(f"Downloading video at {quality}... 🎬")
        try:
            # Set format filter for height <= quality
            height = int(quality.rstrip('p'))
            ydl_opts = {
                'format': f'bestvideo[height<={height}]+bestaudio/best',
                'outtmpl': 'video.%(ext)s',
                'quiet': True
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
            file_path = ydl.prepare_filename(info)
            await client.send_file(
                event.chat_id, file_path,
                caption=f"🎥 Video downloaded ({quality})!",
                buttons=Button.inline("Join Channel ✅", data="noop")
            )
            os.remove(file_path)
        except Exception as e:
            logger.error(f"YT video download failed: {e}")
            await event.reply("Failed to download video.")
        await event.answer()
        return

    # Admin broadcast (ignore in callback context)
    await event.answer()

# Admin broadcast command
@client.on(events.NewMessage(pattern=r'^/broadcast(?:\s+(.+))?$'))
async def broadcast_handler(event):
    sender = event.sender_id
    if sender != ADMIN_ID:
        return  # ignore non-admins
    text = event.message.text
    content = text.split(' ', 1)
    if len(content) < 2:
        await event.reply("Usage: /broadcast Your message here")
        return
    broadcast_text = content[1]
    users = load_users()
    if not users:
        await event.reply("No users to broadcast to.")
        return
    success = fail = 0
    for uid in users:
        try:
            await client.send_message(uid, broadcast_text)
            success += 1
        except Exception as e:
            logger.warning(f"Broadcast to {uid} failed: {e}")
            fail += 1
    await event.reply(f"Broadcast done. Success: {success}, Failed: {fail}")

# Start the client
async def main():
    await client.start(bot_token=BOT_TOKEN)
    logger.info("Bot started. Running until disconnected...")
    await client.run_until_disconnected()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot stopped.")
                          
