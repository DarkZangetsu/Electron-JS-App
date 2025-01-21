 // Renderer process
 const { ipcRenderer } = require('electron');

// Tab switching
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active', 'border-green-600', 'text-green-600'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        
        button.classList.add('active', 'border-green-600', 'text-green-600');
        document.getElementById(`${button.dataset.tab}-content`).classList.remove('hidden');
        
        // Load data based on the selected tab
        switch(button.dataset.tab) {
            case 'dren':
                loadDrenData();
                break;
            case 'cisco':
                loadCiscoData();
                break;
            case 'zap':
                loadZapData();
                break;
        }
    });
});

// Initial load
loadDrenData(); 

 // DREN Functions
 function loadDrenData() {
     ipcRenderer.send('read-dren');
 }

 window.openDrenModal = function(dren = null) {
    document.getElementById('dren-modal').classList.remove('hidden');
    document.getElementById('dren-modal-title').textContent = dren ? 'Modifier DREN' : 'Ajouter DREN';
    
    if (dren) {
        document.getElementById('dren-form-input-id').value = dren.id;
        document.getElementById('dren-form-nom').value = dren.nom;
        document.getElementById('dren-form-input-id').readOnly = true;
    } else {
        document.getElementById('dren-form').reset();
        document.getElementById('dren-form-input-id').readOnly = false;
    }
};

window.closeDrenModal = function() {
    document.getElementById('dren-modal').classList.add('hidden');
};

window.deleteDren = function(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce DREN ?')) {
        ipcRenderer.send('delete-dren', id);
    }
};

 document.getElementById('dren-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('dren-form-input-id').value;
    const nom = document.getElementById('dren-form-nom').value;
    
    if (document.getElementById('dren-form-input-id').readOnly) {
        // Update
        ipcRenderer.send('update-dren', { id, nom });
    } else {
        // Create
        ipcRenderer.send('create-dren', { id, nom });
    }
});


// CISCO Functions
function loadCiscoData() {
    ipcRenderer.send('read-cisco');
    // Load DREN options for select
    ipcRenderer.send('read-dren');
}

window.openCiscoModal = function(cisco = null) {
    document.getElementById('cisco-modal').classList.remove('hidden');
    document.getElementById('cisco-modal-title').textContent = cisco ? 'Modifier CISCO' : 'Ajouter CISCO';
    
    if (cisco) {
        document.getElementById('cisco-form-input-id').value = cisco.id;
        document.getElementById('cisco-form-dren').value = cisco.dren_id;
        document.getElementById('cisco-form-nom').value = cisco.nom;
        document.getElementById('cisco-form-input-id').readOnly = true;
    } else {
        document.getElementById('cisco-form').reset();
        document.getElementById('cisco-form-input-id').readOnly = false;
    }
};

window.closeCiscoModal = function() {
    document.getElementById('cisco-modal').classList.add('hidden');
};

window.deleteCisco = function(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce CISCO ?')) {
        ipcRenderer.send('delete-cisco', id);
    }
};

document.getElementById('cisco-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('cisco-form-input-id').value;
    const dren_id = document.getElementById('cisco-form-dren').value;
    const nom = document.getElementById('cisco-form-nom').value;
    
    if (document.getElementById('cisco-form-input-id').readOnly) {
        // Update
        ipcRenderer.send('update-cisco', { id, dren_id, nom });
    } else {
        // Create
        ipcRenderer.send('create-cisco', { id, dren_id, nom });
    }
});


// ZAP Functions
function loadZapData() {
    ipcRenderer.send('read-zap');
    // Load CISCO options for select
    ipcRenderer.send('read-cisco');
}

window.openZapModal = function(zap = null) {
    document.getElementById('zap-modal').classList.remove('hidden');
    document.getElementById('zap-modal-title').textContent = zap ? 'Modifier ZAP' : 'Ajouter ZAP';
    
    if (zap) {
        document.getElementById('zap-form-input-id').value = zap.id;
        document.getElementById('zap-form-cisco').value = zap.cisco_id;
        document.getElementById('zap-form-nom').value = zap.nom;
        document.getElementById('zap-form-input-id').readOnly = true;
    } else {
        document.getElementById('zap-form').reset();
        document.getElementById('zap-form-input-id').readOnly = false;
    }
};

window.closeZapModal = function() {
    document.getElementById('zap-modal').classList.add('hidden');
};

window.deleteZap = function(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce ZAP ?')) {
        ipcRenderer.send('delete-zap', id);
    }
};

document.getElementById('zap-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('zap-form-input-id').value;
    const cisco_id = document.getElementById('zap-form-cisco').value;
    const nom = document.getElementById('zap-form-nom').value;
    
    if (document.getElementById('zap-form-input-id').readOnly) {
        // Update
        ipcRenderer.send('update-zap', { id, cisco_id, nom });
    } else {
        // Create
        ipcRenderer.send('create-zap', { id, cisco_id, nom });
    }
});


// IPC Response Handlers
// DREN Responses
ipcRenderer.on('create-dren-response', (event, response) => {
    if (response.success) {
        closeDrenModal();
        loadDrenData();
    } else {
        alert('Erreur lors de la création du DREN: ' + response.error);
    }
});

ipcRenderer.on('read-dren-response', (event, response) => {
    if (response.success) {
        const drenTable = document.getElementById('dren-table');
        drenTable.innerHTML = '';
        response.data.forEach(dren => {
            drenTable.innerHTML += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dren.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${dren.nom}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick='openDrenModal(${JSON.stringify(dren).replace(/'/g, "&#39;")})' class="text-green-600 hover:text-green-900 mr-3">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteDren('${dren.id}')" class="text-red-600 hover:text-red-900">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        // Mise à jour des options du select DREN pour le formulaire CISCO
        const drenSelect = document.getElementById('cisco-form-dren');
        drenSelect.innerHTML = '<option value="">Sélectionner un DREN</option>';
        response.data.forEach(dren => {
            drenSelect.innerHTML += `<option value="${dren.id}">${dren.nom}</option>`;
        });
    }
});

ipcRenderer.on('update-dren-response', (event, response) => {
    if (response.success) {
        closeDrenModal();
        loadDrenData();
    } else {
        alert('Erreur lors de la mise à jour du DREN: ' + response.error);
    }
});

ipcRenderer.on('delete-dren-response', (event, response) => {
    if (response.success) {
        loadDrenData();
    } else {
        alert('Erreur lors de la suppression du DREN: ' + response.error);
    }
});

// CISCO Responses
ipcRenderer.on('create-cisco-response', (event, response) => {
    if (response.success) {
        closeCiscoModal();
        loadCiscoData();
    } else {
        alert('Erreur lors de la création du CISCO: ' + response.error);
    }
});

ipcRenderer.on('read-cisco-response', (event, response) => {
    if (response.success) {
        const ciscoTable = document.getElementById('cisco-table');
        ciscoTable.innerHTML = '';
        response.data.forEach(cisco => {
            ciscoTable.innerHTML += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${cisco.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${cisco.dren_nom}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${cisco.nom}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick='openCiscoModal(${JSON.stringify(cisco).replace(/'/g, "&#39;")})' class="text-green-600 hover:text-green-900 mr-3">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteCisco('${cisco.id}')" class="text-red-600 hover:text-red-900">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        // Mise à jour des options du select CISCO pour le formulaire ZAP
        const ciscoSelect = document.getElementById('zap-form-cisco');
        ciscoSelect.innerHTML = '<option value="">Sélectionner un CISCO</option>';
        response.data.forEach(cisco => {
            ciscoSelect.innerHTML += `<option value="${cisco.id}">${cisco.nom}</option>`;
        });
    }
});

ipcRenderer.on('update-cisco-response', (event, response) => {
    if (response.success) {
        closeCiscoModal();
        loadCiscoData();
    } else {
        alert('Erreur lors de la mise à jour du CISCO: ' + response.error);
    }
});

ipcRenderer.on('delete-cisco-response', (event, response) => {
    if (response.success) {
        loadCiscoData();
    } else {
        alert('Erreur lors de la suppression du CISCO: ' + response.error);
    }
});

// ZAP Responses
ipcRenderer.on('create-zap-response', (event, response) => {
    if (response.success) {
        closeZapModal();
        loadZapData();
    } else {
        alert('Erreur lors de la création du ZAP: ' + response.error);
    }
});

ipcRenderer.on('read-zap-response', (event, response) => {
    if (response.success) {
        const zapTable = document.getElementById('zap-table');
        zapTable.innerHTML = '';
        response.data.forEach(zap => {
            zapTable.innerHTML += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${zap.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${zap.cisco_nom}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${zap.nom}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick='openZapModal(${JSON.stringify(zap).replace(/'/g, "&#39;")})' class="text-green-600 hover:text-green-900 mr-3">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteZap('${zap.id}')" class="text-red-600 hover:text-red-900">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }
});

ipcRenderer.on('update-zap-response', (event, response) => {
    if (response.success) {
        closeZapModal();
        loadZapData();
    } else {
        alert('Erreur lors de la mise à jour du ZAP: ' + response.error);
    }
});

ipcRenderer.on('delete-zap-response', (event, response) => {
    if (response.success) {
        loadZapData();
    } else {
        alert('Erreur lors de la suppression du ZAP: ' + response.error);
    }
});

// Initial load
loadDrenData();