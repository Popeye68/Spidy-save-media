# Use official Node.js image
FROM node:20-bullseye

# Install dependencies for yt-dlp
RUN apt update && apt install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && pip3 install --no-cache-dir yt-dlp \
    && apt clean

# Set working directory
WORKDIR /app

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the project
COPY . .

# Expose port for Koyeb
EXPOSE 3000

# Start the bot
CMD ["node", "bot.js"]
