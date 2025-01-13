const { ipcRenderer } = require('electron');
const card = document.querySelector('.card');
const form = document.getElementById('authForm');
const toggleBtn = document.getElementById('toggleForm');
const formTitle = document.getElementById('formTitle');
const showLoginBtn = document.getElementById('showLoginBtn');
const backToWelcomeBtn = document.getElementById('backToWelcome');
const notification = document.getElementById('notification');
let isLogin = true;

// Rotation de la carte
showLoginBtn.addEventListener('click', () => {
  card.classList.add('flipped');
});

backToWelcomeBtn.addEventListener('click', () => {
  card.classList.remove('flipped');
});

// Animation de notification
function showNotification(message, type = 'success') {
  notification.classList.remove('hidden');
  notification.style.backgroundColor = type === 'success' ? '#dcfce7' : '#fee2e2';
  notification.style.color = type === 'success' ? '#166534' : '#991b1b';
  document.getElementById('notificationText').textContent = message;
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 500);
  }, 3000);
}

toggleBtn.addEventListener('click', (e) => {
  e.preventDefault();
  isLogin = !isLogin;
  formTitle.textContent = isLogin ? 'Login' : 'Créer un compte';
  toggleBtn.textContent = isLogin ? 'Créer un compte' : 'Se connecter';
  document.querySelector('button[type="submit"]').textContent = 
    isLogin ? 'Se connecter' : "S'inscrire";
  form.reset();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  if (isLogin) {
    ipcRenderer.send('login', { username, password });
  } else {
    ipcRenderer.send('register', { username, password });
  }
});

ipcRenderer.on('login-response', (event, response) => {
  if (response.success) {
    showNotification('Connexion réussie! Redirection...', 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
  } else {
    showNotification(response.message, 'error');
  }
});

ipcRenderer.on('register-response', (event, response) => {
  if (response.success) {
    showNotification('Inscription réussie!', 'success');
    setTimeout(() => {
      isLogin = true;
      formTitle.textContent = 'Login';
      toggleBtn.textContent = 'Créer un compte';
      document.querySelector('button[type="submit"]').textContent = 'Se connecter';
      form.reset();
    }, 1500);
  } else {
    showNotification(response.message, 'error');
  }
});