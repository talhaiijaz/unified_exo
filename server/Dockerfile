# Exo-Platform Server Container
FROM python:3.12-slim

LABEL maintainer="Exo-Platform Contributors"
LABEL description="FastAPI backend for Exo-Platform"

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Create data directory
RUN mkdir -p /data && \
    useradd -u 1000 -m exo && \
    chown -R exo:exo /app /data

USER exo

EXPOSE 5000 1863 8612 8613

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/api/health')"

CMD ["python3", "app.py"]
