const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { getDataDir, getDbPath } = require('../utils/paths');
const logger = require('../utils/logger');

function loadEnvFile() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env')
  ];

  try {
    const { app } = require('electron');

    if (app?.isPackaged) {
      candidates.push(
        path.join(path.dirname(app.getPath('exe')), '.env'),
        path.join(process.resourcesPath, '.env')
      );
    }
  } catch {}

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith('#')) {
        continue;
      }

      const separator = line.indexOf('=');

      if (separator <= 0) {
        continue;
      }

      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }

    console.log('[ENV] Archivo cargado:', filePath);
    break;
  }
}

loadEnvFile();

const API_URL = String(
  process.env.ARL_API_URL ||
  process.env.API_URL ||
  ''
).replace(/\/+$/, '');

const API_TOKEN = String(
  process.env.ARL_API_TOKEN ||
  process.env.API_TOKEN ||
  ''
).trim();

const useRemoteApi = Boolean(API_URL);
let dbInstance = null;

function ensureDataDir() {
  if (useRemoteApi) {
    return;
  }

  const dataDir = getDataDir();

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    logger.info(`Directorio de datos creado: ${dataDir}`);
  }
}

function getDatabase() {
  if (useRemoteApi) {
    return null;
  }

  if (!dbInstance) {
    ensureDataDir();
    dbInstance = new sqlite3.Database(getDbPath());
    dbInstance.configure('busyTimeout', 5000);
  }

  return dbInstance;
}

async function remoteRequest(operation, sql, params = []) {
  const response = await fetch(
    `${API_URL}/api/sql/${operation}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_TOKEN
          ? { Authorization: `Bearer ${API_TOKEN}` }
          : {})
      },
      body: JSON.stringify({ sql, params })
    }
  );

  const text = await response.text();
  let payload;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text || 'Respuesta inválida.' };
  }

  if (!response.ok || payload.ok === false) {
    const error = new Error(
      payload.error || `Error HTTP ${response.status}`
    );
    error.code = payload.code;
    throw error;
  }

  return payload.result;
}

function closeDatabase() {
  if (useRemoteApi) {
    return Promise.resolve();
  }

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
  if (useRemoteApi) {
    return remoteRequest('run', sql, params);
  }

  const db = getDatabase();

  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        lastID: this.lastID,
        changes: this.changes
      });
    });
  });
}

function get(sql, params = []) {
  if (useRemoteApi) {
    return remoteRequest('get', sql, params);
  }

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
  if (useRemoteApi) {
    return remoteRequest('all', sql, params);
  }

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

async function testRemoteConnection() {
  if (!useRemoteApi) {
    return { ok: true, modo: 'local' };
  }

  const response = await fetch(`${API_URL}/api/health`, {
    headers: API_TOKEN
      ? { Authorization: `Bearer ${API_TOKEN}` }
      : {}
  });

  if (!response.ok) {
    throw new Error(`API Central respondió ${response.status}`);
  }

  return response.json();
}

if (useRemoteApi) {
  testRemoteConnection()
    .then((result) => {
      console.log('[API CENTRAL]', {
        url: API_URL,
        modo: 'internet',
        banco: result.banco
      });
    })
    .catch((error) => {
      console.error(
        '[API Central] No se pudo conectar:',
        error.message
      );
    });
}

module.exports = {
  ensureDataDir,
  getDatabase,
  closeDatabase,
  run,
  get,
  all,
  useRemoteApi,
  testRemoteConnection
};
