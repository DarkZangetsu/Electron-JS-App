const { ipcRenderer } = require('electron');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');

// Éléments du DOM
const mandataireForm = document.getElementById('mandataireForm');
const formModal = document.getElementById('formModal');
const modalTitle = document.getElementById('modalTitle');
const btnAdd = document.getElementById('btnAdd');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancel = document.getElementById('btnCancel');
const mandataireTableBody = document.getElementById('mandataireTableBody');

// Éléments du formulaire
const etablissementSelect = document.getElementById('etablissementSelect');
const nomInput = document.getElementById('nomInput');
const prenomInput = document.getElementById('prenomInput');
const fonctionInput = document.getElementById('fonctionInput');
const cinInput = document.getElementById('cinInput');
const contactInput = document.getElementById('contactInput');
const adresseInput = document.getElementById('adresseInput');
const emailInput = document.getElementById('emailInput');
const observationInput = document.getElementById('observationInput');
const mandataireId = document.getElementById('mandataireId');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const searchInput = document.getElementById('searchInput');

// État de l'édition
let isEditing = false;
let currentMandataire = null;

// Chargement initial des données
document.addEventListener('DOMContentLoaded', () => {
    loadEtablissements();
    loadMandataires();
    initializeModalHandlers();
});

function initializeModalHandlers() {
    btnAdd.addEventListener('click', () => {
        isEditing = false;
        currentMandataire = null;
        modalTitle.textContent = 'Ajouter un mandataire';
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
    mandataireForm.reset();
    mandataireId.value = '';
    updateProgress();
}

// Chargement des établissements
function loadEtablissements() {
    ipcRenderer.send('read-etablissement');
}

ipcRenderer.on('read-etablissement-response', (event, response) => {
    if (response.success) {
        const sortedEtablissements = response.data.sort((a, b) => a.nom.localeCompare(b.nom));
        etablissementSelect.innerHTML = '<option value="">Sélectionner</option>';
        sortedEtablissements.forEach(etablissement => {
            etablissementSelect.innerHTML += `<option value="${etablissement.id}">${etablissement.nom}</option>`;
        });
        
        if (currentMandataire) {
            etablissementSelect.value = currentMandataire.etablissement_id;
        }
    }
});

// Mise à jour de la barre de progression
function updateProgress() {
    const requiredFields = [etablissementSelect, nomInput, prenomInput, fonctionInput, cinInput];
    const filledFields = requiredFields.filter(field => field.value.trim() !== '').length;
    const progress = (filledFields / requiredFields.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${Math.round(progress)}%`;
}

// Écoute des changements pour la progression
[etablissementSelect, nomInput, prenomInput, fonctionInput, cinInput, 
 contactInput, adresseInput, emailInput, observationInput].forEach(element => {
    element.addEventListener('input', updateProgress);
});

// Chargement des mandataires
function loadMandataires() {
    ipcRenderer.send('read-mandataire');
}

ipcRenderer.on('read-mandataire-response', (event, response) => {
    if (response.success) {
        const sortedMandataires = response.data.sort((a, b) => a.nom.localeCompare(b.nom));
        mandataireTableBody.innerHTML = '';
        sortedMandataires.forEach(mandataire => {
            mandataireTableBody.innerHTML += `
                <tr>
                    <td class="px-6 py-4 text-sm text-gray-900">${mandataire.nom} ${mandataire.prenom}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${mandataire.etablissement_nom}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${mandataire.fonction}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${mandataire.cin}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${mandataire.contact || '-'}</td>
                     <td class="px-6 py-4 text-sm text-gray-500">${mandataire.observation}</td>
                    <td class="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button onclick="editMandataire('${mandataire.id}')" class="text-green-600 hover:text-green-900">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteMandataire('${mandataire.id}')" class="text-red-600 hover:text-red-900">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }
});


// Édition d'un mandataire
window.editMandataire = function(id) {
    isEditing = true;
    mandataireId.value = id;
    modalTitle.textContent = 'Modifier le mandataire';
    
    ipcRenderer.send('read-mandataire');
    ipcRenderer.once('read-mandataire-response', (event, response) => {
        if (response.success) {
            currentMandataire = response.data.find(m => m.id === id);
            if (currentMandataire) {
                etablissementSelect.value = currentMandataire.etablissement_id;
                nomInput.value = currentMandataire.nom;
                prenomInput.value = currentMandataire.prenom;
                fonctionInput.value = currentMandataire.fonction;
                cinInput.value = currentMandataire.cin;
                contactInput.value = currentMandataire.contact || '';
                adresseInput.value = currentMandataire.adresse || '';
                emailInput.value = currentMandataire.email || '';
                observationInput.value = currentMandataire.observation || '';
                showModal();
            }
        }
    });
}

// Suppression d'un mandataire
window.deleteMandataire = function(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce mandataire ?')) {
        ipcRenderer.send('delete-mandataire', id);
    }
}

// Gestion du formulaire
mandataireForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const mandataireData = {
        id: isEditing ? mandataireId.value : uuidv4(),
        etablissement_id: etablissementSelect.value,
        nom: nomInput.value,
        prenom: prenomInput.value,
        fonction: fonctionInput.value,
        cin: cinInput.value,
        contact: contactInput.value,
        adresse: adresseInput.value,
        email: emailInput.value,
        observation: observationInput.value
    };

    if (isEditing) {
        ipcRenderer.send('update-mandataire', mandataireData);
    } else {
        ipcRenderer.send('create-mandataire', mandataireData);
    }
});

// Réponses du serveur
ipcRenderer.on('create-mandataire-response', (event, response) => {
    if (response.success) {
        hideModal();
        loadMandataires();
    } else {
        alert('Erreur lors de la création : ' + response.error);
    }
});

ipcRenderer.on('update-mandataire-response', (event, response) => {
    if (response.success) {
        hideModal();
        loadMandataires();
    } else {
        alert('Erreur lors de la mise à jour : ' + response.error);
    }
});

ipcRenderer.on('delete-mandataire-response', (event, response) => {
    if (response.success) {
        loadMandataires();
    } else {
        alert('Erreur lors de la suppression : ' + response.error);
    }
});


searchInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    // Filtrer les mandataires
    ipcRenderer.send('read-mandataire');
    ipcRenderer.once('read-mandataire-response', (event, response) => {
        if (response.success) {
            const filteredMandataires = response.data.filter(mandataire => 
                mandataire.nom.toLowerCase().includes(searchTerm) ||
                mandataire.prenom.toLowerCase().includes(searchTerm) ||
                mandataire.fonction.toLowerCase().includes(searchTerm) ||
                mandataire.cin.toLowerCase().includes(searchTerm) ||
                (mandataire.contact && mandataire.contact.toLowerCase().includes(searchTerm)) ||
                (mandataire.adresse && mandataire.adresse.toLowerCase().includes(searchTerm)) ||
                (mandataire.email && mandataire.email.toLowerCase().includes(searchTerm))
            ).sort((a, b) => a.nom.localeCompare(b.nom));

            // Mettre à jour le tableau
            mandataireTableBody.innerHTML = '';
            filteredMandataires.forEach(mandataire => {
                mandataireTableBody.innerHTML += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${mandataire.nom}</td>
                        <td class="px-6 py-4 text-sm text-gray-900">${mandataire.prenom}</td>
                        <td class="px-6 py-4 text-sm text-gray-500">${mandataire.fonction}</td>
                        <td class="px-6 py-4 text-sm text-gray-500">${mandataire.cin}</td>
                        <td class="px-6 py-4 text-sm text-gray-500">${mandataire.contact || '-'}</td>
                        <td class="px-6 py-4 text-sm text-gray-500">${mandataire.email || '-'}</td>
                        <td class="px-6 py-4 text-right text-sm font-medium space-x-2">
                            <button onclick="editMandataire('${mandataire.id}')" class="text-blue-600 hover:text-blue-900">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteMandataire('${mandataire.id}')" class="text-red-600 hover:text-red-900">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    });
});


// Fonction pour exporter les mandataires en Excel
function exportMandatairesToExcel() {
    // On a besoin des données des établissements et des mandataires
    ipcRenderer.send('read-etablissement');
    ipcRenderer.once('read-etablissement-response', (event, etablissementResponse) => {
        if (etablissementResponse.success) {
            // Créer un map des établissements pour un accès facile
            const etablissementMap = {};
            etablissementResponse.data.forEach(etab => {
                etablissementMap[etab.id] = {
                    nom: etab.nom,
                    code: etab.code // Utilisation du code de l'établissement
                };
            });

            // Maintenant récupérer les mandataires
            ipcRenderer.send('read-mandataire');
            ipcRenderer.once('read-mandataire-response', (event, response) => {
                if (response.success) {
                    try {
                        // Trier les mandataires par établissement
                        const sortedMandataires = response.data.sort((a, b) => {
                            const etablA = etablissementMap[a.etablissement_id]?.nom || '';
                            const etablB = etablissementMap[b.etablissement_id]?.nom || '';
                            return etablA.localeCompare(etablB);
                        });

                        // Préparer les données pour le format Excel
                        const excelData = sortedMandataires.map((mandataire, index) => {
                            const etablissement = etablissementMap[mandataire.etablissement_id];
                            // Extraire le ZAP de l'établissement 
                            const zap = etablissement?.nom.split(' ')[0] || '';
                            
                            return {
                                'N°': index + 1,
                                'ZAP': zap,
                                'Etablissement': etablissement?.nom || '',
                                'Code': etablissement?.code || '', // Utilisation du code au lieu de l'ID
                                'NOM & Prénoms': `${mandataire.nom} ${mandataire.prenom}`,
                                'Fonction': mandataire.fonction,
                                'CIN': mandataire.cin,
                                'Contact Téléphonique': mandataire.contact || '',
                                'Adresse mail': mandataire.email || ''
                            };
                        });

                        // Créer un nouveau classeur
                        const wb = XLSX.utils.book_new();
                        
                        // Créer une nouvelle feuille
                        const ws = XLSX.utils.json_to_sheet(excelData);

                        // Ajuster la largeur des colonnes
                        const colWidths = [
                            { wch: 4 },  // N°
                            { wch: 15 }, // ZAP
                            { wch: 30 }, // Etablissement
                            { wch: 12 }, // Code
                            { wch: 30 }, // NOM & Prénoms
                            { wch: 15 }, // Fonction
                            { wch: 15 }, // CIN
                            { wch: 20 }, // Contact
                            { wch: 25 }  // Email
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
                        XLSX.utils.book_append_sheet(wb, ws, "Liste Mandataires");

                        // Sauvegarder le fichier
                        const now = new Date();
                        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                        const fileName = `liste_mandataires_${dateStr}.xlsx`;

                        XLSX.writeFile(wb, fileName);

                        // Notification de succès
                        const notification = document.createElement('div');
                        notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                        notification.textContent = 'Export Excel réussi !';
                        document.body.appendChild(notification);
                        setTimeout(() => notification.remove(), 3000);

                    } catch (error) {
                        console.error('Erreur lors de l\'export:', error);
                        alert('Une erreur est survenue lors de l\'export Excel');
                    }
                } else {
                    alert('Erreur lors de la récupération des données des mandataires');
                }
            });
        } else {
            alert('Erreur lors de la récupération des données des établissements');
        }
    });
}

// Ajouter un bouton d'export dans le HTML (à placer à côté du bouton Ajouter)
document.addEventListener('DOMContentLoaded', () => {
    const headerButtons = document.querySelector('.flex.justify-between.items-center.mb-6');
    if (headerButtons) {
        const exportButton = document.createElement('button');
        exportButton.className = 'px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 focus:ring focus:ring-blue-300 mr-4';
        exportButton.innerHTML = '<i class="fas fa-file-export mr-2"></i>Exporter en Excel';
        exportButton.onclick = exportMandatairesToExcel;
        
        // Insérer le bouton avant le bouton Ajouter
        const addButton = document.getElementById('btnAdd');
        headerButtons.insertBefore(exportButton, addButton);
    }
}
)
