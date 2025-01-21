const { ipcRenderer } = require('electron');
const XLSX = require('xlsx');
ipcRenderer.setMaxListeners(20);

// DOM Elements
const addRapportBtn = document.getElementById('addRapport');
const rapportModal = document.getElementById('rapportModal');
const closeModal = document.getElementById('closeModal');
const rapportForm = document.getElementById('rapportForm');
const cancelButton = document.getElementById('cancelButton');
const exportExcelBtn = document.getElementById('exportExcel');

// Selectors
const drenSelect = document.getElementById('dren_id');
const ciscoSelect = document.getElementById('cisco_id');
const zapSelect = document.getElementById('zap_id');
const etablissementSelect = document.getElementById('etablissement_id');

// Form fields for calculations
const prixUnitaireInput = document.getElementById('prix_unitaire');
const quantiteInput = document.getElementById('quantite');
const totalInput = document.getElementById('total');

const searchInput = document.getElementById('searchInput');


// Store rapports data globally
let rapportsData = [];

// Load initial data
document.addEventListener('DOMContentLoaded', () => {
  loadDrenOptions();
  loadRapports();
});

// Event Listeners
addRapportBtn.addEventListener('click', () => {
  rapportModal.classList.remove('hidden');
  rapportForm.reset();
  document.getElementById('rapportId').value = '';
  document.getElementById('modalTitle').textContent = 'Nouveau Rapport';

  ciscoSelect.innerHTML = '<option value="">Sélectionner...</option>';
  zapSelect.innerHTML = '<option value="">Sélectionner...</option>';
  etablissementSelect.innerHTML = '<option value="">Sélectionner...</option>';
});

closeModal.addEventListener('click', closeModalHandler);
cancelButton.addEventListener('click', closeModalHandler);

// Calculate total when prix_unitaire or quantite changes
prixUnitaireInput.addEventListener('input', calculateTotal);
quantiteInput.addEventListener('input', calculateTotal);

// Cascading dropdowns
drenSelect.addEventListener('change', async () => {
  await loadCiscoOptions(drenSelect.value);
  ciscoSelect.value = '';
  zapSelect.value = '';
  etablissementSelect.value = '';

  zapSelect.innerHTML = '<option value="">Sélectionner...</option>';
  etablissementSelect.innerHTML = '<option value="">Sélectionner...</option>';
});

ciscoSelect.addEventListener('change', async () => {
  await loadZapOptions(ciscoSelect.value);
  zapSelect.value = '';
  etablissementSelect.value = '';

  etablissementSelect.innerHTML = '<option value="">Sélectionner...</option>';
});

zapSelect.addEventListener('change', async () => {
  await loadEtablissementOptions(zapSelect.value);
  etablissementSelect.value = '';
});

// Form submission
rapportForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = {
    id: document.getElementById('rapportId').value || Date.now().toString(),
    dren_id: drenSelect.value,
    cisco_id: ciscoSelect.value,
    zap_id: zapSelect.value,
    etablissement_id: etablissementSelect.value,
    date: document.getElementById('date').value,
    situation: document.getElementById('situation').value,
    activites: document.getElementById('activites').value,
    fonction: document.getElementById('fonction').value,
    prix_unitaire: parseFloat(prixUnitaireInput.value),
    quantite: parseInt(quantiteInput.value),
    total: parseFloat(totalInput.value),
    source_financement: document.getElementById('source_financement').value,
    executeur: document.getElementById('executeur').value,
    superviseur: document.getElementById('superviseur').value
  };

  if (!document.getElementById('rapportId').value) {
    ipcRenderer.send('create-rapport', formData);
  } else {
    ipcRenderer.send('update-rapport', formData);
  }
});

// Load data functions
async function loadDrenOptions() {
  return new Promise((resolve) => {
    ipcRenderer.send('read-dren');
    ipcRenderer.once('read-dren-response', (_, response) => {
      if (response.success) {
        populateSelect(drenSelect, response.data.sort((a, b) => a.nom.localeCompare(b.nom)));
      }
      resolve(response);
    });
  });
}

async function loadCiscoOptions(drenId) {
  return new Promise((resolve) => {
    if (drenId) {
      ipcRenderer.send('read-cisco');
      ipcRenderer.once('read-cisco-response', (_, response) => {
        if (response.success) {
          const filteredData = response.data
            .filter(cisco => cisco.dren_id === drenId)
            .sort((a, b) => a.nom.localeCompare(b.nom));
          populateSelect(ciscoSelect, filteredData);
        }
        resolve(response);
      });
    } else {
      resolve({ success: false });
    }
  });
}

async function loadZapOptions(ciscoId) {
  return new Promise((resolve) => {
    if (ciscoId) {
      ipcRenderer.send('read-zap');
      ipcRenderer.once('read-zap-response', (_, response) => {
        if (response.success) {
          const filteredData = response.data
            .filter(zap => zap.cisco_id === ciscoId)
            .sort((a, b) => a.nom.localeCompare(b.nom));
          populateSelect(zapSelect, filteredData);
        }
        resolve(response);
      });
    } else {
      resolve({ success: false });
    }
  });
}

async function loadEtablissementOptions(zapId) {
  return new Promise((resolve) => {
    if (zapId) {
      ipcRenderer.send('read-etablissement');
      ipcRenderer.once('read-etablissement-response', (_, response) => {
        if (response.success) {
          const filteredData = response.data
            .filter(etab => etab.zap_id === zapId)
            .sort((a, b) => a.nom.localeCompare(b.nom));
          populateSelect(etablissementSelect, filteredData);
        }
        resolve(response);
      });
    } else {
      resolve({ success: false });
    }
  });
}

function loadRapports() {
  ipcRenderer.send('read-rapport');
}

// IPC Responses
ipcRenderer.on('create-rapport-response', (_, response) => {
  if (response.success) {
    closeModalHandler();
    loadRapports();
  } else {
    alert('Erreur lors de la création du rapport');
  }
});

ipcRenderer.on('update-rapport-response', (_, response) => {
  if (response.success) {
    closeModalHandler();
    loadRapports();
  } else {
    alert('Erreur lors de la modification du rapport');
  }
});

ipcRenderer.on('delete-rapport-response', (_, response) => {
  if (response.success) {
    loadRapports();
  } else {
    alert('Erreur lors de la suppression du rapport');
  }
});

ipcRenderer.on('read-rapport-response', (_, response) => {
  if (response.success) {
    rapportsData = response.data;
    populateTable(response.data);
  }
});

// Helper Functions
function populateSelect(selectElement, data) {
  const currentValue = selectElement.value;
  selectElement.innerHTML = '<option value="">Sélectionner...</option>';
  data.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.nom;
    selectElement.appendChild(option);
  });
  if (currentValue) {
    selectElement.value = currentValue;
  }
}

function populateTable(data) {
  const tbody = document.getElementById('rapportTableBody');
  tbody.innerHTML = '';

  data.forEach(rapport => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">${formatDate(rapport.date)}</div>
      </td>
      <td class="px-6 py-4">
        <div class="text-sm text-gray-900">${rapport.etablissement_nom || ''}</div>
        <div class="text-xs text-gray-500">
          ${rapport.dren_nom || ''} > ${rapport.cisco_nom || ''} > ${rapport.zap_nom || ''}
        </div>
      </td>
      <td class="px-6 py-4">
        <div class="text-sm text-gray-900">${truncateText(rapport.situation, 50)}</div>
      </td>
      <td class="px-6 py-4">
        <div class="text-sm text-gray-900">${truncateText(rapport.activites, 50)}</div>
      </td>
      <td class="px-6 py-4">
        <div class="text-sm text-gray-900">${formatCurrency(rapport.total)}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button onclick="window.editRapport('${rapport.id}')" class="text-green-600 hover:text-green-900 mr-3">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="window.deleteRapport('${rapport.id}')" class="text-red-600 hover:text-red-900">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Edit Rapport Function - Updated version
async function editRapport(id) {
  try {
    const rapport = rapportsData.find(r => r.id === id);
    if (!rapport) {
      throw new Error('Rapport non trouvé');
    }

    // Remplir le formulaire
    document.getElementById('rapportId').value = rapport.id;
    document.getElementById('modalTitle').textContent = 'Modifier Rapport';

    // Remplir les champs simples
    document.getElementById('date').value = rapport.date ? new Date(rapport.date).toISOString().split('T')[0] : '';
    document.getElementById('situation').value = rapport.situation || '';
    document.getElementById('activites').value = rapport.activites || '';
    document.getElementById('fonction').value = rapport.fonction || '';
    document.getElementById('prix_unitaire').value = rapport.prix_unitaire || '';
    document.getElementById('quantite').value = rapport.quantite || '';
    document.getElementById('total').value = rapport.total || '';
    document.getElementById('source_financement').value = rapport.source_financement || '';
    document.getElementById('executeur').value = rapport.executeur || '';
    document.getElementById('superviseur').value = rapport.superviseur || '';

    // Charger les listes déroulantes dans l'ordre
    await loadDrenOptions();
    drenSelect.value = rapport.dren_id;

    await loadCiscoOptions(rapport.dren_id);
    ciscoSelect.value = rapport.cisco_id;

    await loadZapOptions(rapport.cisco_id);
    zapSelect.value = rapport.zap_id;

    await loadEtablissementOptions(rapport.zap_id);
    etablissementSelect.value = rapport.etablissement_id;

    // Afficher le modal
    rapportModal.classList.remove('hidden');
  } catch (error) {
    console.error('Erreur lors de la modification:', error);
    alert('Erreur lors de la modification du rapport');
  }
}

// Delete Rapport Function
function deleteRapport(id) {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) {
    ipcRenderer.send('delete-rapport', id);
  }
}

// Utility Functions
function calculateTotal() {
  const prix = parseFloat(prixUnitaireInput.value) || 0;
  const quantite = parseInt(quantiteInput.value) || 0;
  totalInput.value = (prix * quantite).toFixed(2);
}

function closeModalHandler() {
  rapportModal.classList.add('hidden');
  rapportForm.reset();
  document.getElementById('rapportId').value = '';

  ciscoSelect.innerHTML = '<option value="">Sélectionner...</option>';
  zapSelect.innerHTML = '<option value="">Sélectionner...</option>';
  etablissementSelect.innerHTML = '<option value="">Sélectionner...</option>';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR');
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MGA'
  }).format(amount || 0);
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

// Excel Export Function
exportExcelBtn.addEventListener('click', async () => {
  try {
      if (!rapportsData || rapportsData.length === 0) {
          alert('Aucune donnée à exporter');
          return;
      }

      // Préparer les données pour l'exportation avec numérotation
      const exportData = rapportsData.map((rapport, index) => ({
          'N°': index + 1,
          'Date': formatDate(rapport.date),
          'DREN': rapport.dren_nom || '',
          'CISCO': rapport.cisco_nom || '',
          'ZAP': rapport.zap_nom || '',
          'Établissement': rapport.etablissement_nom || '',
          'Situation': rapport.situation || '',
          'Activités': rapport.activites || '',
          'Fonction': rapport.fonction || '',
          'Prix Unitaire': rapport.prix_unitaire || 0,
          'Quantité': rapport.quantite || 0,
          'Total': rapport.total || 0,
          'Source de Financement': rapport.source_financement || '',
          'Exécuteur': rapport.executeur || '',
          'Superviseur': rapport.superviseur || ''
      }));

      // Créer un nouveau classeur
      const wb = XLSX.utils.book_new();
      
      // Créer une nouvelle feuille
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Ajuster la largeur des colonnes
      const colWidths = [
          { wch: 4 },   // N°
          { wch: 12 },  // Date
          { wch: 20 },  // DREN
          { wch: 20 },  // CISCO
          { wch: 20 },  // ZAP
          { wch: 30 },  // Établissement
          { wch: 25 },  // Situation
          { wch: 40 },  // Activités
          { wch: 15 },  // Fonction
          { wch: 12 },  // Prix Unitaire
          { wch: 10 },  // Quantité
          { wch: 12 },  // Total
          { wch: 25 },  // Source de Financement
          { wch: 25 },  // Exécuteur
          { wch: 25 }   // Superviseur
      ];
      ws['!cols'] = colWidths;

      // Styliser l'en-tête
      const headerRange = XLSX.utils.decode_range(ws['!ref']);
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ r: 0, c: C });
          if (!ws[address]) continue;
          ws[address].s = {
              fill: { fgColor: { rgb: "CCCCCC" } },
              font: { bold: true }
          };
      }

      // Formater les colonnes numériques
      exportData.forEach((_, index) => {
          const row = index + 1; // +1 car la première ligne est l'en-tête
          
          // Format pour Prix Unitaire
          const prixUnitaireCell = XLSX.utils.encode_cell({ r: row, c: 9 });
          if (ws[prixUnitaireCell]) {
              ws[prixUnitaireCell].z = '#,##0.00';
          }
          
          // Format pour Total
          const totalCell = XLSX.utils.encode_cell({ r: row, c: 11 });
          if (ws[totalCell]) {
              ws[totalCell].z = '#,##0.00';
          }
      });

      // Ajouter la feuille au classeur
      XLSX.utils.book_append_sheet(wb, ws, "Liste Rapports");

      // Générer le nom de fichier par défaut
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const defaultPath = `liste_rapports_${dateStr}.xlsx`;

      // Demander à l'utilisateur où sauvegarder le fichier
      ipcRenderer.send('show-save-dialog', defaultPath);
      ipcRenderer.once('save-dialog-response', (_, result) => {
          if (!result.canceled && result.filePath) {
              try {
                  // Sauvegarder le fichier à l'emplacement choisi
                  XLSX.writeFile(wb, result.filePath);

                  // Notification de succès
                  const notification = document.createElement('div');
                  notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                  notification.textContent = 'Export Excel réussi !';
                  document.body.appendChild(notification);
                  setTimeout(() => notification.remove(), 3000);
              } catch (error) {
                  console.error('Erreur lors de l\'écriture du fichier:', error);
                  alert('Erreur lors de la création du fichier Excel.');
              }
          }
      });
  } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      alert('Une erreur est survenue lors de l\'export Excel');
  }
});

// Exposer les fonctions nécessaires globalement
window.editRapport = editRapport;
window.deleteRapport = deleteRapport;
window.populateTable = populateTable;

// Ajouter un gestionnaire d'erreurs global
window.addEventListener('unhandledrejection', function (event) {
  console.error('Erreur non gérée:', event.reason);
  alert('Une erreur inattendue s\'est produite. Veuillez réessayer.');
});

searchInput.addEventListener('input', function (e) {
  const searchTerm = e.target.value.toLowerCase();

  // Filtrer les rapports
  ipcRenderer.send('read-rapport');
  ipcRenderer.once('read-rapport-response', (event, response) => {
    if (response.success) {
      const filteredRapports = response.data.filter(rapport =>
        rapport.date.toLowerCase().includes(searchTerm) ||
        rapport.etablissement_id.toLowerCase().includes(searchTerm) ||
        rapport.situation.toLowerCase().includes(searchTerm) ||
        rapport.activites.toLowerCase().includes(searchTerm) ||
        rapport.total.toString().includes(searchTerm)
      ).sort((a, b) => a.date.localeCompare(b.date));

      // Mettre à jour le tableau
      rapportTableBody.innerHTML = '';
      filteredRapports.forEach(rapport => {
        rapportTableBody.innerHTML += `
                  <tr>
                      <td class="px-6 py-4 text-sm text-gray-500">
                          <i class="fas fa-calendar-alt mr-2"></i> ${rapport.date}
                      </td>
                       <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${rapport.etablissement_nom || ''}</div>
                    <div class="text-xs text-gray-500">
                      ${rapport.dren_nom || ''} > ${rapport.cisco_nom || ''} > ${rapport.zap_nom || ''}
                    </div>
                  </td>
                        <td class="px-6 py-4 text-sm text-gray-500">
                          <i class="fas fa-chart-line mr-2"></i> ${rapport.situation}
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-500">
                          <i class="fas fa-cogs mr-2"></i> ${rapport.activites}
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-500">
                          <i class="fas fa-dollar-sign mr-2"></i> ${rapport.total.toFixed(2)}
                      </td>
                      <td class="px-6 py-4 text-right text-sm font-medium space-x-2">
                          <button onclick="editRapport('${rapport.id}')" class="text-blue-600 hover:text-blue-900">
                              <i class="fas fa-edit"></i>
                          </button>
                          <button onclick="deleteRapport('${rapport.id}')" class="text-red-600 hover:text-red-900">
                              <i class="fas fa-trash"></i>
                          </button>
                      </td>
                  </tr>
              `;
      });
    }
  });
});
