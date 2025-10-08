# Contributing to DNS GUI for BIND

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/dns-gui-for-bind.git
   cd dns-gui-for-bind
   ```
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Using Docker (Recommended)

```bash
docker-compose up --build
```

The application will be available at:
- Web Interface: http://localhost:5000
- DNS Server: localhost:53

### Local Development

1. Install BIND9:
   ```bash
   sudo apt-get install bind9 bind9utils
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set environment variables:
   ```bash
   export BIND_ZONES_DIR=/etc/bind/zones
   export BIND_CONFIG_FILE=/etc/bind/named.conf.local
   export USE_RNDC=true
   export PORT=5000
   ```

4. Run the application:
   ```bash
   python3 app.py
   ```

## Code Style

### Python
- Follow PEP 8 guidelines
- Use meaningful variable and function names
- Add docstrings to functions and classes
- Keep functions focused and concise

### JavaScript
- Use modern ES6+ syntax
- Use async/await for asynchronous operations
- Add comments for complex logic
- Follow consistent naming conventions

### HTML/CSS
- Use semantic HTML5 elements
- Keep Tailwind classes organized
- Ensure responsive design
- Test on multiple browsers

## Making Changes

1. **Write clear, descriptive commit messages**:
   ```bash
   git commit -m "Add feature: support for SPF records"
   ```

2. **Keep commits focused**: Each commit should address one specific change

3. **Test your changes**: Ensure the application works correctly:
   - Build and run the Docker container
   - Test zone creation/deletion
   - Test record CRUD operations
   - Verify BIND configuration is valid

4. **Update documentation**: If you add features or change behavior, update:
   - README.md
   - Code comments
   - API documentation

## Pull Request Process

1. **Update your fork** with the latest changes from main:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request** on GitHub with:
   - Clear title describing the change
   - Detailed description of what and why
   - Screenshots (if UI changes)
   - Testing steps
   - Related issue numbers (if applicable)

4. **Respond to feedback**: Be open to suggestions and make requested changes

## Testing

Before submitting a PR, test:
- ✅ Docker build completes successfully
- ✅ Container starts without errors
- ✅ Web interface loads correctly
- ✅ Zone creation/deletion works
- ✅ Record CRUD operations work
- ✅ BIND reloads successfully
- ✅ No console errors in browser

## Feature Requests

Have an idea for a new feature? Great!

1. Check existing issues to avoid duplicates
2. Create a new issue with the "enhancement" label
3. Describe the feature and its benefits
4. Discuss implementation approach

## Bug Reports

Found a bug? Help us fix it!

1. Check if it's already reported
2. Create a new issue with the "bug" label
3. Include:
   - Description of the bug
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment (OS, Docker version, etc.)
   - Logs and error messages

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Personal or political attacks
- Publishing private information
- Unprofessional conduct

## Questions?

- Open an issue for project-related questions
- Use GitHub Discussions for general questions
- Check the README for common issues

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉
