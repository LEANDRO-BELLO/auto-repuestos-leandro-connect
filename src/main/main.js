const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbInit = path.join(__dirname, '../database/init-db.js');
require(dbInit);

const dbPath = path.join(__dirname, '../../data/auto_repuestos_leandro.db');

function openDb() {
  return new sqlite3.Database(dbPath);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('login', async (_, { usuario, password }) => {
  const db = openDb();
  return new Promise((resolve) => {
    db.get('SELECT id, nombre, usuario, perfil FROM usuarios WHERE usuario = ? AND password = ? AND activo = 1', [usuario, password], (err, row) => {
      db.close();
      if (err || !row) resolve({ ok: false, error: 'Usuario o contraseña incorrectos' });
      else resolve({ ok: true, user: row });
    });
  });
});

ipcMain.handle('empresa:get', async () => {
  const db = openDb();
  return new Promise((resolve) => {
    db.get('SELECT * FROM empresa WHERE id = 1', [], (err, row) => {
      db.close();
      resolve(row || null);
    });
  });
});

ipcMain.handle('clientes:list', async (_, query = '') => {
  const db = openDb();
  const q = `%${query}%`;
  return new Promise((resolve) => {
    db.all('SELECT * FROM clientes WHERE activo = 1 AND (nombre LIKE ? OR telefono LIKE ? OR whatsapp LIKE ? OR documento LIKE ?) ORDER BY nombre', [q, q, q, q], (err, rows) => {
      db.close();
      resolve(rows || []);
    });
  });
});

ipcMain.handle('clientes:create', async (_, cliente) => {
  const db = openDb();
  return new Promise((resolve) => {
    db.run(`INSERT INTO clientes (nombre, documento, telefono, whatsapp, email, direccion) VALUES (?, ?, ?, ?, ?, ?)`,
      [cliente.nombre, cliente.documento || '', cliente.telefono || '', cliente.whatsapp || '', cliente.email || '', cliente.direccion || ''],
      function(err) {
        db.close();
        if (err) resolve({ ok: false, error: err.message });
        else resolve({ ok: true, id: this.lastID });
      });
  });
});

ipcMain.handle('vehiculos:list', async (_, query = '') => {
  const db = openDb();
  const q = `%${query}%`;
  return new Promise((resolve) => {
    db.all(`SELECT v.*, c.nombre AS cliente_nombre FROM vehiculos v JOIN clientes c ON c.id = v.cliente_id
            WHERE v.activo = 1 AND (v.placa LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ? OR c.nombre LIKE ?)
            ORDER BY v.creado_en DESC`, [q, q, q, q], (err, rows) => {
      db.close();
      resolve(rows || []);
    });
  });
});

ipcMain.handle('vehiculos:create', async (_, v) => {
  const db = openDb();
  const qrId = `ARL-${Date.now()}`;
  return new Promise((resolve) => {
    db.run(`INSERT INTO vehiculos (cliente_id, marca, modelo, anho, motor, combustible, placa, chassi, km_actual, qr_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.cliente_id, v.marca || '', v.modelo || '', v.anho || '', v.motor || '', v.combustible || '', v.placa || '', v.chassi || '', v.km_actual || 0, qrId],
      function(err) {
        db.close();
        if (err) resolve({ ok: false, error: err.message });
        else resolve({ ok: true, id: this.lastID, qr_id: qrId });
      });
  });
});
