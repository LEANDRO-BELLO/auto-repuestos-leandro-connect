const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { getDataDir, getDbPath } = require('../utils/paths');
const logger = require('../utils/logger');

let dbInstance = null;

function ensureDataDir() {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    logger.info(`Directorio de datos creado: ${dataDir}`);
  }
}

function getDatabase() {
  if (!dbInstance) {
    ensureDataDir();
    dbInstance = new sqlite3.Database(getDbPath());
    dbInstance.configure('busyTimeout', 5000);
  }
  return dbInstance;
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (!dbInstance) {
      resolve();
      return;
    }

    dbInstance.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      dbInstance = null;
      resolve();
    });
  });
}

function run(sql, params = []) {
  const db = getDatabase();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  const db = getDatabase();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  const db = getDatabase();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

module.exports = {
  ensureDataDir,
  getDatabase,
  closeDatabase,
  run,
  get,
  all
};
