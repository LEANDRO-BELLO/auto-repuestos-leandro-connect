const fs = require('fs');
const path = require('path');

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
    return filePath;
  }

  return null;
}

loadEnvFile();

const { Pool } = require('pg');

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

function remoteHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (API_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`;
  }

  return headers;
}

async function remoteRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...remoteHeaders(),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text || 'Respuesta inválida de la API.' };
  }

  if (!response.ok || payload?.ok === false) {
    const error = new Error(
      payload?.error ||
      `Error HTTP ${response.status}`
    );

    error.status = response.status;
    error.code = payload?.code;
    error.detail = payload?.detail;
    throw error;
  }

  return payload;
}

async function remoteQuery(text, params = [], transactionId = null) {
  const payload = await remoteRequest('/api/db/query', {
    method: 'POST',
    body: JSON.stringify({
      text,
      params,
      transactionId
    })
  });

  return {
    rows: payload.rows || [],
    rowCount: Number(payload.rowCount || 0),
    command: payload.command || null,
    fields: payload.fields || []
  };
}

function createRemoteClient(transactionId) {
  let released = false;

  return {
    async query(text, params = []) {
      if (released) {
        throw new Error('Cliente PostgreSQL remoto ya liberado.');
      }

      return remoteQuery(text, params, transactionId);
    },

    async release() {
      if (released) {
        return;
      }

      released = true;

      try {
        await remoteRequest(
          `/api/db/transactions/${encodeURIComponent(transactionId)}`,
          { method: 'DELETE' }
        );
      } catch (error) {
        console.error(
          '[API Central] No se pudo liberar la transacción:',
          error.message
        );
      }
    }
  };
}

const localPool = useRemoteApi
  ? null
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      database:
        process.env.PGDATABASE ||
        'auto_repuestos_leandro',
      user: process.env.PGUSER || 'postgres',
      password:
        process.env.PGPASSWORD ||
        'Leandro@2026'
    });

const pool = useRemoteApi
  ? {
      query: remoteQuery,
      async connect() {
        const payload = await remoteRequest(
          '/api/db/transactions',
          { method: 'POST' }
        );

        return createRemoteClient(payload.transactionId);
      },
      on() {},
      async end() {}
    }
  : localPool;

if (useRemoteApi) {
  remoteRequest('/api/health')
    .then((payload) => {
      console.log('[API CENTRAL]', {
        url: API_URL,
        banco: payload.banco,
        modo: 'internet'
      });
    })
    .catch((error) => {
      console.error(
        '[API Central] No se pudo conectar:',
        error.message
      );
    });
} else {
  localPool
    .query(
      'SELECT current_database(), inet_server_addr(), inet_server_port()'
    )
    .then((result) => {
      console.log('[POSTGRES]', {
        ...result.rows[0],
        modo: 'local'
      });
    })
    .catch(console.error);

  localPool.on('error', (error) => {
    console.error(
      '[PostgreSQL] Error inesperado:',
      error
    );
  });
}

async function query(text, params = []) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

async function testConnection() {
  const result = await query(
    'SELECT NOW() AS fecha_servidor, current_database() AS banco'
  );

  return {
    ...result.rows[0],
    modo: useRemoteApi ? 'internet' : 'local'
  };
}

async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool,
  useRemoteApi
};
