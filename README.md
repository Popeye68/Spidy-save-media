
# Spidy-save-media

[![Telegram Channel](https://img.shields.io/badge/Telegram-Join%20Channel-blue?logo=telegram)](https://t.me/spidy_universe)  
[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&name=SpidySaveMediaBot&repository=github.com/Popeye68/Spidy-save-media&branch=main&service_type=web&ports=3000%3Bhttp%3B%2F)  
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Spidy** is an advanced Telegram bot for downloading YouTube and Instagram media, offering format/quality options, admin broadcasting, and force-join support — all wrapped in a beginner-friendly deployment system!

---

## Features

- **YouTube & Instagram Downloading**
- **Video & Audio Format Selection**
- **Force Join Channel Requirement**
- **Admin Broadcasting Support**
- **Large File Uploads via Telegram MTProto**

---

## Environment Variables Setup

Create a `.env` file with the following keys:

```env
BOT_TOKEN=123456789:ABCDefGhIJKlmNoPQRsTuvWXyZ
API_ID=123456
API_HASH=your_api_hash_here
ADMIN_ID=123456789
CHANNEL_USERNAME=@your_channel_username
TELEGRAM_SESSION=your_long_session_string_here
```

### How to Get Each Variable:

- **BOT_TOKEN**: Talk to [@BotFather](https://t.me/BotFather) and create a bot using `/newbot`.
- **API_ID & API_HASH**: Get from [https://my.telegram.org/apps](https://my.telegram.org/apps).
- **ADMIN_ID**: Use [@userinfobot](https://t.me/userinfobot) to get your Telegram numeric ID.
- **CHANNEL_USERNAME**: Use the channel's `@username`, like `@spidy_universe`.
- **TELEGRAM_SESSION**: Run the Python script below to generate:

```bash
python3 - <<'PYCODE'
from telethon.sync import TelegramClient
from telethon.sessions import StringSession

api_id = int(input('API ID: '))
api_hash = input('API HASH: ')

with TelegramClient(StringSession(), api_id, api_hash) as client:
    print('Here is your session string:')
    print(client.session.save())
PYCODE
```

---

## Local Installation (Linux/Termux/Windows)

```bash
git clone https://github.com/Popeye68/Spidy-save-media.git
cd Spidy-save-media
npm install
# Add your .env file here
node bot.js
```

---

## Deploy to Koyeb

[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&name=SpidySaveMediaBot&repository=github.com/Popeye68/Spidy-save-media&branch=main&service_type=web&ports=3000%3Bhttp%3B%2F)

1. Click the button above
2. Link GitHub and choose the repo
3. Add required env variables during deploy
4. Done — your bot will auto-deploy and stay online!

---

## Screenshot

> Example of user selecting YouTube format (Video 720p / MP3) via inline buttons.

---

## Contributing

1. Fork and clone the repo
2. Create your feature branch: `git checkout -b feature/XYZ`
3. Commit your changes: `git commit -m "Add XYZ"`
4. Push to the branch and open a pull request

---

## License

Licensed under the [MIT License](LICENSE)

---

**Made with passion by [@Popeye68](https://github.com/Popeye68)**  
Join our [Telegram Channel](https://t.me/spidy_universe) for updates.
