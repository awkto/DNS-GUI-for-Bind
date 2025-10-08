FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install BIND9 and Python
RUN apt-get update && apt-get install -y \
    bind9 \
    bind9utils \
    bind9-doc \
    python3 \
    python3-pip \
    dnsutils \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy Python requirements and install
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py .
COPY bind_manager.py .
COPY static/ ./static/

# Copy BIND configuration
COPY bind-config/named.conf /etc/bind/named.conf
COPY bind-config/named.conf.local /etc/bind/named.conf.local
COPY bind-config/named.conf.default-zones /etc/bind/named.conf.default-zones

# Create zones directory
RUN mkdir -p /etc/bind/zones && \
    chown -R bind:bind /etc/bind/zones && \
    chown -R bind:bind /var/cache/bind

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Environment variables
ENV BIND_ZONES_DIR=/etc/bind/zones
ENV BIND_CONFIG_FILE=/etc/bind/named.conf.local
ENV USE_RNDC=true
ENV PORT=5000

# Expose DNS and web interface ports
EXPOSE 53/tcp 53/udp 5000/tcp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD pgrep -x named && curl -f http://localhost:5000/api/health || exit 1

# Run startup script
CMD ["/start.sh"]
