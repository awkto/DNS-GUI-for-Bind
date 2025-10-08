# DNS GUI for BIND

A sleek, modern web interface for managing BIND DNS zones and records. This application combines the power of BIND9 DNS server with an intuitive Python Flask web interface, all packaged together in a convenient Docker container.

![Docker Pulls](https://img.shields.io/docker/pulls/awkto/dns-gui-for-bind)
![GitHub Actions](https://img.shields.io/github/actions/workflow/status/awkto/dns-gui-for-bind/docker-build.yml?branch=main)
![License](https://img.shields.io/github/license/awkto/dns-gui-for-bind)

## ✨ Features

- 🎨 **Modern UI** - Beautiful, responsive interface built with Tailwind CSS
- 🚀 **Easy to Use** - Intuitive zone and record management
- 🔧 **Zone Management** - Create and delete DNS zones with ease
- 📝 **Record Management** - Create, edit, and delete DNS records (A, AAAA, CNAME, MX, TXT, NS, PTR, SRV)
- 🐳 **Docker Ready** - Runs BIND and the web interface together in one container
- 🔄 **Auto-reload** - Changes are automatically applied to BIND using `rndc`
- 🏥 **Health Checks** - Built-in monitoring of BIND and application status
- 🔌 **REST API** - Full-featured API for automation and integration

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
docker run -d \
  --name dns-gui-for-bind \
  -p 53:53/tcp \
  -p 53:53/udp \
  -p 5000:5000 \
  awkto/dns-gui-for-bind:latest
```

Then open your browser to `http://localhost:5000`

### Using Docker Compose

```bash
git clone https://github.com/awkto/dns-gui-for-bind.git
cd dns-gui-for-bind
docker-compose up -d
```

Access the web interface at `http://localhost:5000`

## 📋 Requirements

### For Docker Deployment
- Docker 20.10+
- Docker Compose 2.0+ (optional)

### For Standalone Deployment
- Python 3.8+
- BIND9 DNS server
- pip (Python package manager)

## 🛠️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BIND_ZONES_DIR` | `/etc/bind/zones` | Directory for zone files |
| `BIND_CONFIG_FILE` | `/etc/bind/named.conf.local` | BIND local configuration file |
| `USE_RNDC` | `true` | Use rndc for reloading BIND |
| `PORT` | `5000` | Web interface port |

### Persistent Storage

To persist your DNS zones and configurations, use Docker volumes:

```bash
docker run -d \
  --name dns-gui-for-bind \
  -p 53:53/tcp \
  -p 53:53/udp \
  -p 5000:5000 \
  -v dns-zones:/etc/bind/zones \
  -v dns-config:/etc/bind \
  awkto/dns-gui-for-bind:latest
```

## 📚 Usage Guide

### Creating a DNS Zone

1. Click the **"+ Add Zone"** button in the Zones panel
2. Enter the zone name (e.g., `example.com`)
3. Optionally set admin email and TTL
4. Click **"Create Zone"**

The zone will be created with default NS and SOA records.

### Adding DNS Records

1. Select a zone from the Zones panel
2. Click **"+ Add Record"** in the Records panel
3. Fill in the record details:
   - **Name**: Record name (e.g., `www`, `mail`, or `@` for root)
   - **Type**: Record type (A, AAAA, CNAME, MX, TXT, etc.)
   - **Value**: Record value (IP address, hostname, etc.)
   - **TTL**: Time to live in seconds
4. Click **"Save Record"**

### Editing Records

1. Click the edit icon (✏️) next to any record
2. Modify the values as needed
3. Click **"Save Record"**

### Deleting Records or Zones

- Click the delete icon (🗑️) next to a record or zone
- Confirm the deletion

## 🔌 API Reference

### Zones

#### List All Zones
```http
GET /api/zones
```

#### Create Zone
```http
POST /api/zones
Content-Type: application/json

{
  "zone_name": "example.com",
  "admin_email": "admin@example.com",
  "ttl": 86400
}
```

#### Delete Zone
```http
DELETE /api/zones/{zone_name}
```

### Records

#### List Records
```http
GET /api/zones/{zone_name}/records
```

#### Create Record
```http
POST /api/zones/{zone_name}/records
Content-Type: application/json

{
  "name": "www",
  "type": "A",
  "value": "192.168.1.1",
  "ttl": 3600
}
```

#### Update Record
```http
PUT /api/zones/{zone_name}/records/{record_id}
Content-Type: application/json

{
  "name": "www",
  "type": "A",
  "value": "192.168.1.2",
  "ttl": 3600
}
```

#### Delete Record
```http
DELETE /api/zones/{zone_name}/records/{record_id}
```

### Health Check
```http
GET /api/health
```

## 🏗️ Standalone Installation

If you prefer to run the application without Docker:

### 1. Install BIND9

```bash
# Ubuntu/Debian
sudo apt-get install bind9 bind9utils

# CentOS/RHEL
sudo yum install bind bind-utils
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
export BIND_ZONES_DIR=/etc/bind/zones
export BIND_CONFIG_FILE=/etc/bind/named.conf.local
export USE_RNDC=true
export PORT=5000
```

### 4. Run the Application

```bash
python3 app.py
```

## 🧪 Development

### Project Structure

```
dns-gui-for-bind/
├── app.py                  # Flask application and API routes
├── bind_manager.py         # BIND management logic
├── requirements.txt        # Python dependencies
├── static/
│   ├── index.html         # Frontend UI
│   └── app.js             # Frontend JavaScript
├── bind-config/
│   ├── named.conf         # Main BIND configuration
│   ├── named.conf.local   # Local zones configuration
│   └── named.conf.default-zones  # Default zones
├── Dockerfile             # Container build instructions
├── docker-compose.yml     # Docker Compose configuration
├── start.sh              # Container startup script
└── .github/
    └── workflows/
        └── docker-build.yml  # CI/CD pipeline
```

### Building from Source

```bash
git clone https://github.com/awkto/dns-gui-for-bind.git
cd dns-gui-for-bind
docker build -t dns-gui-for-bind .
docker run -d -p 53:53/tcp -p 53:53/udp -p 5000:5000 dns-gui-for-bind
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security Considerations

- The default configuration allows queries from any source - adjust in production
- Consider implementing authentication for the web interface in production
- Use firewall rules to restrict access to ports 53 and 5000
- Regularly update the container to get security patches

## 🐛 Troubleshooting

### BIND won't start
- Check configuration: `named-checkconf /etc/bind/named.conf`
- Check logs: `docker logs dns-gui-for-bind`
- Ensure ports 53 and 5000 are not already in use

### Changes not taking effect
- Verify BIND is running: `rndc status`
- Check that `USE_RNDC` is set to `true`
- Review application logs for errors

### Web interface not accessible
- Ensure port 5000 is not blocked by firewall
- Check that the Flask application started successfully
- Verify Docker port mapping is correct

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/awkto/dns-gui-for-bind/issues)
- **Discussions**: [GitHub Discussions](https://github.com/awkto/dns-gui-for-bind/discussions)

## 🙏 Acknowledgments

- BIND9 DNS Server by ISC
- Flask web framework
- Tailwind CSS for the beautiful UI
- Docker for containerization

---

Made with ❤️ for the DNS community