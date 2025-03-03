const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { dialog } = require('electron');

let mainWindow;
const db = new sqlite3.Database('feffi.db');

// Initialize database tables
db.serialize(() => {
  // Existing users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  // Table DREN (Direction Régionale de l'Education Nationale)
  db.run(`CREATE TABLE IF NOT EXISTS dren (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL
  )`);

  // Table CISCO (Circonscription Scolaire)
  db.run(`CREATE TABLE IF NOT EXISTS cisco (
    id TEXT PRIMARY KEY,
    dren_id TEXT NOT NULL,
    nom TEXT NOT NULL,
    FOREIGN KEY (dren_id) REFERENCES dren(id)
  )`);

  // Table ZAP (Zone Administrative et Pédagogique)
  db.run(`CREATE TABLE IF NOT EXISTS zap (
    id TEXT PRIMARY KEY,
    cisco_id TEXT NOT NULL,
    nom TEXT NOT NULL,
    FOREIGN KEY (cisco_id) REFERENCES cisco(id)
  )`);

  // Table Établissement
  db.run(`CREATE TABLE IF NOT EXISTS etablissement (
    id TEXT PRIMARY KEY,
    dren_id  TEXT NOT NULL,
    cisco_id TEXT NOT NULL, 
    zap_id TEXT NOT NULL,
    code TEXT NOT NULL,
    nom TEXT NOT NULL,
    FOREIGN KEY (zap_id) REFERENCES zap(id),
    FOREIGN KEY (cisco_id) REFERENCES cisco(id),
    FOREIGN KEY (dren_id) REFERENCES dren(id)
  )`);

  // Table Mandataire
  db.run(`CREATE TABLE IF NOT EXISTS mandataire (
    id TEXT PRIMARY KEY,
    etablissement_id TEXT NOT NULL,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    fonction TEXT NOT NULL,
    cin TEXT UNIQUE NOT NULL,
    contact TEXT,
    adresse TEXT,
    email TEXT UNIQUE,
    observation TEXT,
    FOREIGN KEY (etablissement_id) REFERENCES etablissement(id)
  )`);

  // Table Caisse
  db.run(`CREATE TABLE IF NOT EXISTS caisse (
    id TEXT PRIMARY KEY,
    dren_id TEXT NOT NULL,
    cisco_id TEXT NOT NULL,
    zap_id TEXT NOT NULL,
    etablissement_id TEXT NOT NULL,
    montant_ariary REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (dren_id) REFERENCES dren(id),
    FOREIGN KEY (cisco_id) REFERENCES cisco(id),
    FOREIGN KEY (zap_id) REFERENCES zap(id),
    FOREIGN KEY (etablissement_id) REFERENCES etablissement(id)
  )`);

  // Table Rapport
  db.run(`CREATE TABLE IF NOT EXISTS rapport (
    id TEXT PRIMARY KEY,
    dren_id TEXT NOT NULL,
    cisco_id TEXT NOT NULL,
    zap_id TEXT NOT NULL,
    etablissement_id TEXT NOT NULL,
    date DATE NOT NULL,
    situation TEXT NOT NULL,
    activites TEXT NOT NULL,
    fonction TEXT NOT NULL,
    prix_unitaire REAL NOT NULL,
    quantite INTEGER NOT NULL,
    total REAL NOT NULL,
    source_financement TEXT NOT NULL,
    executeur TEXT NOT NULL,
    superviseur TEXT NOT NULL,
    FOREIGN KEY (dren_id) REFERENCES dren(id),
    FOREIGN KEY (cisco_id) REFERENCES cisco(id),
    FOREIGN KEY (zap_id) REFERENCES zap(id),
    FOREIGN KEY (etablissement_id) REFERENCES etablissement(id)
  )`);
});


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: true,  
      contextIsolation: false, 
    }
  });

  mainWindow.loadFile('login.html');

  const menuTemplate = [
    {
      label: 'Fichier',
      submenu: [
        { label: 'Quitter', role: 'quit' }
      ]
    },
    {
      label: 'Édition',
      submenu: [
        { label: 'Annuler', role: 'undo' },
        { label: 'Refaire', role: 'redo' },
        { type: 'separator' },
        { label: 'Couper', role: 'cut' },
        { label: 'Copier', role: 'copy' },
        { label: 'Coller', role: 'paste' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Actualiser', role: 'reload' },
        { label: 'Mode plein écran', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Aide',
      submenu: [
        { label: 'À propos', click: () => { console.log('À propos de cette application'); } }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


// Existing register handler
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

// Existing login handler
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


// Read all users
ipcMain.on('read-users', (event) => {
  console.log('Main process received read-users request');
  
  db.all('SELECT id, username FROM users', (err, rows) => {
    console.log('Database query completed');
    if (err) {
      console.error('Database error:', err);
      event.reply('read-users-response', {
        success: false,
        message: 'Database error',
        error: err
      });
    } else {
      console.log('Found users:', rows);
      event.reply('read-users-response', {
        success: true,
        message: 'Users retrieved successfully',
        users: rows
      });
    }
  });
})
// Read single user
ipcMain.on('read-user', (event, data) => {
  const { id } = data;
  db.get('SELECT id, username FROM users WHERE id = ?', [id], (err, row) => {
    if (err) {
      event.reply('read-user-response', {
        success: false,
        message: 'Database error',
        error: err
      });
    } else if (!row) {
      event.reply('read-user-response', {
        success: false,
        message: 'User not found'
      });
    } else {
      event.reply('read-user-response', {
        success: true,
        message: 'User retrieved successfully',
        user: row
      });
    }
  });
});

// Update user
ipcMain.on('update-user', async (event, data) => {
  const { id, username, password } = data;
  
  try {
    // If password is provided, hash it
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        'UPDATE users SET username = ?, password = ? WHERE id = ?',
        [username, hashedPassword, id],
        function(err) {
          if (err) {
            event.reply('update-user-response', {
              success: false,
              message: err.message.includes('UNIQUE') ? 'Username already exists' : 'Database error',
              error: err
            });
          } else if (this.changes === 0) {
            event.reply('update-user-response', {
              success: false,
              message: 'User not found'
            });
          } else {
            event.reply('update-user-response', {
              success: true,
              message: 'User updated successfully'
            });
          }
        }
      );
    } else {
      // If no password provided, only update username
      db.run(
        'UPDATE users SET username = ? WHERE id = ?',
        [username, id],
        function(err) {
          if (err) {
            event.reply('update-user-response', {
              success: false,
              message: err.message.includes('UNIQUE') ? 'Username already exists' : 'Database error',
              error: err
            });
          } else if (this.changes === 0) {
            event.reply('update-user-response', {
              success: false,
              message: 'User not found'
            });
          } else {
            event.reply('update-user-response', {
              success: true,
              message: 'User updated successfully'
            });
          }
        }
      );
    }
  } catch (err) {
    event.reply('update-user-response', {
      success: false,
      message: 'Error processing request',
      error: err
    });
  }
});

// Delete user
ipcMain.on('delete-user', (event, data) => {
  const { id } = data;
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      event.reply('delete-user-response', {
        success: false,
        message: 'Database error',
        error: err
      });
    } else if (this.changes === 0) {
      event.reply('delete-user-response', {
        success: false,
        message: 'User not found'
      });
    } else {
      event.reply('delete-user-response', {
        success: true,
        message: 'User deleted successfully'
      });
    }
  });
});


// CRUD Operations for DREN
ipcMain.on('create-dren', (event, data) => {
  const { id, nom } = data;
  db.run('INSERT INTO dren (id, nom) VALUES (?, ?)', 
    [id, nom],
    function(err) {
      event.reply('create-dren-response', {
        success: !err,
        message: err ? 'Error creating DREN' : 'DREN created successfully',
        error: err
      });
    }
  );
});

ipcMain.on('read-dren', (event) => {
  db.all('SELECT * FROM dren', (err, rows) => {
    event.reply('read-dren-response', {
      success: !err,
      data: rows,
      error: err
    });
  });
});

ipcMain.on('update-dren', (event, data) => {
  const { id, nom } = data;
  db.run('UPDATE dren SET nom = ? WHERE id = ?',
    [nom, id],
    function(err) {
      event.reply('update-dren-response', {
        success: !err,
        message: err ? 'Error updating DREN' : 'DREN updated successfully',
        error: err
      });
    }
  );
});

ipcMain.on('delete-dren', (event, id) => {
  db.run('DELETE FROM dren WHERE id = ?', 
    [id],
    function(err) {
      event.reply('delete-dren-response', {
        success: !err,
        message: err ? 'Error deleting DREN' : 'DREN deleted successfully',
        error: err
      });
    }
  );
});

// CRUD Operations for CISCO
ipcMain.on('create-cisco', (event, data) => {
  const { id, dren_id, nom } = data;
  db.run('INSERT INTO cisco (id, dren_id, nom) VALUES (?, ?, ?)',
    [id, dren_id, nom],
    function(err) {
      event.reply('create-cisco-response', {
        success: !err,
        message: err ? 'Error creating CISCO' : 'CISCO created successfully',
        error: err
      });
    }
  );
});

ipcMain.on('read-cisco', (event) => {
  db.all('SELECT cisco.*, dren.nom as dren_nom FROM cisco JOIN dren ON cisco.dren_id = dren.id', 
    (err, rows) => {
      event.reply('read-cisco-response', {
        success: !err,
        data: rows,
        error: err
      });
    }
  );
});

ipcMain.on('update-cisco', (event, data) => {
  const { id, dren_id, nom } = data;
  db.run('UPDATE cisco SET dren_id = ?, nom = ? WHERE id = ?',
    [dren_id, nom, id],
    function(err) {
      event.reply('update-cisco-response', {
        success: !err,
        message: err ? 'Error updating CISCO' : 'CISCO updated successfully',
        error: err
      });
    }
  );
});

ipcMain.on('delete-cisco', (event, id) => {
  db.run('DELETE FROM cisco WHERE id = ?',
    [id],
    function(err) {
      event.reply('delete-cisco-response', {
        success: !err,
        message: err ? 'Error deleting CISCO' : 'CISCO deleted successfully',
        error: err
      });
    }
  );
});

// CRUD Operations for ZAP
ipcMain.on('create-zap', (event, data) => {
  const { id, cisco_id, nom } = data;
  db.run('INSERT INTO zap (id, cisco_id, nom) VALUES (?, ?, ?)',
    [id, cisco_id, nom],
    function(err) {
      event.reply('create-zap-response', {
        success: !err,
        message: err ? 'Error creating ZAP' : 'ZAP created successfully',
        error: err
      });
    }
  );
});

ipcMain.on('read-zap', (event) => {
  db.all(`
    SELECT zap.*, cisco.nom as cisco_nom 
    FROM zap 
    JOIN cisco ON zap.cisco_id = cisco.id`,
    (err, rows) => {
      event.reply('read-zap-response', {
        success: !err,
        data: rows,
        error: err
      });
    }
  );
});

ipcMain.on('update-zap', (event, data) => {
  const { id, cisco_id, nom } = data;
  db.run('UPDATE zap SET cisco_id = ?, nom = ? WHERE id = ?',
    [cisco_id, nom, id],
    function(err) {
      event.reply('update-zap-response', {
        success: !err,
        message: err ? 'Error updating ZAP' : 'ZAP updated successfully',
        error: err
      });
    }
  );
});

ipcMain.on('delete-zap', (event, id) => {
  db.run('DELETE FROM zap WHERE id = ?',
    [id],
    function(err) {
      event.reply('delete-zap-response', {
        success: !err,
        message: err ? 'Error deleting ZAP' : 'ZAP deleted successfully',
        error: err
      });
    }
  );
});

// CRUD Operations for Etablissement
ipcMain.on('create-etablissement', (event, data) => {
  const { id, dren_id, cisco_id, zap_id, code, nom } = data;
  db.run(
    'INSERT INTO etablissement (id, dren_id, cisco_id, zap_id, code, nom) VALUES (?, ?, ?, ?, ?, ?)',
    [id, dren_id, cisco_id, zap_id, code, nom],
    function(err) {
      event.reply('create-etablissement-response', {
        success: !err,
        message: err ? 'Error creating établissement' : 'Établissement created successfully',
        error: err
      });
    }
  );
});

ipcMain.on('read-etablissement', (event) => {
  db.all(`
    SELECT 
      e.*,
      d.nom as dren_nom,
      c.nom as cisco_nom,
      z.nom as zap_nom
    FROM etablissement e
    JOIN dren d ON e.dren_id = d.id
    JOIN cisco c ON e.cisco_id = c.id
    JOIN zap z ON e.zap_id = z.id
  `, (err, rows) => {
    event.reply('read-etablissement-response', {
      success: !err,
      data: rows,
      error: err
    });
  });
});

ipcMain.on('update-etablissement', (event, data) => {
  const { id, dren_id, cisco_id, zap_id, code, nom } = data;
  db.run(
    'UPDATE etablissement SET dren_id = ?, cisco_id = ?, zap_id = ?, code = ?, nom = ? WHERE id = ?',
    [dren_id, cisco_id, zap_id, code, nom, id],
    function(err) {
      event.reply('update-etablissement-response', {
        success: !err,
        message: err ? 'Error updating établissement' : 'Établissement updated successfully',
        error: err
      });
    }
  );
});

ipcMain.on('delete-etablissement', (event, id) => {
  db.run('DELETE FROM etablissement WHERE id = ?', [id], function(err) {
    event.reply('delete-etablissement-response', {
      success: !err,
      message: err ? 'Error deleting établissement' : 'Établissement deleted successfully',
      error: err
    });
  });
});




// CRUD Operations for Mandataire
ipcMain.on('create-mandataire', (event, data) => {
  const { 
    id, etablissement_id, nom, prenom, fonction, 
    cin, contact, adresse, email, observation 
  } = data;
  
  db.run(`
    INSERT INTO mandataire (
      id, etablissement_id, nom, prenom, fonction, 
      cin, contact, adresse, email, observation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, etablissement_id, nom, prenom, fonction, cin, contact, adresse, email, observation],
    function(err) {
      event.reply('create-mandataire-response', {
        success: !err,
        message: err ? 'Error creating mandataire' : 'Mandataire created successfully',
        error: err
      });
    }
  );
});

ipcMain.on('read-mandataire', (event) => {
  db.all(`
    SELECT mandataire.*, etablissement.nom as etablissement_nom 
    FROM mandataire 
    JOIN etablissement ON mandataire.etablissement_id = etablissement.id`,
    (err, rows) => {
      event.reply('read-mandataire-response', {
        success: !err,
        data: rows,
        error: err
      });
    }
  );
});

ipcMain.on('update-mandataire', (event, data) => {
  const { 
    id, etablissement_id, nom, prenom, fonction, 
    cin, contact, adresse, email, observation 
  } = data;
  
  db.run(`
    UPDATE mandataire 
    SET etablissement_id = ?, nom = ?, prenom = ?, fonction = ?,
        cin = ?, contact = ?, adresse = ?, email = ?, observation = ?
    WHERE id = ?`,
    [etablissement_id, nom, prenom, fonction, cin, contact, adresse, email, observation, id],
    function(err) {
      event.reply('update-mandataire-response', {
        success: !err,
        message: err ? 'Error updating mandataire' : 'Mandataire updated successfully',
        error: err
      });
    }
  );
});

ipcMain.on('delete-mandataire', (event, id) => {
  db.run('DELETE FROM mandataire WHERE id = ?',
    [id],
    function(err) {
      event.reply('delete-mandataire-response', {
        success: !err,
        message: err ? 'Error deleting mandataire' : 'Mandataire deleted successfully',
        error: err
      });
    }
  );
});

// CRUD Operations for Caisse
ipcMain.on('create-caisse', (event, data) => {
  const { 
    id, dren_id, cisco_id, zap_id, 
    etablissement_id, montant_ariary 
  } = data;
  
  db.run(`
    INSERT INTO caisse (
      id, dren_id, cisco_id, zap_id, 
      etablissement_id, montant_ariary
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, dren_id, cisco_id, zap_id, etablissement_id, montant_ariary],
    function(err) {
      event.reply('create-caisse-response', {
        success: !err,
        message: err ? 'Error creating caisse' : 'Caisse created successfully',
        error: err
      });
    }
  );
});

ipcMain.on('read-caisse', (event) => {
  db.all(`
    SELECT caisse.*, 
           dren.nom as dren_nom,
           cisco.nom as cisco_nom,
           zap.nom as zap_nom,
           etablissement.nom as etablissement_nom
    FROM caisse
    JOIN dren ON caisse.dren_id = dren.id
    JOIN cisco ON caisse.cisco_id = cisco.id
    JOIN zap ON caisse.zap_id = zap.id
    JOIN etablissement ON caisse.etablissement_id = etablissement.id`,
    (err, rows) => {
      event.reply('read-caisse-response', {
        success: !err,
        data: rows,
        error: err
      });
    }
  );
});

ipcMain.on('update-caisse', (event, data) => {
  const { 
    id, dren_id, cisco_id, zap_id, 
    etablissement_id, montant_ariary 
  } = data;
  
  db.run(`
    UPDATE caisse 
    SET dren_id = ?, cisco_id = ?, zap_id = ?,
        etablissement_id = ?, montant_ariary = ?
    WHERE id = ?`,
    [dren_id, cisco_id, zap_id, etablissement_id, montant_ariary, id],
    function(err) {
      event.reply('update-caisse-response', {
        success: !err,
        message: err ? 'Error updating caisse' : 'Caisse updated successfully',
        error: err
      });
    }
  );
});

ipcMain.on('delete-caisse', (event, id) => {
  db.run('DELETE FROM caisse WHERE id = ?',
    [id],
    function(err) {
      event.reply('delete-caisse-response', {
        success: !err,
        message: err ? 'Error deleting caisse' : 'Caisse deleted successfully',
        error: err
      });
    }
  );
});

// CRUD Operations for Rapport
// CRUD Operations for Rapport
ipcMain.on('create-rapport', (event, data) => {
  const {
    id, dren_id, cisco_id, zap_id, etablissement_id, date, 
    situation, activites, fonction, prix_unitaire, 
    quantite, total, source_financement, executeur, superviseur
  } = data;

  db.run(`
    INSERT INTO rapport (
      id, dren_id, cisco_id, zap_id, etablissement_id, date, 
      situation, activites, fonction, prix_unitaire, 
      quantite, total, source_financement, executeur, superviseur
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, dren_id, cisco_id, zap_id, etablissement_id, date, 
      situation, activites, fonction, prix_unitaire, 
      quantite, total, source_financement, executeur, superviseur
    ],
    function(err) {
      event.reply('create-rapport-response', {
        success: !err,
        message: err ? 'Error creating rapport' : 'Rapport created successfully',
        error: err
      });
    }
  );
});

ipcMain.on('read-rapport', (event) => {
  db.all(`
    SELECT 
      rapport.*, 
      dren.nom AS dren_nom, 
      cisco.nom AS cisco_nom, 
      zap.nom AS zap_nom, 
      etablissement.nom AS etablissement_nom
    FROM rapport
    JOIN dren ON rapport.dren_id = dren.id
    JOIN cisco ON rapport.cisco_id = cisco.id
    JOIN zap ON rapport.zap_id = zap.id
    JOIN etablissement ON rapport.etablissement_id = etablissement.id`,
    (err, rows) => {
      event.reply('read-rapport-response', {
        success: !err,
        data: rows,
        error: err
      });
    }
  );
});


ipcMain.on('update-rapport', (event, data) => {
  const {
    id, dren_id, cisco_id, zap_id, etablissement_id, date, 
    situation, activites, fonction, prix_unitaire, 
    quantite, total, source_financement, executeur, superviseur
  } = data;

  db.run(`
    UPDATE rapport 
    SET dren_id = ?, cisco_id = ?, zap_id = ?, 
        etablissement_id = ?, date = ?, situation = ?, 
        activites = ?, fonction = ?, prix_unitaire = ?, 
        quantite = ?, total = ?, source_financement = ?, 
        executeur = ?, superviseur = ?
    WHERE id = ?`,
    [
      dren_id, cisco_id, zap_id, etablissement_id, date, 
      situation, activites, fonction, prix_unitaire, 
      quantite, total, source_financement, executeur, superviseur, id
    ],
    function(err) {
      event.reply('update-rapport-response', {
        success: !err,
        message: err ? 'Error updating rapport' : 'Rapport updated successfully',
        error: err
      });
    }
  );
});

ipcMain.on('delete-rapport', (event, id) => {
  db.run('DELETE FROM rapport WHERE id = ?',
    [id],
    function(err) {
      event.reply('delete-rapport-response', {
        success: !err,
        message: err ? 'Error deleting rapport' : 'Rapport deleted successfully',
        error: err
      });
    }
  );
});


// Fonctions utilitaires

ipcMain.on('show-save-dialog', async (event, defaultPath) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultPath,
    filters: [
      { name: 'Excel Files', extensions: ['xlsx'] }
    ]
  });
  event.reply('save-dialog-response', result);
});
