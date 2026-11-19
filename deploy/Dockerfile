FROM python:3.13-slim

# Install system dependencies: ffmpeg, yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server code
COPY apps/server/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/server/ ./apps/server/

# Create persistent data directory
RUN mkdir -p /app/data/downloads /app/data/local_music

# Expose port
ENV PORT=8000
EXPOSE 8000

# Run from the server directory
WORKDIR /app/apps/server
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
