const { ipcRenderer } = require('electron');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');

// Éléments du DOM
const etablissementForm = document.getElementById('etablissementForm');
const formModal = document.getElementById('formModal');
const modalTitle = document.getElementById('modalTitle');
const btnAdd = document.getElementById('btnAdd');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancel = document.getElementById('btnCancel');
const etablissementTableBody = document.getElementById('etablissementTableBody');
const exportExcelBtn = document.getElementById('exportExcel');

// Éléments du formulaire
const drenSelect = document.getElementById('drenSelect');
const ciscoSelect = document.getElementById('ciscoSelect');
const zapSelect = document.getElementById('zapSelect');
const codeInput = document.getElementById('codeInput');
const nomInput = document.getElementById('nomInput');
const etablissementId = document.getElementById('etablissementId');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const searchInput = document.getElementById('searchInput');

// État de l'édition
let isEditing = false;
let currentEtablissement = null;

// Chargement initial des données
document.addEventListener('DOMContentLoaded', () => {
    loadDRENs();
    loadEtablissements();
    initializeModalHandlers();
});

function initializeModalHandlers() {
    btnAdd.addEventListener('click', () => {
        isEditing = false;
        currentEtablissement = null;
        modalTitle.textContent = 'Ajouter un établissement';
        resetForm();
        showModal();
    });

    btnCloseModal.addEventListener('click', hideModal);
    btnCancel.addEventListener('click', hideModal);

    formModal.addEventListener('click', (e) => {
        if (e.target === formModal) hideModal();
    });

    const modalContent = formModal.querySelector('.bg-white');
    if (modalContent) {
        modalContent.addEventListener('click', (e) => e.stopPropagation());
    }
}

// Fonctions pour gérer le modal
function showModal() {
    formModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideModal() {
    formModal.style.display = 'none';
    document.body.style.overflow = '';
    resetForm();
}

function resetForm() {
    etablissementForm.reset();
    etablissementId.value = '';
    ciscoSelect.innerHTML = '<option value="">Sélectionner</option>';
    zapSelect.innerHTML = '<option value="">Sélectionner</option>';
    updateProgress();
}

// Chargement des DRENs
function loadDRENs() {
    ipcRenderer.send('read-dren');
}

ipcRenderer.on('read-dren-response', (event, response) => {
    if (response.success) {
        const sortedDRENs = response.data.sort((a, b) => a.nom.localeCompare(b.nom));
        drenSelect.innerHTML = '<option value="">Sélectionner</option>';
        sortedDRENs.forEach(dren => {
            drenSelect.innerHTML += `<option value="${dren.id}">${dren.nom}</option>`;
        });
        
        if (currentEtablissement) {
            drenSelect.value = currentEtablissement.dren_id;
            loadCISCOs(currentEtablissement.dren_id, currentEtablissement.cisco_id);
        }
    }
});

// Chargement des CISCOs
drenSelect.addEventListener('change', () => {
    const drenId = drenSelect.value;
    if (drenId) {
        loadCISCOs(drenId);
    } else {
        ciscoSelect.innerHTML = '<option value="">Sélectionner</option>';
        zapSelect.innerHTML = '<option value="">Sélectionner</option>';
    }
    updateProgress();
});

function loadCISCOs(drenId, selectedCiscoId = null) {
    ipcRenderer.send('read-cisco');
    ipcRenderer.once('read-cisco-response', (event, response) => {
        if (response.success) {
            const filteredCISCOs = response.data
                .filter(cisco => cisco.dren_id === drenId)
                .sort((a, b) => a.nom.localeCompare(b.nom));

            ciscoSelect.innerHTML = '<option value="">Sélectionner</option>';
            filteredCISCOs.forEach(cisco => {
                ciscoSelect.innerHTML += `<option value="${cisco.id}">${cisco.nom}</option>`;
            });

            if (selectedCiscoId) {
                ciscoSelect.value = selectedCiscoId;
                loadZAPs(selectedCiscoId, currentEtablissement.zap_id);
            }
        }
    });
}

// Chargement des ZAPs
ciscoSelect.addEventListener('change', () => {
    const ciscoId = ciscoSelect.value;
    if (ciscoId) {
        loadZAPs(ciscoId);
    } else {
        zapSelect.innerHTML = '<option value="">Sélectionner</option>';
    }
    updateProgress();
});

function loadZAPs(ciscoId, selectedZapId = null) {
    ipcRenderer.send('read-zap');
    ipcRenderer.once('read-zap-response', (event, response) => {
        if (response.success) {
            const filteredZAPs = response.data
                .filter(zap => zap.cisco_id === ciscoId)
                .sort((a, b) => a.nom.localeCompare(b.nom));

            zapSelect.innerHTML = '<option value="">Sélectionner</option>';
            filteredZAPs.forEach(zap => {
                zapSelect.innerHTML += `<option value="${zap.id}">${zap.nom}</option>`;
            });

            if (selectedZapId) {
                zapSelect.value = selectedZapId;
            }
        }
    });
}

// Mise à jour de la barre de progression
function updateProgress() {
    const fields = [drenSelect, ciscoSelect, zapSelect, codeInput, nomInput];
    const filledFields = fields.filter(field => field.value.trim() !== '').length;
    const progress = (filledFields / fields.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${Math.round(progress)}%`;
}

// Écoute des changements pour la progression
[zapSelect, codeInput, nomInput].forEach(element => {
    element.addEventListener('input', updateProgress);
});

// Chargement des établissements
function loadEtablissements() {
    ipcRenderer.send('read-etablissement');
}

ipcRenderer.on('read-etablissement-response', (event, response) => {
    if (response.success) {
        const sortedEtablissements = response.data.sort((a, b) => a.nom.localeCompare(b.nom));
        etablissementTableBody.innerHTML = '';
        sortedEtablissements.forEach(etablissement => {
            etablissementTableBody.innerHTML += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${etablissement.code}</td>
                    <td class="px-6 py-4 text-sm text-gray-900">${etablissement.nom}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${etablissement.dren_nom}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${etablissement.cisco_nom}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${etablissement.zap_nom}</td>
                    <td class="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button onclick="editEtablissement('${etablissement.id}')" class="text-blue-600 hover:text-blue-900">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteEtablissement('${etablissement.id}')" class="text-red-600 hover:text-red-900">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }
});

// Édition d'un établissement
window.editEtablissement = function(id) {
    isEditing = true;
    etablissementId.value = id;
    modalTitle.textContent = 'Modifier l\'établissement';
    
    ipcRenderer.send('read-etablissement');
    ipcRenderer.once('read-etablissement-response', (event, response) => {
        if (response.success) {
            currentEtablissement = response.data.find(e => e.id === id);
            if (currentEtablissement) {
                codeInput.value = currentEtablissement.code;
                nomInput.value = currentEtablissement.nom;
                
                // Charger la hiérarchie DREN > CISCO > ZAP
                loadDRENs();
                showModal();
            }
        }
    });
}

// Suppression d'un établissement
window.deleteEtablissement = function(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet établissement ?')) {
        ipcRenderer.send('delete-etablissement', id);
    }
}

// Gestion du formulaire
etablissementForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const etablissementData = {
        id: isEditing ? etablissementId.value : uuidv4(),
        dren_id: drenSelect.value,
        cisco_id: ciscoSelect.value,
        zap_id: zapSelect.value,
        code: codeInput.value,
        nom: nomInput.value
    };

    if (isEditing) {
        ipcRenderer.send('update-etablissement', etablissementData);
    } else {
        ipcRenderer.send('create-etablissement', etablissementData);
    }
});

// Réponses du serveur
ipcRenderer.on('create-etablissement-response', (event, response) => {
    if (response.success) {
        hideModal();
        loadEtablissements();
    } else {
        alert('Erreur lors de la création : ' + response.error);
    }
});

ipcRenderer.on('update-etablissement-response', (event, response) => {
    if (response.success) {
        hideModal();
        loadEtablissements();
    } else {
        alert('Erreur lors de la mise à jour : ' + response.error);
    }
});

ipcRenderer.on('delete-etablissement-response', (event, response) => {
    if (response.success) {
        loadEtablissements();
    } else {
        alert('Erreur lors de la suppression : ' + response.error);
    }
});


searchInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    // Filtrer les établissements
    ipcRenderer.send('read-etablissement');
    ipcRenderer.once('read-etablissement-response', (event, response) => {
        if (response.success) {
            const filteredEtablissements = response.data.filter(etablissement => 
                etablissement.code.toLowerCase().includes(searchTerm) ||
                etablissement.nom.toLowerCase().includes(searchTerm) ||
                etablissement.dren_nom.toLowerCase().includes(searchTerm) ||
                etablissement.cisco_nom.toLowerCase().includes(searchTerm) ||
                etablissement.zap_nom.toLowerCase().includes(searchTerm)
            ).sort((a, b) => a.nom.localeCompare(b.nom));

            // Mettre à jour le tableau
            etablissementTableBody.innerHTML = '';
            filteredEtablissements.forEach(etablissement => {
                etablissementTableBody.innerHTML += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${etablissement.code}</td>
                        <td class="px-6 py-4 text-sm text-gray-900">${etablissement.nom}</td>
                        <td class="px-6 py-4 text-sm text-gray-500">${etablissement.dren_nom}</td>
                        <td class="px-6 py-4 text-sm text-gray-500">${etablissement.cisco_nom}</td>
                        <td class="px-6 py-4 text-sm text-gray-500">${etablissement.zap_nom}</td>
                        <td class="px-6 py-4 text-right text-sm font-medium space-x-2">
                            <button onclick="editEtablissement('${etablissement.id}')" class="text-blue-600 hover:text-blue-900">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteEtablissement('${etablissement.id}')" class="text-red-600 hover:text-red-900">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    });
});

// Excel Export Function for Établissement
exportExcelBtn.addEventListener('click', () => {
    ipcRenderer.send('read-etablissement');
    ipcRenderer.once('read-etablissement-response', (event, response) => {
        if (!response.success || response.data.length === 0) {
            alert('Aucune donnée à exporter.');
            return;
        }

        try {
            const etablissementsData = response.data;

            // Préparer les données pour l'exportation avec numérotation
            const exportData = etablissementsData.map((etablissement, index) => ({
                'N°': index + 1,
                'DREN': etablissement.dren_nom || '',
                'CISCO': etablissement.cisco_nom || '',
                'ZAP': etablissement.zap_nom || '',
                'Code': etablissement.code || '',
                'Nom': etablissement.nom || ''
            }));

            // Créer un nouveau classeur
            const wb = XLSX.utils.book_new();
            
            // Créer une nouvelle feuille
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Ajuster la largeur des colonnes
            const colWidths = [
                { wch: 4 },  // N°
                { wch: 20 }, // DREN
                { wch: 20 }, // CISCO
                { wch: 20 }, // ZAP
                { wch: 15 }, // Code
                { wch: 40 }  // Nom
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

            // Ajouter la feuille au classeur
            XLSX.utils.book_append_sheet(wb, ws, "Liste Établissements");

            // Générer le nom de fichier par défaut
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const defaultPath = `liste_etablissements_${dateStr}.xlsx`;

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
            console.error('Erreur lors de la préparation des données:', error);
            alert('Erreur lors de la préparation des données pour l\'export.');
        }
    });
});