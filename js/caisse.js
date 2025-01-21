// Import required Electron modules
const { ipcRenderer } = require('electron');
const { v4: uuidv4 } = require('uuid');

// DOM Elements
const addNewBtn = document.getElementById('addNewBtn');
const closeFormBtn = document.getElementById('closeFormBtn');
const formSection = document.getElementById('formSection');
const formTitle = document.getElementById('formTitle');
const caisseForm = document.getElementById('caisseForm');
const caisseId = document.getElementById('caisseId');
const drenSelect = document.getElementById('drenSelect');
const ciscoSelect = document.getElementById('ciscoSelect');
const zapSelect = document.getElementById('zapSelect');
const etablissementSelect = document.getElementById('etablissementSelect');
const montantInput = document.getElementById('montantInput');
const resetButton = document.getElementById('resetButton');
const caisseTableBody = document.getElementById('caisseTableBody');
const searchInput = document.getElementById('searchInput');


// Show/Hide Form
addNewBtn.addEventListener('click', () => {
  formSection.classList.remove('hidden');
  formTitle.textContent = 'Nouvelle entrée';
  resetForm();
});

closeFormBtn.addEventListener('click', () => {
  formSection.classList.add('hidden');
  resetForm();
});

// Search functionality
searchInput.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const rows = caisseTableBody.getElementsByTagName('tr');
  
  Array.from(rows).forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
});

// Load initial data
document.addEventListener('DOMContentLoaded', () => {
  loadDrenOptions();
  loadCaisseData();
});

// Load DREN options
function loadDrenOptions() {
  ipcRenderer.send('read-dren');
}

// Load CISCO options based on selected DREN
function loadCiscoOptions(drenId) {
  ciscoSelect.innerHTML = '<option value="">Sélectionner CISCO</option>';
  zapSelect.innerHTML = '<option value="">Sélectionner ZAP</option>';
  etablissementSelect.innerHTML = '<option value="">Sélectionner Établissement</option>';
  
  if (drenId) {
    ipcRenderer.send('read-cisco');
  }
}

// Load ZAP options based on selected CISCO
function loadZapOptions(ciscoId) {
  zapSelect.innerHTML = '<option value="">Sélectionner ZAP</option>';
  etablissementSelect.innerHTML = '<option value="">Sélectionner Établissement</option>';
  
  if (ciscoId) {
    ipcRenderer.send('read-zap');
  }
}

// Load Etablissement options based on selected ZAP
function loadEtablissementOptions(zapId) {
  etablissementSelect.innerHTML = '<option value="">Sélectionner Établissement</option>';
  
  if (zapId) {
    ipcRenderer.send('read-etablissement');
  }
}

// Event Listeners for Select Changes
drenSelect.addEventListener('change', () => loadCiscoOptions(drenSelect.value));
ciscoSelect.addEventListener('change', () => loadZapOptions(ciscoSelect.value));
zapSelect.addEventListener('change', () => loadEtablissementOptions(zapSelect.value));

// IPC Response Handlers
ipcRenderer.on('read-dren-response', (_, response) => {
  if (response.success) {
    const drens = response.data.sort((a, b) => a.nom.localeCompare(b.nom));
    drens.forEach(dren => {
      const option = document.createElement('option');
      option.value = dren.id;
      option.textContent = dren.nom;
      drenSelect.appendChild(option);
    });
  }
});

ipcRenderer.on('read-cisco-response', (_, response) => {
  if (response.success) {
    const ciscos = response.data
      .filter(cisco => cisco.dren_id === drenSelect.value)
      .sort((a, b) => a.nom.localeCompare(b.nom));
    
    ciscos.forEach(cisco => {
      const option = document.createElement('option');
      option.value = cisco.id;
      option.textContent = cisco.nom;
      ciscoSelect.appendChild(option);
    });
  }
});

ipcRenderer.on('read-zap-response', (_, response) => {
  if (response.success) {
    const zaps = response.data
      .filter(zap => zap.cisco_id === ciscoSelect.value)
      .sort((a, b) => a.nom.localeCompare(b.nom));
    
    zaps.forEach(zap => {
      const option = document.createElement('option');
      option.value = zap.id;
      option.textContent = zap.nom;
      zapSelect.appendChild(option);
    });
  }
});

ipcRenderer.on('read-etablissement-response', (_, response) => {
  if (response.success) {
    const etablissements = response.data
      .filter(etab => etab.zap_id === zapSelect.value)
      .sort((a, b) => a.nom.localeCompare(b.nom));
    
    etablissements.forEach(etab => {
      const option = document.createElement('option');
      option.value = etab.id;
      option.textContent = etab.nom;
      etablissementSelect.appendChild(option);
    });
  }
});

// Form Submit Handler
caisseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const formData = {
    id: caisseId.value || uuidv4(),
    dren_id: drenSelect.value,
    cisco_id: ciscoSelect.value,
    zap_id: zapSelect.value,
    etablissement_id: etablissementSelect.value,
    montant_ariary: parseFloat(montantInput.value)
  };

  // Validate form data
  if (!formData.dren_id || !formData.cisco_id || !formData.zap_id || 
      !formData.etablissement_id || isNaN(formData.montant_ariary)) {
    alert('Veuillez remplir tous les champs correctement');
    return;
  }

  if (caisseId.value) {
    ipcRenderer.send('update-caisse', formData);
  } else {
    ipcRenderer.send('create-caisse', formData);
  }
});

// Reset Form
function resetForm() {
  caisseId.value = '';
  caisseForm.reset();
  ciscoSelect.innerHTML = '<option value="">Sélectionner CISCO</option>';
  zapSelect.innerHTML = '<option value="">Sélectionner ZAP</option>';
  etablissementSelect.innerHTML = '<option value="">Sélectionner Établissement</option>';
}

// Hide form after reset
formSection.classList.add('hidden');

resetButton.addEventListener('click', resetForm);

// Load and Display Caisse Data
function loadCaisseData() {
ipcRenderer.send('read-caisse');
}

ipcRenderer.on('read-caisse-response', (_, response) => {
if (response.success) {
  displayCaisseData(response.data);
} else {
  showNotification('Erreur lors du chargement des données', 'error');
}
});

function displayCaisseData(data) {
caisseTableBody.innerHTML = '';

data.forEach(item => {
  const row = document.createElement('tr');
  row.className = 'hover:bg-gray-50 transition-colors duration-150';
  row.innerHTML = `
    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.dren_nom}</td>
    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.cisco_nom}</td>
    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.zap_nom}</td>
    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.etablissement_nom}</td>
    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
      ${item.montant_ariary.toLocaleString('fr-FR')} Ar
    </td>
    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
      <button 
        class="text-green-600 hover:text-green-900 mr-3 transition-colors duration-150"
        onclick="editCaisse('${item.id}', ${JSON.stringify(item).replace(/"/g, '&quot;')})">
        <i class="fas fa-edit"></i>
      </button>
      <button 
        class="text-red-600 hover:text-red-900 transition-colors duration-150"
        onclick="deleteCaisse('${item.id}')">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;
  caisseTableBody.appendChild(row);
});
}

// Global function for editing caisse entry
window.editCaisse = function(id, itemData) {
formSection.classList.remove('hidden');
formTitle.textContent = 'Modifier l\'entrée';
caisseId.value = id;

// Set initial DREN value and load related data
drenSelect.value = itemData.dren_id;
loadCiscoOptions(itemData.dren_id);

// Set up a timeout to wait for options to load
setTimeout(() => {
  ciscoSelect.value = itemData.cisco_id;
  loadZapOptions(itemData.cisco_id);
  
  setTimeout(() => {
    zapSelect.value = itemData.zap_id;
    loadEtablissementOptions(itemData.zap_id);
    
    setTimeout(() => {
      etablissementSelect.value = itemData.etablissement_id;
      montantInput.value = itemData.montant_ariary;
    }, 100);
  }, 100);
}, 100);
};

// Global function for deleting caisse entry
window.deleteCaisse = function(id) {
const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?');
if (confirmDelete) {
  ipcRenderer.send('delete-caisse', id);
}
};

// Notification system
function showNotification(message, type = 'success') {
const notification = document.createElement('div');
notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
  type === 'success' ? 'bg-green-500' : 'bg-red-500'
} text-white max-w-md z-50 flex items-center`;

notification.innerHTML = `
  <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i>
  <span>${message}</span>
`;

document.body.appendChild(notification);

setTimeout(() => {
  notification.remove();
}, 3000);
}

// Handle Create/Update/Delete Responses
ipcRenderer.on('create-caisse-response', (_, response) => {
if (response.success) {
  showNotification('Entrée créée avec succès');
  resetForm();
  loadCaisseData();
} else {
  showNotification('Erreur lors de la création de l\'entrée', 'error');
}
});

ipcRenderer.on('update-caisse-response', (_, response) => {
if (response.success) {
  showNotification('Entrée mise à jour avec succès');
  resetForm();
  loadCaisseData();
} else {
  showNotification('Erreur lors de la mise à jour de l\'entrée', 'error');
}
});

ipcRenderer.on('delete-caisse-response', (_, response) => {
if (response.success) {
  showNotification('Entrée supprimée avec succès');
  loadCaisseData();
} else {
  showNotification('Erreur lors de la suppression de l\'entrée', 'error');
}
});

// Initial load
loadCaisseData();


searchInput.addEventListener('input', function(e) {
  const searchTerm = e.target.value.toLowerCase();

  // Filtrer les caisses
  ipcRenderer.send('read-caisse');
  ipcRenderer.once('read-caisse-response', (event, response) => {
      if (response.success) {
          const filteredCaisses = response.data.filter(caisse =>
              caisse.dren_id.toLowerCase().includes(searchTerm) ||
              caisse.cisco_id.toLowerCase().includes(searchTerm) ||
              caisse.zap_id.toLowerCase().includes(searchTerm) ||
              caisse.etablissement_id.toLowerCase().includes(searchTerm) ||
              caisse.montant_ariary.toString().includes(searchTerm)
          ).sort((a, b) => a.dren_id.localeCompare(b.dren_id));

          // Mettre à jour le tableau
          caisseTableBody.innerHTML = '';
          filteredCaisses.forEach(caisse => {
              caisseTableBody.innerHTML += `
                  <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${caisse.dren_id}</td>
                      <td class="px-6 py-4 text-sm text-gray-900">${caisse.cisco_id}</td>
                      <td class="px-6 py-4 text-sm text-gray-500">${caisse.zap_id}</td>
                      <td class="px-6 py-4 text-sm text-gray-500">${caisse.etablissement_id}</td>
                      <td class="px-6 py-4 text-sm text-gray-500">${caisse.montant_ariary}</td>
                      <td class="px-6 py-4 text-right text-sm font-medium space-x-2">
                          <button onclick="editCaisse('${caisse.id}')" class="text-blue-600 hover:text-blue-900">
                              <i class="fas fa-edit"></i>
                          </button>
                          <button onclick="deleteCaisse('${caisse.id}')" class="text-red-600 hover:text-red-900">
                              <i class="fas fa-trash"></i>
                          </button>
                      </td>
                  </tr>
              `;
          });
      }
  });
});
