#!/usr/bin/env python3
"""
BIND Manager Module
Handles all interactions with BIND DNS server including zone file management
and server reloading
"""

import os
import re
import subprocess
import time
from datetime import datetime
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class BindManager:
    """Manages BIND DNS server configuration and zone files"""
    
    def __init__(self, zones_dir: str, config_file: str, use_rndc: bool = True):
        """
        Initialize BIND manager
        
        Args:
            zones_dir: Directory where zone files are stored
            config_file: Path to BIND configuration file (named.conf.local)
            use_rndc: Whether to use rndc for reloading (True) or signals (False)
        """
        self.zones_dir = zones_dir
        self.config_file = config_file
        self.use_rndc = use_rndc
        
        # Ensure zones directory exists
        os.makedirs(zones_dir, exist_ok=True)
        
        logger.info(f"BindManager initialized: zones_dir={zones_dir}, config_file={config_file}")
    
    def _get_serial(self) -> str:
        """Generate a serial number based on current timestamp"""
        return datetime.now().strftime('%Y%m%d%H')
    
    def _zone_file_path(self, zone_name: str) -> str:
        """Get the full path to a zone file"""
        return os.path.join(self.zones_dir, f"db.{zone_name}")
    
    def _reload_bind(self):
        """Reload BIND configuration"""
        try:
            if self.use_rndc:
                logger.info("Reloading BIND using rndc")
                subprocess.run(['rndc', 'reload'], check=True, capture_output=True)
            else:
                # Alternative: send HUP signal to named process
                logger.info("Reloading BIND using SIGHUP")
                subprocess.run(['killall', '-HUP', 'named'], check=True, capture_output=True)
            logger.info("BIND reloaded successfully")
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to reload BIND: {e}")
            raise Exception(f"Failed to reload BIND: {e.stderr.decode() if e.stderr else str(e)}")
    
    def check_bind_status(self) -> str:
        """Check if BIND is running"""
        try:
            if self.use_rndc:
                result = subprocess.run(['rndc', 'status'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    return "running"
            return "unknown"
        except Exception as e:
            logger.warning(f"Could not check BIND status: {e}")
            return "unknown"
    
    def list_zones(self) -> List[Dict[str, str]]:
        """List all configured zones"""
        zones = []
        
        if not os.path.exists(self.config_file):
            logger.warning(f"Config file not found: {self.config_file}")
            return zones
        
        try:
            with open(self.config_file, 'r') as f:
                content = f.read()
                
            # Parse zone definitions from config
            zone_pattern = r'zone\s+"([^"]+)"\s+\{[^}]*file\s+"([^"]+)"'
            matches = re.finditer(zone_pattern, content, re.MULTILINE)
            
            for match in matches:
                zone_name = match.group(1)
                zone_file = match.group(2)
                
                # Skip special internal zones (RPZ)
                if zone_name == 'rpz.blocked':
                    continue
                
                # Get record count
                record_count = 0
                full_path = zone_file if zone_file.startswith('/') else os.path.join(self.zones_dir, zone_file)
                
                if os.path.exists(full_path):
                    with open(full_path, 'r') as zf:
                        lines = zf.readlines()
                        # Count non-empty, non-comment lines after SOA/NS
                        in_records = False
                        for line in lines:
                            line = line.strip()
                            if line and not line.startswith(';'):
                                if 'IN' in line and ('SOA' in line or 'NS' in line):
                                    in_records = True
                                elif in_records and 'IN' in line:
                                    record_count += 1
                
                zones.append({
                    'name': zone_name,
                    'file': zone_file,
                    'record_count': record_count
                })
        
        except Exception as e:
            logger.error(f"Error listing zones: {e}")
            raise
        
        return zones
    
    def create_zone(self, zone_name: str, admin_email: str = None, ttl: int = 86400):
        """
        Create a new DNS zone
        
        Args:
            zone_name: Domain name for the zone
            admin_email: Administrator email (default: admin@zone_name)
            ttl: Default TTL for records
        """
        if not admin_email:
            admin_email = f"admin.{zone_name}."
        else:
            admin_email = admin_email.replace('@', '.') + '.'
        
        zone_file = self._zone_file_path(zone_name)
        
        if os.path.exists(zone_file):
            raise Exception(f"Zone {zone_name} already exists")
        
        # Create zone file with SOA and NS records
        serial = self._get_serial()
        zone_content = f""";
; Zone file for {zone_name}
;
$TTL {ttl}
@       IN      SOA     ns1.{zone_name}. {admin_email} (
                        {serial}    ; Serial
                        3600        ; Refresh
                        1800        ; Retry
                        604800      ; Expire
                        86400 )     ; Minimum TTL

; Name servers
@       IN      NS      ns1.{zone_name}.

; Default A record for name server
ns1     IN      A       127.0.0.1
"""
        
        with open(zone_file, 'w') as f:
            f.write(zone_content)
        
        logger.info(f"Created zone file: {zone_file}")
        
        # Add zone to BIND configuration
        self._add_zone_to_config(zone_name, zone_file)
        
        # Reload BIND
        self._reload_bind()
        
        logger.info(f"Zone {zone_name} created successfully")
    
    def _add_zone_to_config(self, zone_name: str, zone_file: str):
        """Add a zone definition to BIND config"""
        zone_def = f"""
zone "{zone_name}" {{
    type master;
    file "{zone_file}";
    allow-update {{ none; }};
}};
"""
        
        # Read existing config
        config_content = ""
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r') as f:
                config_content = f.read()
        
        # Check if zone already exists
        if f'zone "{zone_name}"' in config_content:
            raise Exception(f"Zone {zone_name} already exists in configuration")
        
        # Append new zone
        with open(self.config_file, 'a') as f:
            f.write(zone_def)
        
        logger.info(f"Added zone {zone_name} to config: {self.config_file}")
    
    def delete_zone(self, zone_name: str):
        """Delete a DNS zone"""
        zone_file = self._zone_file_path(zone_name)
        
        # Remove zone file
        if os.path.exists(zone_file):
            os.remove(zone_file)
            logger.info(f"Deleted zone file: {zone_file}")
        
        # Remove from config
        self._remove_zone_from_config(zone_name)
        
        # Reload BIND
        self._reload_bind()
        
        logger.info(f"Zone {zone_name} deleted successfully")
    
    def _remove_zone_from_config(self, zone_name: str):
        """Remove a zone definition from BIND config"""
        if not os.path.exists(self.config_file):
            return
        
        with open(self.config_file, 'r') as f:
            lines = f.readlines()
        
        # Remove zone block
        new_lines = []
        skip = False
        for line in lines:
            if f'zone "{zone_name}"' in line:
                skip = True
            elif skip and '};' in line:
                skip = False
                continue
            
            if not skip:
                new_lines.append(line)
        
        with open(self.config_file, 'w') as f:
            f.writelines(new_lines)
        
        logger.info(f"Removed zone {zone_name} from config")
    
    def list_records(self, zone_name: str) -> List[Dict[str, any]]:
        """List all records in a zone"""
        zone_file = self._zone_file_path(zone_name)
        
        if not os.path.exists(zone_file):
            raise Exception(f"Zone {zone_name} not found")
        
        records = []
        
        with open(zone_file, 'r') as f:
            lines = f.readlines()
        
        record_id = 0
        for line in lines:
            line = line.strip()
            
            # Skip comments, empty lines, and SOA records
            if not line or line.startswith(';') or 'SOA' in line:
                continue
            
            # Parse record lines (simplified)
            # Format: name TTL class type value
            parts = line.split()
            
            if len(parts) >= 4 and 'IN' in parts:
                in_idx = parts.index('IN')
                
                name = parts[0] if in_idx > 0 else '@'
                ttl = parts[in_idx - 1] if in_idx > 1 and parts[in_idx - 1].isdigit() else '3600'
                record_type = parts[in_idx + 1] if in_idx + 1 < len(parts) else ''
                value = ' '.join(parts[in_idx + 2:]) if in_idx + 2 < len(parts) else ''
                
                # Skip NS records in SOA section
                if record_type in ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV']:
                    records.append({
                        'id': str(record_id),
                        'name': name,
                        'type': record_type,
                        'value': value,
                        'ttl': int(ttl) if ttl.isdigit() else 3600
                    })
                    record_id += 1
        
        return records
    
    def add_record(self, zone_name: str, name: str, record_type: str, value: str, ttl: int = 3600):
        """Add a DNS record to a zone"""
        zone_file = self._zone_file_path(zone_name)
        
        if not os.path.exists(zone_file):
            raise Exception(f"Zone {zone_name} not found")
        
        # Increment serial number
        self._increment_serial(zone_file)
        
        # Add record
        record_line = f"{name}\t{ttl}\tIN\t{record_type}\t{value}\n"
        
        with open(zone_file, 'a') as f:
            f.write(record_line)
        
        logger.info(f"Added record to {zone_name}: {record_line.strip()}")
        
        # Reload BIND
        self._reload_bind()
    
    def update_record(self, zone_name: str, record_id: str, name: str, record_type: str, value: str, ttl: int = 3600):
        """Update a DNS record"""
        zone_file = self._zone_file_path(zone_name)
        
        if not os.path.exists(zone_file):
            raise Exception(f"Zone {zone_name} not found")
        
        # Read all records
        records = self.list_records(zone_name)
        
        # Find the record to update
        target_record = None
        for record in records:
            if record['id'] == record_id:
                target_record = record
                break
        
        if not target_record:
            raise Exception(f"Record {record_id} not found")
        
        # Delete and re-add
        self.delete_record(zone_name, record_id)
        self.add_record(zone_name, name, record_type, value, ttl)
        
        logger.info(f"Updated record {record_id} in {zone_name}")
    
    def delete_record(self, zone_name: str, record_id: str):
        """Delete a DNS record"""
        zone_file = self._zone_file_path(zone_name)
        
        if not os.path.exists(zone_file):
            raise Exception(f"Zone {zone_name} not found")
        
        # Get all records
        records = self.list_records(zone_name)
        
        # Find target
        target_record = None
        for record in records:
            if record['id'] == record_id:
                target_record = record
                break
        
        if not target_record:
            raise Exception(f"Record {record_id} not found")
        
        # Read zone file
        with open(zone_file, 'r') as f:
            lines = f.readlines()
        
        # Remove the matching record line
        new_lines = []
        for line in lines:
            # Check if this line matches our target record
            if (target_record['name'] in line and 
                target_record['type'] in line and 
                target_record['value'] in line):
                continue  # Skip this line
            new_lines.append(line)
        
        # Write back
        with open(zone_file, 'w') as f:
            f.writelines(new_lines)
        
        # Increment serial
        self._increment_serial(zone_file)
        
        logger.info(f"Deleted record {record_id} from {zone_name}")
        
        # Reload BIND
        self._reload_bind()
    
    def _increment_serial(self, zone_file: str):
        """Increment the serial number in a zone file"""
        with open(zone_file, 'r') as f:
            content = f.read()
        
        # Find and increment serial
        serial_pattern = r'(\d{10})\s*;\s*Serial'
        match = re.search(serial_pattern, content)
        
        if match:
            old_serial = match.group(1)
            new_serial = self._get_serial()
            
            # If same day, increment last digit
            if new_serial[:8] == old_serial[:8]:
                new_serial = str(int(old_serial) + 1)
            
            content = content.replace(old_serial, new_serial, 1)
            
            with open(zone_file, 'w') as f:
                f.write(content)
            
            logger.info(f"Incremented serial: {old_serial} -> {new_serial}")

    def get_config(self) -> Dict:
        """
        Read BIND configuration from named.conf
        Returns a dictionary with configuration settings
        """
        main_config_file = os.getenv('BIND_MAIN_CONFIG', '/etc/bind/named.conf')
        
        config = {
            'recursion': False,
            'forwarders': [],
            'conditional_forwarders': {},
            'caching': True,
            'cache_size': 100,
            'max_cache_ttl': 86400,
            'blocked_zones': []
        }
        
        try:
            if os.path.exists(main_config_file):
                with open(main_config_file, 'r') as f:
                    content = f.read()
                
                # Parse recursion
                if re.search(r'recursion\s+yes', content):
                    config['recursion'] = True
                
                # Parse forwarders
                forwarders_match = re.search(r'forwarders\s*{([^}]+)}', content, re.DOTALL)
                if forwarders_match:
                    forwarders_text = forwarders_match.group(1)
                    config['forwarders'] = [
                        ip.strip().rstrip(';') 
                        for ip in re.findall(r'(\d+\.\d+\.\d+\.\d+);?', forwarders_text)
                    ]
                
                # Parse max cache size
                cache_size_match = re.search(r'max-cache-size\s+(\d+)M?', content)
                if cache_size_match:
                    config['cache_size'] = int(cache_size_match.group(1))
                
                # Parse max cache ttl
                cache_ttl_match = re.search(r'max-cache-ttl\s+(\d+)', content)
                if cache_ttl_match:
                    config['max_cache_ttl'] = int(cache_ttl_match.group(1))
            
            # Parse blocked zones from RPZ file
            rpz_file = os.path.join(self.zones_dir, 'db.rpz.blocked')
            if os.path.exists(rpz_file):
                with open(rpz_file, 'r') as f:
                    rpz_content = f.read()
                
                # Extract blocked domains (look for CNAME . entries, skip wildcards)
                blocked_domains = []
                for line in rpz_content.split('\n'):
                    if 'CNAME' in line and '.' in line and not line.strip().startswith('*'):
                        # Extract domain name before CNAME
                        parts = line.split()
                        if len(parts) >= 2 and parts[0] not in ['@', ';']:
                            domain = parts[0].strip()
                            if domain and domain not in blocked_domains:
                                blocked_domains.append(domain)
                config['blocked_zones'] = blocked_domains
            
            # Parse conditional forwarders (zone forwarders) from named.conf.local
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    local_content = f.read()
                
                # Find all zone blocks with type forward
                zone_pattern = r'zone\s+"([^"]+)"\s*{[^}]*type\s+forward[^}]*forwarders\s*{([^}]+)}'
                for match in re.finditer(zone_pattern, local_content, re.DOTALL):
                    zone_name = match.group(1)
                    forwarders_text = match.group(2)
                    # Extract IPs
                    ips = [ip.strip().rstrip(';') for ip in re.findall(r'(\d+\.\d+\.\d+\.\d+);?', forwarders_text)]
                    if ips and zone_name != 'rpz.blocked':
                        config['conditional_forwarders'][zone_name] = ips
        
        except Exception as e:
            logger.error(f"Error reading config: {e}")
        
        return config
    
    def update_config(self, new_config: Dict):
        """
        Update BIND configuration file with new settings
        
        Args:
            new_config: Dictionary containing configuration settings
        """
        main_config_file = os.getenv('BIND_MAIN_CONFIG', '/etc/bind/named.conf')
        
        try:
            # Read current config
            if os.path.exists(main_config_file):
                with open(main_config_file, 'r') as f:
                    content = f.read()
            else:
                # Create basic config if doesn't exist
                content = """
options {
    directory "/var/cache/bind";
    listen-on port 53 { any; };
    listen-on-v6 { any; };
    allow-query { any; };
    dnssec-validation no;
};

include "/etc/bind/named.conf.local";
"""
            
            # Update recursion
            recursion_value = 'yes' if new_config.get('recursion', False) else 'no'
            if re.search(r'recursion\s+(yes|no)', content):
                content = re.sub(r'recursion\s+(yes|no)', f'recursion {recursion_value}', content)
            else:
                # Add after options {
                content = re.sub(r'(options\s*{)', f'\\1\n    recursion {recursion_value};', content)
            
            # Update forwarders
            forwarders = new_config.get('forwarders', [])
            forwarders_block = ''
            if forwarders:
                forwarders_ips = ';\n        '.join(forwarders) + ';'
                forwarders_block = f'\n    forwarders {{\n        {forwarders_ips}\n    }};'
            
            # Remove old forwarders block
            content = re.sub(r'\n?\s*forwarders\s*{[^}]+};\s*', '', content)
            
            # Add new forwarders block if present
            if forwarders_block:
                content = re.sub(r'(recursion\s+(yes|no);)', f'\\1{forwarders_block}', content)
            
            # Update cache settings
            if new_config.get('caching', True):
                cache_size = new_config.get('cache_size', 100)
                cache_ttl = new_config.get('max_cache_ttl', 86400)
                
                # Update or add max-cache-size
                if re.search(r'max-cache-size\s+\d+M?', content):
                    content = re.sub(r'max-cache-size\s+\d+M?', f'max-cache-size {cache_size}M', content)
                else:
                    content = re.sub(r'(options\s*{)', f'\\1\n    max-cache-size {cache_size}M;', content)
                
                # Update or add max-cache-ttl
                if re.search(r'max-cache-ttl\s+\d+', content):
                    content = re.sub(r'max-cache-ttl\s+\d+', f'max-cache-ttl {cache_ttl}', content)
                else:
                    content = re.sub(r'(options\s*{)', f'\\1\n    max-cache-ttl {cache_ttl};', content)
            
            # Handle blocked zones using Response Policy Zones (RPZ)
            blocked_zones = new_config.get('blocked_zones', [])
            
            # Update RPZ configuration in options block
            if blocked_zones:
                rpz_directive = 'response-policy { zone "rpz.blocked"; };'
                if re.search(r'response-policy', content):
                    # Update existing RPZ
                    content = re.sub(r'response-policy\s*{[^}]+};', rpz_directive, content)
                else:
                    # Add RPZ directive after options {
                    content = re.sub(r'(options\s*{)', f'\\1\n    {rpz_directive}', content)
                
                # Create RPZ zone file
                rpz_file = os.path.join(self.zones_dir, 'db.rpz.blocked')
                rpz_content = f'''$TTL 60
@       IN      SOA     localhost. root.localhost. (
                        {self._get_serial()}     ; Serial
                        3600                     ; Refresh
                        1800                     ; Retry
                        604800                   ; Expire
                        60 )                     ; Minimum TTL
        IN      NS      localhost.

; Blocked domains - return NXDOMAIN
'''
                for zone in blocked_zones:
                    # Add RPZ rules to return NXDOMAIN for blocked domains
                    rpz_content += f'{zone}    CNAME   .\n'
                    rpz_content += f'*.{zone}  CNAME   .\n'
                
                with open(rpz_file, 'w') as f:
                    f.write(rpz_content)
                
                # Add RPZ zone to named.conf.local if not exists
                rpz_zone_config = '''
// Response Policy Zone for blocking
zone "rpz.blocked" {
    type master;
    file "/etc/bind/zones/db.rpz.blocked";
    allow-query { none; };
};
'''
                if os.path.exists(self.config_file):
                    with open(self.config_file, 'r') as f:
                        local_content = f.read()
                    
                    if 'rpz.blocked' not in local_content:
                        with open(self.config_file, 'a') as f:
                            f.write(rpz_zone_config)
            else:
                # Remove RPZ if no blocked zones
                content = re.sub(r'\s*response-policy\s*{[^}]+};\s*', '', content)
                
                # Remove RPZ zone from named.conf.local
                if os.path.exists(self.config_file):
                    with open(self.config_file, 'r') as f:
                        local_content = f.read()
                    
                    local_content = re.sub(
                        r'// Response Policy Zone for blocking.*?zone "rpz\.blocked".*?};',
                        '',
                        local_content,
                        flags=re.DOTALL
                    )
                    
                    with open(self.config_file, 'w') as f:
                        f.write(local_content)
            
            # Handle conditional forwarders (zone forwarders)
            conditional_forwarders = new_config.get('conditional_forwarders', {})
            
            # Read current named.conf.local
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    local_content = f.read()
            else:
                local_content = ''
            
            # Remove old zone forwarder sections
            # Remove the Zone Forwarders comment and all subsequent zone forward blocks
            local_content = re.sub(
                r'// Zone Forwarders.*',
                '',
                local_content,
                flags=re.DOTALL
            )
            
            # Also remove any standalone zone forward blocks that might exist
            while True:
                old_content = local_content
                local_content = re.sub(
                    r'zone\s+"[^"]+"\s*\{\s*type\s+forward;.*?\};',
                    '',
                    local_content,
                    flags=re.DOTALL
                )
                if old_content == local_content:
                    break
            
            # Add new zone forwarders
            if conditional_forwarders:
                zone_forwarders_config = '\n// Zone Forwarders\n'
                for zone_name, servers in conditional_forwarders.items():
                    if servers:  # Only add if there are servers
                        servers_list = ';\n        '.join(servers) + ';'
                        zone_forwarders_config += f'''
zone "{zone_name}" {{
    type forward;
    forward only;
    forwarders {{
        {servers_list}
    }};
}};
'''
                
                # Append to named.conf.local
                local_content += zone_forwarders_config
            
            # Write updated named.conf.local
            with open(self.config_file, 'w') as f:
                f.write(local_content)
            
            # Write updated main config
            with open(main_config_file, 'w') as f:
                f.write(content)
            
            logger.info("Configuration updated successfully")
            
            # Reload BIND to apply changes
            self._reload_bind()
            
        except Exception as e:
            logger.error(f"Error updating configuration: {e}")
            raise


