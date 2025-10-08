// DNS Manager Frontend JavaScript
const API_BASE = window.location.origin;
let currentZone = null;
let isEditMode = false;
let allRecords = [];
let allZones = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadZones();
    setupEventListeners();
    setupFiltering();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('create-zone-form').addEventListener('submit', handleCreateZone);
    document.getElementById('record-form').addEventListener('submit', handleSaveRecord);
}

// Setup filtering
function setupFiltering() {
    const searchInput = document.getElementById('search-input');
    const zoneSelect = document.getElementById('zone-select');
    const typeCheckboxes = document.querySelectorAll('.type-filter-checkbox');

    searchInput.addEventListener('input', filterRecords);
    typeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateTypeFilterLabel();
            filterRecords();
        });
    });
    zoneSelect.addEventListener('change', (e) => {
        currentZone = e.target.value;
        if (currentZone) {
            selectZone(currentZone);
            updateZonesStatus();
        }
    });
}

// Toggle type filter dropdown
function toggleTypeFilter() {
    const dropdown = document.getElementById('type-filter-dropdown');
    dropdown.classList.toggle('hidden');
}

// Close type filter dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('type-filter-dropdown');
    const button = document.getElementById('type-filter-btn');
    if (dropdown && button && !dropdown.contains(e.target) && !button.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// Update type filter label
function updateTypeFilterLabel() {
    const checkboxes = document.querySelectorAll('.type-filter-checkbox:checked');
    const label = document.getElementById('type-filter-label');
    
    if (checkboxes.length === 0) {
        label.textContent = 'All Types';
    } else if (checkboxes.length === 1) {
        label.textContent = checkboxes[0].value;
    } else {
        label.textContent = `${checkboxes.length} types selected`;
    }
}

// Filter records based on search and type
function filterRecords() {
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    const selectedTypes = Array.from(document.querySelectorAll('.type-filter-checkbox:checked')).map(cb => cb.value);

    const filtered = allRecords.filter(record => {
        const matchesSearch = !searchQuery || 
            record.name.toLowerCase().includes(searchQuery) ||
            record.type.toLowerCase().includes(searchQuery) ||
            record.value.toLowerCase().includes(searchQuery) ||
            String(record.ttl).includes(searchQuery);
        
        const matchesType = selectedTypes.length === 0 || selectedTypes.includes(record.type);
        
        return matchesSearch && matchesType;
    });

    renderRecordsTable(filtered);
}

// Load zones
async function loadZones() {
    try {
        const response = await fetch(`${API_BASE}/api/zones`);
        const data = await response.json();
        
        const zonesList = document.getElementById('zones-list');
        const zonesCount = document.getElementById('zones-count');
        const zoneSelect = document.getElementById('zone-select');
        
        if (data.success && data.zones.length > 0) {
            allZones = data.zones;
            zonesCount.textContent = data.zones.length;
            
            // Update zones grid
            zonesList.innerHTML = data.zones.map(zone => `
                <div onclick="selectZoneFromCard('${zone.name}')" class="group cursor-pointer rounded-2xl border border-zinc-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 p-4 transition-all hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <h3 class="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">${zone.name}</h3>
                            <p class="text-xs text-zinc-500 dark:text-slate-300">${zone.record_count} records</p>
                        </div>
                        <button onclick="deleteZone(event, '${zone.name}')" 
                                class="opacity-0 group-hover:opacity-100 p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');

            // Update zone selector
            zoneSelect.innerHTML = '<option value="">Select a zone...</option>' + 
                data.zones.map(zone => `<option value="${zone.name}">${zone.name}</option>`).join('');
        } else {
            zonesCount.textContent = '0';
            zonesList.innerHTML = `
                <div class="col-span-full text-center py-8 text-zinc-500 dark:text-zinc-400">
                    <svg class="w-16 h-16 mx-auto mb-4 opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>
                    </svg>
                    <p>No zones yet. Create one to get started!</p>
                </div>
            `;
            zoneSelect.innerHTML = '<option value="">No zones available</option>';
        }
    } catch (error) {
        console.error('Error loading zones:', error);
        showFlash('Failed to load zones', 'error');
    }
}

// Select zone from card click
function selectZoneFromCard(zoneName) {
    document.getElementById('zone-select').value = zoneName;
    currentZone = zoneName;
    selectZone(zoneName);
    updateZonesStatus();
}

// Select zone and load records
async function selectZone(zoneName) {
    currentZone = zoneName;
    document.getElementById('add-record-btn').disabled = false;
    document.getElementById('record-modal-zone').textContent = zoneName;
    document.getElementById('record-footer-zone').textContent = zoneName;
    updateZonesStatus();
    
    try {
        const response = await fetch(`${API_BASE}/api/zones/${zoneName}/records`);
        const data = await response.json();
        
        if (data.success) {
            allRecords = data.records;
            filterRecords(); // This will render the filtered results
        } else {
            allRecords = [];
            renderRecordsTable([]);
        }
    } catch (error) {
        console.error('Error loading records:', error);
        showFlash('Failed to load records', 'error');
    }
}

// Render records table
function renderRecordsTable(records) {
    const recordsContent = document.getElementById('records-content');
    const recordsCount = document.getElementById('records-count');
    
    recordsCount.textContent = `${records.length} shown`;
    
    if (records.length > 0) {
        recordsContent.innerHTML = `
            <table class="min-w-full divide-y divide-zinc-200 dark:divide-slate-700 text-sm">
                <thead class="bg-slate-50 dark:bg-slate-800/40">
                    <tr>
                        <th class="px-4 py-3 text-left font-medium text-zinc-600 dark:text-slate-300">Name</th>
                        <th class="px-4 py-3 text-left font-medium text-zinc-600 dark:text-slate-300">Type</th>
                        <th class="px-4 py-3 text-left font-medium text-zinc-600 dark:text-slate-300">Value</th>
                        <th class="px-4 py-3 text-left font-medium text-zinc-600 dark:text-slate-300">TTL</th>
                        <th class="px-4 py-3 text-right font-medium text-zinc-600 dark:text-slate-300">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100 dark:divide-slate-700/60">
                    ${records.map(record => `
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                            <td class="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">${record.name}</td>
                            <td class="px-4 py-3">
                                <span class="inline-flex items-center rounded-full border border-zinc-200 dark:border-slate-600 bg-zinc-50 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-200">
                                    ${record.type}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-zinc-700 dark:text-zinc-300 font-mono text-sm">${escapeHtml(record.value)}</td>
                            <td class="px-4 py-3 text-zinc-600 dark:text-slate-300">${record.ttl}s</td>
                            <td class="px-4 py-3">
                                <div class="flex justify-end gap-2">
                                    <button onclick="editRecord('${record.id}', '${record.name}', '${record.type}', '${escapeHtml(record.value)}', ${record.ttl})"
                                            class="inline-flex items-center gap-1 rounded-xl border border-zinc-300 dark:border-slate-600 px-2.5 py-1.5 text-xs transition-colors hover:bg-zinc-50 dark:hover:bg-slate-700/50"
                                            title="Edit">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                    </button>
                    <button onclick="deleteRecord('${record.id}')"
                        class="inline-flex items-center gap-1 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2.5 py-1.5 text-xs transition-colors hover:bg-red-100 dark:hover:bg-red-800/40"
                                            title="Delete">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else if (currentZone) {
        recordsContent.innerHTML = `
            <div class="px-4 py-12 text-center text-zinc-500 dark:text-zinc-400">
                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p>No records match your filter.</p>
            </div>
        `;
    } else {
        recordsContent.innerHTML = `
            <div class="px-4 py-16 text-center text-zinc-500 dark:text-zinc-400">
                <svg class="w-20 h-20 mx-auto mb-4 opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p class="text-lg">Select a zone to view and manage records</p>
            </div>
        `;
    }
}

// Modal functions
function showCreateZoneModal() {
    document.getElementById('create-zone-modal').classList.remove('hidden');
}

function hideCreateZoneModal() {
    document.getElementById('create-zone-modal').classList.add('hidden');
    document.getElementById('create-zone-form').reset();
}

function showCreateRecordModal() {
    if (!currentZone) {
        showFlash('Please select a zone first', 'error');
        return;
    }
    isEditMode = false;
    document.getElementById('record-modal-title').textContent = 'Add DNS Record';
    document.getElementById('record-form').reset();
    document.getElementById('record-id').value = '';
    document.getElementById('record-modal').classList.remove('hidden');
}

function hideRecordModal() {
    document.getElementById('record-modal').classList.add('hidden');
    document.getElementById('record-form').reset();
}

// Handle create zone
async function handleCreateZone(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        zone_name: formData.get('zone_name'),
        admin_email: formData.get('admin_email'),
        ttl: parseInt(formData.get('ttl'))
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/zones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showFlash(`Zone ${data.zone_name} created successfully`, 'success');
            hideCreateZoneModal();
            loadZones();
        } else {
            showFlash(result.error || 'Failed to create zone', 'error');
        }
    } catch (error) {
        console.error('Error creating zone:', error);
        showFlash('Failed to create zone', 'error');
    }
}

// Delete zone
async function deleteZone(event, zoneName) {
    event.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete zone "${zoneName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/zones/${zoneName}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showFlash(`Zone ${zoneName} deleted successfully`, 'success');
            if (currentZone === zoneName) {
                currentZone = null;
                allRecords = [];
                renderRecordsTable([]);
                document.getElementById('zone-select').value = '';
                document.getElementById('add-record-btn').disabled = true;
            }
            loadZones();
        } else {
            showFlash(result.error || 'Failed to delete zone', 'error');
        }
    } catch (error) {
        console.error('Error deleting zone:', error);
        showFlash('Failed to delete zone', 'error');
    }
}

// Handle save record (create or update)
async function handleSaveRecord(e) {
    e.preventDefault();
    
    if (!currentZone) {
        showFlash('Please select a zone first', 'error');
        return;
    }
    
    const formData = new FormData(e.target);
    const recordId = formData.get('record_id');
    const data = {
        name: formData.get('name'),
        type: formData.get('type'),
        value: formData.get('value'),
        ttl: parseInt(formData.get('ttl'))
    };
    
    try {
        let response;
        if (isEditMode && recordId) {
            // Update existing record
            response = await fetch(`${API_BASE}/api/zones/${currentZone}/records/${recordId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Create new record
            response = await fetch(`${API_BASE}/api/zones/${currentZone}/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            showFlash(result.message, 'success');
            hideRecordModal();
            selectZone(currentZone);
            loadZones(); // Update zone record counts
        } else {
            showFlash(result.error || 'Failed to save record', 'error');
        }
    } catch (error) {
        console.error('Error saving record:', error);
        showFlash('Failed to save record', 'error');
    }
}

// Edit record
function editRecord(id, name, type, value, ttl) {
    isEditMode = true;
    document.getElementById('record-modal-title').textContent = `Edit DNS Record`;
    document.getElementById('record-id').value = id;
    document.getElementById('record-name').value = name;
    document.getElementById('record-type').value = type;
    document.getElementById('record-value').value = value;
    document.getElementById('record-ttl').value = ttl;
    document.getElementById('record-modal').classList.remove('hidden');
}

// Delete record
async function deleteRecord(recordId) {
    if (!currentZone) {
        showFlash('No zone selected', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this record?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/zones/${currentZone}/records/${recordId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showFlash('Record deleted successfully', 'success');
            selectZone(currentZone);
            loadZones(); // Update zone record counts
        } else {
            showFlash(result.error || 'Failed to delete record', 'error');
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        showFlash('Failed to delete record', 'error');
    }
}

// Flash message
function showFlash(message, type = 'info') {
    const container = document.getElementById('flash-container');
    
    const colors = {
        success: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200',
        error: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200',
        info: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-200'
    };
    
    const flash = document.createElement('div');
    flash.className = `rounded-2xl border p-3 text-sm mb-2 fade-in ${colors[type] || colors.info}`;
    flash.textContent = message;
    
    container.appendChild(flash);
    
    setTimeout(() => {
        flash.style.opacity = '0';
        flash.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => flash.remove(), 300);
    }, 4000);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Zones section toggle
function toggleZonesSection() {
    const zonesContent = document.getElementById('zones-content');
    const zonesToggleIcon = document.getElementById('zones-toggle-icon');
    const isCollapsed = zonesContent.classList.contains('hidden');
    
    if (isCollapsed) {
        zonesContent.classList.remove('hidden');
        zonesToggleIcon.style.transform = 'rotate(0deg)';
        localStorage.setItem('zones-collapsed', 'false');
    } else {
        zonesContent.classList.add('hidden');
        zonesToggleIcon.style.transform = 'rotate(-90deg)';
        localStorage.setItem('zones-collapsed', 'true');
    }
}

// Update zones status when collapsed
function updateZonesStatus() {
    const zonesStatus = document.getElementById('zones-status');
    if (currentZone) {
        zonesStatus.textContent = currentZone;
    } else {
        zonesStatus.textContent = 'No zone selected';
    }
}

// Initialize zones collapsed state
document.addEventListener('DOMContentLoaded', () => {
    const isCollapsed = localStorage.getItem('zones-collapsed') === 'true';
    if (isCollapsed) {
        const zonesContent = document.getElementById('zones-content');
        const zonesToggleIcon = document.getElementById('zones-toggle-icon');
        zonesContent.classList.add('hidden');
        zonesToggleIcon.style.transform = 'rotate(-90deg)';
    }
    updateZonesStatus();
});

// Configuration Modal Functions
function showConfigModal() {
    // Hide success message when opening modal
    const successMessage = document.getElementById('save-success-message');
    if (successMessage) {
        successMessage.classList.add('hidden');
    }
    
    document.getElementById('config-modal').classList.remove('hidden');
    loadConfiguration();
}

function hideConfigModal() {
    // Hide success message when closing modal
    const successMessage = document.getElementById('save-success-message');
    if (successMessage) {
        successMessage.classList.add('hidden');
    }
    
    document.getElementById('config-modal').classList.add('hidden');
}

async function loadConfiguration() {
    try {
        const response = await fetch(`${API_BASE}/api/config`);
        if (!response.ok) {
            // If endpoint doesn't exist yet, set defaults
            setDefaultConfiguration();
            return;
        }
        const config = await response.json();
        
        // Set recursion toggle
        document.getElementById('recursion-toggle').checked = config.recursion || false;
        
        // Load forwarders
        forwarders = config.forwarders || [];
        renderForwarders(forwarders);
        
        // Load conditional forwarders
        conditionalForwarders = config.conditional_forwarders || {};
        renderConditionalForwarders(conditionalForwarders);
        
        // Set caching
        document.getElementById('caching-toggle').checked = config.caching !== false;
        document.getElementById('cache-size').value = config.cache_size || 100;
        document.getElementById('cache-ttl').value = config.max_cache_ttl || 86400;
        
        // Load blocked zones
        blockedZones = config.blocked_zones || [];
        renderBlockedZones(blockedZones);
    } catch (error) {
        console.error('Error loading configuration:', error);
        setDefaultConfiguration();
    }
}

function setDefaultConfiguration() {
    document.getElementById('recursion-toggle').checked = false;
    document.getElementById('caching-toggle').checked = true;
    document.getElementById('cache-size').value = 100;
    document.getElementById('cache-ttl').value = 86400;
    forwarders = [];
    conditionalForwarders = {};
    blockedZones = [];
    renderForwarders([]);
    renderConditionalForwarders({});
    renderBlockedZones([]);
}

function renderForwarders(forwarders) {
    const list = document.getElementById('forwarders-list');
    list.innerHTML = '';
    
    forwarders.forEach((forwarder, index) => {
        const item = document.createElement('div');
        item.className = 'flex items-center gap-2';
        item.innerHTML = `
            <input type="text" value="${escapeHtml(forwarder)}" 
                class="h-9 flex-1 rounded-xl border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:text-zinc-100"
                onchange="updateForwarder(${index}, this.value)">
            <button onclick="removeForwarder(${index})" class="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-zinc-300 dark:border-zinc-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
            </button>
        `;
        list.appendChild(item);
    });
}

let forwarders = [];

function addForwarder() {
    const newForwarder = '8.8.8.8';
    forwarders.push(newForwarder);
    renderForwarders(forwarders);
    // Auto-enable recursion when forwarders are added
    document.getElementById('recursion-toggle').checked = true;
}

function updateForwarder(index, value) {
    forwarders[index] = value;
}

function removeForwarder(index) {
    forwarders.splice(index, 1);
    renderForwarders(forwarders);
    // Disable recursion if no forwarders left
    if (forwarders.length === 0) {
        document.getElementById('recursion-toggle').checked = false;
    }
}

function renderConditionalForwarders(conditionalForwarders) {
    const list = document.getElementById('conditional-forwarders-list');
    list.innerHTML = '';
    
    Object.entries(conditionalForwarders).forEach(([domain, servers], index) => {
        const item = document.createElement('div');
        item.className = 'grid grid-cols-2 gap-2';
        item.innerHTML = `
            <input type="text" value="${escapeHtml(domain)}" placeholder="Domain"
                class="h-9 rounded-xl border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:text-zinc-100"
                onchange="updateConditionalForwarderDomain('${escapeHtml(domain)}', this.value)">
            <div class="flex items-center gap-2">
                <input type="text" value="${escapeHtml(servers.join(', '))}" placeholder="Servers (comma separated)"
                    class="h-9 flex-1 rounded-xl border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:text-zinc-100"
                    onchange="updateConditionalForwarderServers('${escapeHtml(domain)}', this.value)">
                <button onclick="removeConditionalForwarder('${escapeHtml(domain)}')" class="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-zinc-300 dark:border-zinc-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

let conditionalForwarders = {};

function addConditionalForwarder() {
    const domain = 'example.local';
    conditionalForwarders[domain] = ['10.0.0.1'];
    renderConditionalForwarders(conditionalForwarders);
}

function updateConditionalForwarderDomain(oldDomain, newDomain) {
    if (oldDomain !== newDomain && conditionalForwarders[oldDomain]) {
        conditionalForwarders[newDomain] = conditionalForwarders[oldDomain];
        delete conditionalForwarders[oldDomain];
    }
}

function updateConditionalForwarderServers(domain, value) {
    conditionalForwarders[domain] = value.split(',').map(s => s.trim()).filter(s => s);
}

function removeConditionalForwarder(domain) {
    delete conditionalForwarders[domain];
    renderConditionalForwarders(conditionalForwarders);
}

function renderBlockedZones(blockedZones) {
    const list = document.getElementById('blocked-zones-list');
    list.innerHTML = '';
    
    blockedZones.forEach((zone, index) => {
        const item = document.createElement('div');
        item.className = 'flex items-center gap-2';
        item.innerHTML = `
            <input type="text" value="${escapeHtml(zone)}" placeholder="Domain to block"
                class="h-9 flex-1 rounded-xl border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:text-zinc-100"
                onchange="updateBlockedZone(${index}, this.value)">
            <button onclick="removeBlockedZone(${index})" class="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-zinc-300 dark:border-zinc-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
            </button>
        `;
        list.appendChild(item);
    });
}

let blockedZones = [];

function addBlockedZone() {
    const newZone = 'ads.example.com';
    blockedZones.push(newZone);
    renderBlockedZones(blockedZones);
}

function updateBlockedZone(index, value) {
    blockedZones[index] = value;
}

function removeBlockedZone(index) {
    blockedZones.splice(index, 1);
    renderBlockedZones(blockedZones);
}

async function saveConfiguration() {
    const saveBtn = document.getElementById('save-config-btn');
    const spinner = document.getElementById('save-config-spinner');
    const saveText = document.getElementById('save-config-text');
    const successMessage = document.getElementById('save-success-message');
    
    // Hide success message if visible
    successMessage.classList.add('hidden');
    
    // Disable button and show loading
    saveBtn.disabled = true;
    spinner.classList.remove('hidden');
    
    const config = {
        recursion: document.getElementById('recursion-toggle').checked,
        forwarders: forwarders.filter(f => f.trim()),
        conditional_forwarders: conditionalForwarders,
        caching: document.getElementById('caching-toggle').checked,
        cache_size: parseInt(document.getElementById('cache-size').value),
        max_cache_ttl: parseInt(document.getElementById('cache-ttl').value),
        blocked_zones: blockedZones.filter(z => z.trim())
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        if (response.ok) {
            // Show success message next to button
            successMessage.classList.remove('hidden');
            showFlashMessage('✓ Configuration saved successfully. BIND restarted.', 'success');
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                successMessage.classList.add('hidden');
            }, 5000);
        } else {
            const error = await response.json();
            showFlashMessage('✗ Failed to save: ' + (error.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error saving configuration:', error);
        showFlashMessage('✗ Error saving configuration: ' + error.message, 'error');
    } finally {
        // Re-enable button
        saveBtn.disabled = false;
        spinner.classList.add('hidden');
    }
}

