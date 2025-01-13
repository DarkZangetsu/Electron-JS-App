const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

let mainWindow;
const db = new sqlite3.Database('users.db');

// Initialiser la base de données
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920, 
    height: 1080, 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('login.html');
}

app.whenReady().then(createWindow);

// Gérer l'inscription
ipcMain.on('register', async (event, data) => {
  const { username, password } = data;
  const hashedPassword = await bcrypt.hash(password, 10);

  db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
    [username, hashedPassword], 
    function(err) {
      if (err) {
        event.reply('register-response', { 
          success: false, 
          message: 'Username already exists' 
        });
      } else {
        event.reply('register-response', { 
          success: true, 
          message: 'Registration successful' 
        });
      }
    }
  );
});

// Gérer la connexion
ipcMain.on('login', async (event, data) => {
  const { username, password } = data;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) {
      event.reply('login-response', { 
        success: false, 
        message: 'Database error' 
      });
    } else if (!row) {
      event.reply('login-response', { 
        success: false, 
        message: 'User not found' 
      });
    } else {
      const match = await bcrypt.compare(password, row.password);
      if (match) {
        event.reply('login-response', { 
          success: true, 
          message: 'Login successful' 
        });
      } else {
        event.reply('login-response', { 
          success: false, 
          message: 'Invalid password' 
        });
      }
    }
  });
});
