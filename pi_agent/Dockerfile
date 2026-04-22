# Exo-Platform Pi Agent Container
# Useful for running simulated agents without Pi hardware.
FROM python:3.12-slim

LABEL maintainer="Exo-Platform Contributors"
LABEL description="Pi agent for Exo-Platform (simulation mode or real hardware via USB passthrough)"

# Install system dependencies (Pillow needs libjpeg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -u 1000 -m pi && chown -R pi:pi /app
USER pi

ENV EXO_SIM_MODE=1
ENV EXO_HOST=server
ENV EXO_CLIENT_ID=pi-sim-docker

CMD ["python3", "agent.py"]
