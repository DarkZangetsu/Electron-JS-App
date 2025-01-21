const { ipcRenderer } = require('electron');

// DOM Elements
const usersList = document.getElementById('usersList');
const userModal = document.getElementById('userModal');
const userForm = document.getElementById('userForm');
const addUserBtn = document.getElementById('addUserBtn');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const searchInput = document.getElementById('searchInput');
const modalTitle = document.getElementById('modalTitle');

// Variables
let users = [];
let currentUsers = [];

// Load users on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, requesting users...');
    loadUsers();
});

// Event Listeners
addUserBtn.addEventListener('click', () => showModal('add'));
closeModal.addEventListener('click', hideModal);
cancelBtn.addEventListener('click', hideModal);
userForm.addEventListener('submit', handleSubmit);
searchInput.addEventListener('input', handleSearch);

function loadUsers() {
    console.log('Requesting users from main process...');
    ipcRenderer.send('read-users');
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm)
    );
    renderUsers(filteredUsers);
}

function showModal(mode, userId = null) {
    console.log('Showing modal:', mode, 'userId:', userId);

    // Reset form first
    userForm.reset();

    if (mode === 'edit' && userId) {
        console.log('Editing user, searching for:', userId);
        const user = users.find(u => u.id === parseInt(userId) || u.id === userId);
        if (user) {
            modalTitle.innerHTML = '<i class="fas fa-user-edit mr-2"></i>Modifier un utilisateur';
            document.getElementById('userId').value = user.id;
            document.getElementById('username').value = user.username;
            document.getElementById('password').value = ''; // Clear password field for security
        } else {
            console.error('User not found:', userId);
            return;
        }
    } else {
        modalTitle.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Ajouter un utilisateur';
        document.getElementById('userId').value = '';
    }

    userModal.classList.remove('hidden');
}

function hideModal() {
    userModal.classList.add('hidden');
    userForm.reset();
}

function renderUsers(usersToRender = currentUsers) {
    if (!usersList) {
        console.error('usersList element not found!');
        return;
    }

    if (usersToRender.length === 0) {
        usersList.innerHTML = `
            <tr>
                <td colspan="2" class="px-6 py-4 text-center text-gray-500">
                    Aucun utilisateur trouvé
                </td>
            </tr>
        `;
        return;
    }

    usersList.innerHTML = usersToRender.map(user => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${user.username}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="window.editUser('${user.id}')" 
                        class="text-green-600 hover:text-green-900 mx-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="window.confirmDeleteUser('${user.id}')" 
                        class="text-red-600 hover:text-red-900 mx-2">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Global functions for HTML access
window.editUser = function(userId) {
    console.log('Edit user called with ID:', userId);
    showModal('edit', userId);
};

window.confirmDeleteUser = function(userId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
        ipcRenderer.send('delete-user', { id: userId });
    }
};

async function handleSubmit(e) {
    e.preventDefault();

    const userId = document.getElementById('userId').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username) {
        alert("Le nom d'utilisateur est requis");
        return;
    }

    if (userId) {
        ipcRenderer.send('update-user', {
            id: userId,
            username,
            password: password || undefined
        });
    } else {
        if (!password) {
            alert("Le mot de passe est requis pour un nouvel utilisateur");
            return;
        }
        ipcRenderer.send('register', {
            username,
            password
        });
    }
}

// IPC Handlers
ipcRenderer.on('read-users-response', (event, response) => {
    if (response.success) {
        users = response.users;
        currentUsers = [...users];
        renderUsers();
    } else {
        alert('Erreur lors du chargement des utilisateurs: ' + response.message);
    }
});

ipcRenderer.on('register-response', (event, response) => {
    if (response.success) {
        hideModal();
        loadUsers();
        alert('Utilisateur créé avec succès');
    } else {
        alert('Erreur lors de la création: ' + response.message);
    }
});

ipcRenderer.on('update-user-response', (event, response) => {
    if (response.success) {
        hideModal();
        loadUsers();
        alert('Utilisateur mis à jour avec succès');
    } else {
        alert('Erreur lors de la mise à jour: ' + response.message);
    }
});

ipcRenderer.on('delete-user-response', (event, response) => {
    if (response.success) {
        loadUsers();
        alert('Utilisateur supprimé avec succès');
    } else {
        alert('Erreur lors de la suppression: ' + response.message);
    }
});
