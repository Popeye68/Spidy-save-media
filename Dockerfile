# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the project
COPY . .

# Expose port (not required by Telegram but needed for Koyeb)
EXPOSE 3000

# Start the bot
CMD ["node", "bot.js"]
