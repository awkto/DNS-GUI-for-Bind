#!/bin/bash
# Startup script for Docker container

set -e

echo "Starting DNS GUI for BIND..."

# Ensure directories exist
mkdir -p /etc/bind/zones
mkdir -p /var/cache/bind
mkdir -p /var/run/named

# Set proper permissions
chown -R bind:bind /etc/bind
chown -R bind:bind /var/cache/bind
chown -R bind:bind /var/run/named
chown -R bind:bind /etc/bind/zones

# Check BIND configuration
echo "Checking BIND configuration..."
named-checkconf /etc/bind/named.conf

# Start BIND in the background
echo "Starting BIND DNS server..."
named -u bind -c /etc/bind/named.conf

# Wait for BIND to start
sleep 3

# Check if BIND is running
if pgrep -x "named" > /dev/null; then
    echo "✓ BIND is running"
else
    echo "✗ BIND failed to start"
    exit 1
fi

# Start Flask application
echo "Starting DNS GUI web interface on port 5000..."
cd /app
exec python3 app.py
