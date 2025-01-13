const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

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
    zap_id TEXT NOT NULL,
    code TEXT NOT NULL,
    nom TEXT NOT NULL,
    FOREIGN KEY (zap_id) REFERENCES zap(id)
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
    FOREIGN KEY (etablissement_id) REFERENCES etablissement(id)
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
  const { id, zap_id, code, nom } = data;
  db.run('INSERT INTO etablissement (id, zap_id, code, nom) VALUES (?, ?, ?, ?)',
    [id, zap_id, code, nom],
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
    SELECT etablissement.*, zap.nom as zap_nom 
    FROM etablissement 
    JOIN zap ON etablissement.zap_id = zap.id`,
    (err, rows) => {
      event.reply('read-etablissement-response', {
        success: !err,
        data: rows,
        error: err
      });
    }
  );
});

ipcMain.on('update-etablissement', (event, data) => {
  const { id, zap_id, code, nom } = data;
  db.run('UPDATE etablissement SET zap_id = ?, code = ?, nom = ? WHERE id = ?',
    [zap_id, code, nom, id],
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
  db.run('DELETE FROM etablissement WHERE id = ?',
    [id],
    function(err) {
      event.reply('delete-etablissement-response', {
        success: !err,
        message: err ? 'Error deleting établissement' : 'Établissement deleted successfully',
        error: err
      });
    }
  );
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
ipcMain.on('create-rapport', (event, data) => {
  const {
    id, etablissement_id, date, situation, activites,
    fonction, prix_unitaire, quantite, total,
    source_financement, executeur, superviseur
  } = data;
  
  db.run(`
    INSERT INTO rapport (
      id, etablissement_id, date, situation, activites,
      fonction, prix_unitaire, quantite, total,
      source_financement, executeur, superviseur
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, etablissement_id, date, situation, activites,
      fonction, prix_unitaire, quantite, total,
      source_financement, executeur, superviseur
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
    SELECT rapport.*, etablissement.nom as etablissement_nom
    FROM rapport
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
    id, etablissement_id, date, situation, activites,
    fonction, prix_unitaire, quantite, total,
    source_financement, executeur, superviseur
  } = data;
  
  db.run(`
    UPDATE rapport 
    SET etablissement_id = ?, date = ?, situation = ?,
        activites = ?, fonction = ?, prix_unitaire = ?,
        quantite = ?, total = ?, source_financement = ?,
        executeur = ?, superviseur = ?
    WHERE id = ?`,
    [
      etablissement_id, date, situation, activites,
      fonction, prix_unitaire, quantite, total,
      source_financement, executeur, superviseur, id
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

// Fonctions utilitaires pour la recherche

// Recherche DREN par nom
ipcMain.on('search-dren', (event, searchTerm) => {
  db.all('SELECT * FROM dren WHERE nom LIKE ?',
    [`%${searchTerm}%`],
    (err, rows) => {
      event.reply('search-dren-response', {
        success: !err,
        data: rows,
        error: err
      });
    }
  );
});

// Recherche CISCO par DREN
ipcMain.on('search-cisco-by-dren', (event, drenId) => {
  db.all('SELECT * FROM cisco WHERE dren_id = ?',
    [drenId],
    (err, rows) => {
      event.reply('search-cisco-by-dren-response', {
        success: !err,
        data: rows,
        error: err
      });
    }
  );
});

// Recherche ZAP par CISCO
ipcMain.on('search-zap-by-cisco', (event, ciscoId) => {
  db.all('SELECT * FROM zap WHERE cisco_id = ?',
    [ciscoId],
    (err, rows) => {
      event.reply('search-zap-by-cisco-response', {
        success: !err,
        data: rows,
        error: err
      });
    }
  );
});

// Recherche Établissement par ZAP
ipcMain.on('search-etablissement-by-zap', (event, zapId) => {
  db.all('SELECT * FROM etablissement WHERE zap_id = ?',
    [zapId],
    (err, rows) => {
      event.reply('search-etablissement-by-zap-response', {
        success: !err,
        data: rows,
        error: err
      });
    }
  );
});

// Recherche Mandataire par Établissement
ipcMain.on('search-mandataire-by-etablissement', (event, etablissementId) => {
  db.all('SELECT * FROM mandataire WHERE etablissement_id = ?',
    [etablissementId],
    (err, rows) => {
      event.reply('search-mandataire-by-etablissement-response', {
        success: !err,
        data: rows,
        error: err
      });
    }
  );
});

// Recherche Caisse par établissement
ipcMain.on('search-caisse-by-etablissement', (event, etablissementId) => {
  db.all('SELECT * FROM caisse WHERE etablissement_id = ?',
    [etablissementId],
    (err, rows) => {
      event.reply('search-caisse-by-etablissement-response', {
        success: !err,
        data: rows,
        error: err
      });
    }
  );
});

// Recherche Rapport par établissement et période
ipcMain.on('search-rapport-by-etablissement-date', (event, { etablissementId, startDate, endDate }) => {
  db.all(`
    SELECT * FROM rapport 
    WHERE etablissement_id = ? 
    AND date BETWEEN ? AND ?`,
    [etablissementId, startDate, endDate],
    (err, rows) => {
      event.reply('search-rapport-by-etablissement-date-response', {
        success: !err,
        data: rows,
        error: err
      });
    }
  );
});