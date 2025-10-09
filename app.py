#!/usr/bin/env python3
"""
DNS GUI for BIND - Main Flask Application
Provides REST API for managing DNS zones and records
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import logging
from bind_manager import BindManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Initialize BIND manager
bind_manager = BindManager(
    zones_dir=os.getenv('BIND_ZONES_DIR', '/etc/bind/zones'),
    config_file=os.getenv('BIND_CONFIG_FILE', '/etc/bind/named.conf.local'),
    use_rndc=os.getenv('USE_RNDC', 'true').lower() == 'true'
)


@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('static', 'index.html')


@app.route('/api/zones', methods=['GET'])
def get_zones():
    """Get all DNS zones"""
    try:
        zones = bind_manager.list_zones()
        return jsonify({'success': True, 'zones': zones})
    except Exception as e:
        logger.error(f"Error listing zones: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/zones', methods=['POST'])
def create_zone():
    """Create a new DNS zone"""
    try:
        data = request.get_json()
        zone_name = data.get('zone_name')
        
        if not zone_name:
            return jsonify({'success': False, 'error': 'zone_name is required'}), 400
        
        # Optional parameters
        admin_email = data.get('admin_email', f'admin.{zone_name}')
        ttl = data.get('ttl', 86400)
        
        bind_manager.create_zone(zone_name, admin_email, ttl)
        
        return jsonify({
            'success': True,
            'message': f'Zone {zone_name} created successfully'
        })
    except Exception as e:
        logger.error(f"Error creating zone: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/zones/<zone_name>', methods=['DELETE'])
def delete_zone(zone_name):
    """Delete a DNS zone"""
    try:
        bind_manager.delete_zone(zone_name)
        return jsonify({
            'success': True,
            'message': f'Zone {zone_name} deleted successfully'
        })
    except Exception as e:
        logger.error(f"Error deleting zone: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/zones/<zone_name>/records', methods=['GET'])
def get_records(zone_name):
    """Get all records for a zone"""
    try:
        records = bind_manager.list_records(zone_name)
        return jsonify({'success': True, 'records': records})
    except Exception as e:
        logger.error(f"Error listing records: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/zones/<zone_name>/records', methods=['POST'])
def create_record(zone_name):
    """Create a new DNS record"""
    try:
        data = request.get_json()
        name = data.get('name')
        record_type = data.get('type')
        value = data.get('value')
        ttl = data.get('ttl', 3600)
        
        if not all([name, record_type, value]):
            return jsonify({
                'success': False,
                'error': 'name, type, and value are required'
            }), 400
        
        bind_manager.add_record(zone_name, name, record_type, value, ttl)
        
        return jsonify({
            'success': True,
            'message': f'Record {name} created successfully'
        })
    except Exception as e:
        logger.error(f"Error creating record: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/zones/<zone_name>/records/<record_id>', methods=['PUT'])
def update_record(zone_name, record_id):
    """Update an existing DNS record"""
    try:
        data = request.get_json()
        name = data.get('name')
        record_type = data.get('type')
        value = data.get('value')
        ttl = data.get('ttl', 3600)
        
        if not all([name, record_type, value]):
            return jsonify({
                'success': False,
                'error': 'name, type, and value are required'
            }), 400
        
        bind_manager.update_record(zone_name, record_id, name, record_type, value, ttl)
        
        return jsonify({
            'success': True,
            'message': f'Record updated successfully'
        })
    except Exception as e:
        logger.error(f"Error updating record: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/zones/<zone_name>/records/<record_id>', methods=['DELETE'])
def delete_record(zone_name, record_id):
    """Delete a DNS record"""
    try:
        bind_manager.delete_record(zone_name, record_id)
        return jsonify({
            'success': True,
            'message': 'Record deleted successfully'
        })
    except Exception as e:
        logger.error(f"Error deleting record: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'bind_status': bind_manager.check_bind_status()
    })


# ========== Settings API Endpoints ==========

@app.route('/api/settings/blocked-zones', methods=['GET'])
def get_blocked_zones():
    """Get list of blocked zones"""
    try:
        blocked_zones = bind_manager.list_blocked_zones()
        return jsonify({'success': True, 'blocked_zones': blocked_zones})
    except Exception as e:
        logger.error(f"Error listing blocked zones: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/settings/blocked-zones', methods=['POST'])
def add_blocked_zone():
    """Add a blocked zone"""
    try:
        data = request.get_json()
        domain = data.get('domain')
        
        if not domain:
            return jsonify({'success': False, 'error': 'domain is required'}), 400
        
        bind_manager.add_blocked_zone(domain)
        
        return jsonify({
            'success': True,
            'message': f'Domain {domain} blocked successfully'
        })
    except Exception as e:
        logger.error(f"Error blocking domain: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/settings/blocked-zones/<domain>', methods=['DELETE'])
def remove_blocked_zone(domain):
    """Remove a blocked zone"""
    try:
        bind_manager.remove_blocked_zone(domain)
        return jsonify({
            'success': True,
            'message': f'Domain {domain} unblocked successfully'
        })
    except Exception as e:
        logger.error(f"Error unblocking domain: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/settings/forwarders', methods=['GET'])
def get_forwarders():
    """Get configured forwarders"""
    try:
        forwarders = bind_manager.list_forwarders()
        return jsonify({'success': True, 'forwarders': forwarders})
    except Exception as e:
        logger.error(f"Error listing forwarders: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/settings/forwarders', methods=['POST'])
def add_forwarder():
    """Add a forwarder"""
    try:
        data = request.get_json()
        ip = data.get('ip')
        
        if not ip:
            return jsonify({'success': False, 'error': 'ip is required'}), 400
        
        bind_manager.add_forwarder(ip)
        
        return jsonify({
            'success': True,
            'message': f'Forwarder {ip} added successfully'
        })
    except Exception as e:
        logger.error(f"Error adding forwarder: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/settings/forwarders/<ip>', methods=['DELETE'])
def remove_forwarder(ip):
    """Remove a forwarder"""
    try:
        bind_manager.remove_forwarder(ip)
        return jsonify({
            'success': True,
            'message': f'Forwarder {ip} removed successfully'
        })
    except Exception as e:
        logger.error(f"Error removing forwarder: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/settings/recursion', methods=['GET'])
def get_recursion_settings():
    """Get recursion settings"""
    try:
        settings = bind_manager.get_recursion_settings()
        return jsonify({
            'success': True,
            'recursion_enabled': settings.get('enabled', False),
            'allowed_networks': settings.get('allowed_networks', [])
        })
    except Exception as e:
        logger.error(f"Error getting recursion settings: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/settings/recursion', methods=['PUT'])
def update_recursion():
    """Update recursion enabled/disabled"""
    try:
        data = request.get_json()
        enabled = data.get('enabled', False)
        
        bind_manager.set_recursion(enabled)
        
        return jsonify({
            'success': True,
            'message': f'Recursion {"enabled" if enabled else "disabled"}'
        })
    except Exception as e:
        logger.error(f"Error updating recursion: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/settings/recursion/networks', methods=['POST'])
def add_recursion_network():
    """Add allowed recursion network"""
    try:
        data = request.get_json()
        network = data.get('network')
        
        if not network:
            return jsonify({'success': False, 'error': 'network is required'}), 400
        
        bind_manager.add_recursion_network(network)
        
        return jsonify({
            'success': True,
            'message': f'Network {network} added successfully'
        })
    except Exception as e:
        logger.error(f"Error adding network: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/settings/recursion/networks/<path:network>', methods=['DELETE'])
def remove_recursion_network(network):
    """Remove allowed recursion network"""
    try:
        bind_manager.remove_recursion_network(network)
        return jsonify({
            'success': True,
            'message': f'Network {network} removed successfully'
        })
    except Exception as e:
        logger.error(f"Error removing network: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('DEBUG', 'False').lower() == 'true')

