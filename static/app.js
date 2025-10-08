// DNS Manager Frontend JavaScript
const API_BASE = window.location.origin;
let currentZone = null;
let isEditMode = false;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkHealth();
    loadZones();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('create-zone-form').addEventListener('submit', handleCreateZone);
    document.getElementById('record-form').addEventListener('submit', handleSaveRecord);
}

// Check server health
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();
        
        const indicator = document.getElementById('status-indicator');
        if (data.success) {
            indicator.innerHTML = `
                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                <span class="text-sm text-gray-300">BIND: ${data.bind_status}</span>
            `;
        } else {
            indicator.innerHTML = `
                <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                <span class="text-sm text-gray-300">Error</span>
            `;
        }
    } catch (error) {
        console.error('Health check failed:', error);
        const indicator = document.getElementById('status-indicator');
        indicator.innerHTML = `
            <div class="w-3 h-3 bg-red-500 rounded-full"></div>
            <span class="text-sm text-gray-300">Offline</span>
        `;
    }
}

// Load zones
async function loadZones() {
    try {
        const response = await fetch(`${API_BASE}/api/zones`);
        const data = await response.json();
        
        const zonesList = document.getElementById('zones-list');
        
        if (data.success && data.zones.length > 0) {
            zonesList.innerHTML = data.zones.map(zone => `
                <div class="group bg-gray-700 hover:bg-gray-600 rounded-lg p-4 cursor-pointer transition duration-200 border border-gray-600 hover:border-blue-500"
                     onclick="selectZone('${zone.name}')">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <h3 class="font-semibold text-white text-lg">${zone.name}</h3>
                            <p class="text-sm text-gray-400 mt-1">${zone.record_count} records</p>
                        </div>
                        <button onclick="deleteZone(event, '${zone.name}')" 
                                class="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-300 transition duration-200">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            zonesList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                    </svg>
                    <p>No zones yet. Create one to get started!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading zones:', error);
        showToast('Failed to load zones', 'error');
    }
}

// Select zone and load records
async function selectZone(zoneName) {
    currentZone = zoneName;
    document.getElementById('add-record-btn').disabled = false;
    
    try {
        const response = await fetch(`${API_BASE}/api/zones/${zoneName}/records`);
        const data = await response.json();
        
        const recordsContent = document.getElementById('records-content');
        
        if (data.success && data.records.length > 0) {
            recordsContent.innerHTML = `
                <div class="mb-4 px-4 py-2 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-500">
                    <p class="text-blue-300 text-sm">Viewing records for <span class="font-semibold">${zoneName}</span></p>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-gray-700">
                                <th class="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                                <th class="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                                <th class="text-left py-3 px-4 text-gray-400 font-medium">Value</th>
                                <th class="text-left py-3 px-4 text-gray-400 font-medium">TTL</th>
                                <th class="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-700">
                            ${data.records.map(record => `
                                <tr class="hover:bg-gray-700 transition duration-150">
                                    <td class="py-3 px-4 text-white font-mono">${record.name}</td>
                                    <td class="py-3 px-4">
                                        <span class="px-2 py-1 bg-blue-900 text-blue-300 rounded text-xs font-semibold">${record.type}</span>
                                    </td>
                                    <td class="py-3 px-4 text-gray-300 font-mono text-sm">${record.value}</td>
                                    <td class="py-3 px-4 text-gray-400 text-sm">${record.ttl}s</td>
                                    <td class="py-3 px-4 text-right">
                                        <button onclick="editRecord('${record.id}', '${record.name}', '${record.type}', '${escapeHtml(record.value)}', ${record.ttl})"
                                                class="text-blue-400 hover:text-blue-300 mr-3 transition duration-150">
                                            <svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                            </svg>
                                        </button>
                                        <button onclick="deleteRecord('${record.id}')"
                                                class="text-red-400 hover:text-red-300 transition duration-150">
                                            <svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            recordsContent.innerHTML = `
                <div class="mb-4 px-4 py-2 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-500">
                    <p class="text-blue-300 text-sm">Viewing records for <span class="font-semibold">${zoneName}</span></p>
                </div>
                <div class="text-center py-12 text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p>No records in this zone yet. Add one to get started!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading records:', error);
        showToast('Failed to load records', 'error');
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
        showToast('Please select a zone first', 'error');
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
            showToast(`Zone ${data.zone_name} created successfully`, 'success');
            hideCreateZoneModal();
            loadZones();
        } else {
            showToast(result.error || 'Failed to create zone', 'error');
        }
    } catch (error) {
        console.error('Error creating zone:', error);
        showToast('Failed to create zone', 'error');
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
            showToast(`Zone ${zoneName} deleted successfully`, 'success');
            if (currentZone === zoneName) {
                currentZone = null;
                document.getElementById('records-content').innerHTML = `
                    <div class="text-center py-16 text-gray-500">
                        <p class="text-lg">Select a zone to view and manage records</p>
                    </div>
                `;
            }
            loadZones();
        } else {
            showToast(result.error || 'Failed to delete zone', 'error');
        }
    } catch (error) {
        console.error('Error deleting zone:', error);
        showToast('Failed to delete zone', 'error');
    }
}

// Handle save record (create or update)
async function handleSaveRecord(e) {
    e.preventDefault();
    
    if (!currentZone) {
        showToast('Please select a zone first', 'error');
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
            showToast(result.message, 'success');
            hideRecordModal();
            selectZone(currentZone);
        } else {
            showToast(result.error || 'Failed to save record', 'error');
        }
    } catch (error) {
        console.error('Error saving record:', error);
        showToast('Failed to save record', 'error');
    }
}

// Edit record
function editRecord(id, name, type, value, ttl) {
    isEditMode = true;
    document.getElementById('record-modal-title').textContent = 'Edit DNS Record';
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
        showToast('No zone selected', 'error');
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
            showToast('Record deleted successfully', 'success');
            selectZone(currentZone);
        } else {
            showToast(result.error || 'Failed to delete record', 'error');
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        showToast('Failed to delete record', 'error');
    }
}

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    const messageEl = document.getElementById('toast-message');
    
    messageEl.textContent = message;
    
    // Remove existing classes
    toast.className = 'fixed bottom-6 right-6 px-6 py-4 rounded-lg shadow-2xl z-50 max-w-md';
    
    if (type === 'success') {
        toast.classList.add('bg-green-600', 'text-white');
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';
    } else if (type === 'error') {
        toast.classList.add('bg-red-600', 'text-white');
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';
    } else {
        toast.classList.add('bg-blue-600', 'text-white');
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
    }
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
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
