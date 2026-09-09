const { query, useRemoteApi } = require('../database/postgres');

const API_BASE = String(
  process.env.ARL_API_URL ||
  process.env.API_URL ||
  'https://auto-repuestos-leandro-connect-production.up.railway.app'
).replace(/\/+$/, '');

const TIMEOUT_MS = 15000;
const LIST_TIMEOUT_MS = 5000;

let tableReady = null;

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS avisos_proximos_servicios (
  id BIGSERIAL PRIMARY KEY,
  orden_id BIGINT NOT NULL,
  numero_os TEXT,
  cliente_id BIGINT NOT NULL,
  cliente_nombre TEXT NOT NULL,
  vehiculo_id BIGINT NOT NULL,
  vehiculo_placa TEXT,
  vehiculo_marca TEXT,
  vehiculo_modelo TEXT,
  servicio_id TEXT NOT NULL,
  servicio_label TEXT NOT NULL,
  usuario_id BIGINT NOT NULL,
  usuario_nombre TEXT NOT NULL,
  usuario_login TEXT NOT NULL,
  telefono_usado TEXT,
  avisado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

const CREATE_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_avisos_proximos_vehiculo_servicio
     ON avisos_proximos_servicios (vehiculo_id, servicio_id, avisado_en DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_avisos_proximos_usuario
     ON avisos_proximos_servicios (usuario_id, avisado_en DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_avisos_proximos_cliente
     ON avisos_proximos_servicios (cliente_id, avisado_en DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_avisos_proximos_fecha
     ON avisos_proximos_servicios (avisado_en DESC)`
];

function toId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function text(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function apiHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = String(process.env.ARL_API_TOKEN || process.env.API_TOKEN || '').trim();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function mapAviso(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    ordenId: row.orden_id,
    numeroOs: row.numero_os || '',
    clienteId: row.cliente_id,
    clienteNombre: row.cliente_nombre || '',
    vehiculoId: row.vehiculo_id,
    vehiculoPlaca: row.vehiculo_placa || '',
    vehiculoMarca: row.vehiculo_marca || '',
    vehiculoModelo: row.vehiculo_modelo || '',
    servicioId: row.servicio_id,
    servicioLabel: row.servicio_label || '',
    usuarioId: row.usuario_id,
    usuarioNombre: row.usuario_nombre || '',
    usuarioLogin: row.usuario_login || '',
    telefonoUsado: row.telefono_usado || '',
    avisadoEn: row.avisado_en
  };
}

function buildRegistro(payload, sessionUser) {
  const ordenId = toId(payload?.ordenId);
  const clienteId = toId(payload?.clienteId);
  const vehiculoId = toId(payload?.vehiculoId);
  const usuarioId = toId(sessionUser?.id);
  const servicioId = text(payload?.servicioId);
  const servicioLabel = text(payload?.servicioLabel);
  const clienteNombre = text(payload?.clienteNombre);
  const usuarioNombre = text(sessionUser?.nombre);
  const usuarioLogin = text(sessionUser?.usuario);

  if (!usuarioId || !usuarioNombre || !usuarioLogin) {
    return { ok: false, error: 'Debe iniciar sesión.' };
  }

  if (!ordenId || !clienteId || !vehiculoId || !servicioId || !servicioLabel || !clienteNombre) {
    return { ok: false, error: 'Faltan datos del aviso.' };
  }

  return {
    ok: true,
    value: {
      ordenId,
      numeroOs: text(payload?.numeroOs),
      clienteId,
      clienteNombre,
      vehiculoId,
      vehiculoPlaca: text(payload?.vehiculoPlaca),
      vehiculoMarca: text(payload?.vehiculoMarca),
      vehiculoModelo: text(payload?.vehiculoModelo),
      servicioId,
      servicioLabel,
      usuarioId,
      usuarioNombre,
      usuarioLogin,
      telefonoUsado: text(payload?.telefonoUsado)
    }
  };
}

async function ensureTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await query(CREATE_TABLE_SQL);
      for (const statement of CREATE_INDEXES_SQL) {
        await query(statement);
      }
    })().catch((error) => {
      tableReady = null;
      throw error;
    });
  }

  return tableReady;
}

async function postJson(path, body, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const raw = await response.text();
    let data = null;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!response.ok || data?.ok === false) {
      const error = new Error(
        data?.error || `HTTP ${response.status}`
      );
      error.status = response.status;
      throw error;
    }

    return data || { ok: true };
  } finally {
    clearTimeout(timeout);
  }
}

async function getJson(path, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: apiHeaders(),
      signal: controller.signal
    });

    const raw = await response.text();
    let data = null;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    return data || { ok: true, items: [] };
  } finally {
    clearTimeout(timeout);
  }
}

async function insertViaPostgres(registro) {
  await ensureTable();

  const result = await query(
    `INSERT INTO avisos_proximos_servicios (
       orden_id, numero_os, cliente_id, cliente_nombre,
       vehiculo_id, vehiculo_placa, vehiculo_marca, vehiculo_modelo,
       servicio_id, servicio_label,
       usuario_id, usuario_nombre, usuario_login,
       telefono_usado
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id, orden_id, numero_os, cliente_id, cliente_nombre,
               vehiculo_id, vehiculo_placa, vehiculo_marca, vehiculo_modelo,
               servicio_id, servicio_label, usuario_id, usuario_nombre,
               usuario_login, telefono_usado, avisado_en`,
    [
      registro.ordenId,
      registro.numeroOs,
      registro.clienteId,
      registro.clienteNombre,
      registro.vehiculoId,
      registro.vehiculoPlaca,
      registro.vehiculoMarca,
      registro.vehiculoModelo,
      registro.servicioId,
      registro.servicioLabel,
      registro.usuarioId,
      registro.usuarioNombre,
      registro.usuarioLogin,
      registro.telefonoUsado
    ]
  );

  return {
    ok: true,
    aviso: mapAviso(result.rows[0])
  };
}

async function insertViaRest(registro) {
  const data = await postJson('/api/sync/aviso-proximo-servicio', {
    ordenId: registro.ordenId,
    numeroOs: registro.numeroOs,
    clienteId: registro.clienteId,
    clienteNombre: registro.clienteNombre,
    vehiculoId: registro.vehiculoId,
    vehiculoPlaca: registro.vehiculoPlaca,
    vehiculoMarca: registro.vehiculoMarca,
    vehiculoModelo: registro.vehiculoModelo,
    servicioId: registro.servicioId,
    servicioLabel: registro.servicioLabel,
    telefonoUsado: registro.telefonoUsado,
    sesion: {
      usuarioId: registro.usuarioId,
      usuarioNombre: registro.usuarioNombre,
      usuarioLogin: registro.usuarioLogin
    }
  });

  return {
    ok: true,
    aviso: data.aviso || null
  };
}

async function listarViaPostgres(keys) {
  await ensureTable();

  const params = [];
  const tuples = keys.map((key) => {
    params.push(key.vehiculoId, key.servicioId);
    return `($${params.length - 1}::bigint, $${params.length}::text)`;
  });

  const result = await query(
    `SELECT DISTINCT ON (vehiculo_id, servicio_id)
       id, orden_id, numero_os, cliente_id, cliente_nombre,
       vehiculo_id, vehiculo_placa, vehiculo_marca, vehiculo_modelo,
       servicio_id, servicio_label, usuario_id, usuario_nombre,
       usuario_login, telefono_usado, avisado_en
     FROM avisos_proximos_servicios
     WHERE (vehiculo_id, servicio_id) IN (${tuples.join(', ')})
     ORDER BY vehiculo_id, servicio_id, avisado_en DESC`,
    params
  );

  return {
    ok: true,
    items: (result.rows || []).map(mapAviso)
  };
}

async function registrarAviso(payload, sessionUser) {
  const parsed = buildRegistro(payload, sessionUser);

  if (!parsed.ok) {
    return parsed;
  }

  if (useRemoteApi) {
    try {
      return await insertViaPostgres(parsed.value);
    } catch (_error) {
      /* API REST central */
    }
  }

  try {
    return await insertViaRest(parsed.value);
  } catch (_error) {
    return {
      ok: false,
      error: 'No se pudo registrar el aviso en el servidor central.'
    };
  }
}

async function listarUltimosAvisos(keys = []) {
  const normalized = (Array.isArray(keys) ? keys : [])
    .map((key) => ({
      vehiculoId: toId(key?.vehiculoId),
      servicioId: text(key?.servicioId)
    }))
    .filter((key) => key.vehiculoId && key.servicioId);

  if (!normalized.length) {
    return { ok: true, items: [] };
  }

  if (useRemoteApi) {
    try {
      return await listarViaPostgres(normalized);
    } catch (_error) {
      /* API REST central */
    }
  }

  try {
    const data = await postJson('/api/avisos-proximos-servicios/ultimos', {
      keys: normalized
    }, LIST_TIMEOUT_MS);

    return {
      ok: true,
      items: Array.isArray(data.items) ? data.items : []
    };
  } catch (_error) {
    return { ok: true, items: [] };
  }
}

async function listarAvisos(filters = {}) {
  if (useRemoteApi) {
    try {
      await ensureTable();

      const params = [];
      const where = [];

      if (filters.desde) {
        params.push(filters.desde);
        where.push(`avisado_en >= $${params.length}::timestamptz`);
      }

      if (filters.hasta) {
        params.push(filters.hasta);
        where.push(`avisado_en <= $${params.length}::timestamptz`);
      }

      if (toId(filters.usuarioId)) {
        params.push(toId(filters.usuarioId));
        where.push(`usuario_id = $${params.length}`);
      }

      if (toId(filters.clienteId)) {
        params.push(toId(filters.clienteId));
        where.push(`cliente_id = $${params.length}`);
      }

      if (toId(filters.vehiculoId)) {
        params.push(toId(filters.vehiculoId));
        where.push(`vehiculo_id = $${params.length}`);
      }

      if (text(filters.servicioId)) {
        params.push(text(filters.servicioId));
        where.push(`servicio_id = $${params.length}`);
      }

      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const result = await query(
        `SELECT id, orden_id, numero_os, cliente_id, cliente_nombre,
                vehiculo_id, vehiculo_placa, vehiculo_marca, vehiculo_modelo,
                servicio_id, servicio_label, usuario_id, usuario_nombre,
                usuario_login, telefono_usado, avisado_en
         FROM avisos_proximos_servicios
         ${clause}
         ORDER BY avisado_en DESC
         LIMIT 1000`,
        params
      );

      return {
        ok: true,
        items: (result.rows || []).map(mapAviso)
      };
    } catch (_error) {
      /* API REST central */
    }
  }

  try {
    const params = new URLSearchParams();

    if (filters.desde) params.set('desde', filters.desde);
    if (filters.hasta) params.set('hasta', filters.hasta);
    if (toId(filters.usuarioId)) params.set('usuarioId', String(toId(filters.usuarioId)));
    if (toId(filters.clienteId)) params.set('clienteId', String(toId(filters.clienteId)));
    if (toId(filters.vehiculoId)) params.set('vehiculoId', String(toId(filters.vehiculoId)));
    if (text(filters.servicioId)) params.set('servicioId', text(filters.servicioId));

    const queryString = params.toString();
    const data = await getJson(
      `/api/avisos-proximos-servicios${queryString ? `?${queryString}` : ''}`
    );

    return {
      ok: true,
      items: Array.isArray(data.items) ? data.items : []
    };
  } catch (_error) {
    return {
      ok: false,
      error: 'No se pudo consultar el historial de avisos.',
      items: []
    };
  }
}

module.exports = {
  registrarAviso,
  listarUltimosAvisos,
  listarAvisos
};
