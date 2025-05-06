# Use official Node.js image
FROM node:20-alpine

# Install dependencies for yt-dlp
RUN apk add --no-cache \
  python3 \
  py3-pip \
  ffmpeg \
  bash \
  curl

# Install yt-dlp
RUN pip install --no-cache-dir yt-dlp

# Set working directory
WORKDIR /app

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the project
COPY . .

# Expose port for Koyeb health check
EXPOSE 3000

# Start the bot
CMD ["node", "bot.js"]
