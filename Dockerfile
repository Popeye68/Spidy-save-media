# Use official Node.js image
# Dockerfile
FROM python:3.10-slim

# Install dependencies
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy bot code
COPY bot.py .

# Expose port for health checks (Koyeb uses $PORT)
EXPOSE 8080

# Run the bot
CMD ["python", "bot.py"]
