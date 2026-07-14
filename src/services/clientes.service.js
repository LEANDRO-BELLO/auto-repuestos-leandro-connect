const { get, all, run } = require('../database/connection');
const { syncCliente } = require('./railway-sync.service');

async function generateCodigo() {
  const row = await get(
    "SELECT codigo FROM clientes WHERE codigo LIKE 'CLI-%' ORDER BY CAST(SUBSTR(codigo, 5) AS INTEGER) DESC LIMIT 1"
  );

  if (!row) return 'CLI-0001';

  const next = parseInt(row.codigo.replace('CLI-', ''), 10) + 1;
  return `CLI-${String(next).padStart(4, '0')}`;
}

function mapCliente(row) {
  if (!row) return null;

  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    documento: row.documento || '',
    telefono: row.telefono || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    direccion: row.direccion || '',
    ciudad: row.ciudad || '',
    observaciones: row.observaciones || '',
    ultimaVisita: row.ultima_visita || null,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en
  };
}

async function syncClienteRailway(cliente) {
  try {
    await syncCliente(cliente);
    console.log('Cliente sincronizado con Railway:', cliente.nombre);
    return true;
  } catch (error) {
    console.error('No se pudo sincronizar el cliente:', error.message);
    return false;
  }
}

async function listClientes(search = '') {
  const term = search.trim();

  if (!term) {
    const rows = await all(
      `SELECT id, codigo, nombre, documento, telefono, whatsapp, email,
              direccion, ciudad, observaciones, ultima_visita, creado_en, actualizado_en
       FROM clientes
       ORDER BY nombre COLLATE NOCASE ASC`
    );
    return rows.map(mapCliente);
  }

  const like = `%${term}%`;
  const rows = await all(
    `SELECT id, codigo, nombre, documento, telefono, whatsapp, email,
            direccion, ciudad, observaciones, ultima_visita, creado_en, actualizado_en
     FROM clientes
     WHERE codigo LIKE ? OR nombre LIKE ? OR documento LIKE ? OR telefono LIKE ?
        OR whatsapp LIKE ? OR email LIKE ? OR ciudad LIKE ?
     ORDER BY nombre COLLATE NOCASE ASC`,
    [like, like, like, like, like, like, like]
  );

  return rows.map(mapCliente);
}

async function getCliente(id) {
  const row = await get(
    `SELECT id, codigo, nombre, documento, telefono, whatsapp, email,
            direccion, ciudad, observaciones, ultima_visita, creado_en, actualizado_en
     FROM clientes WHERE id = ?`,
    [id]
  );
  return mapCliente(row);
}

async function createCliente(data) {
  const nombre = data.nombre?.trim();
  if (!nombre) return { ok: false, error: 'El nombre es obligatorio.' };

  const codigo = await generateCodigo();
  const result = await run(
    `INSERT INTO clientes (
       codigo, nombre, documento, telefono, whatsapp, email,
       direccion, ciudad, observaciones, ultima_visita, actualizado_en
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      codigo,
      nombre,
      data.documento?.trim() || null,
      data.telefono?.trim() || null,
      data.whatsapp?.trim() || null,
      data.email?.trim() || null,
      data.direccion?.trim() || null,
      data.ciudad?.trim() || null,
      data.observaciones?.trim() || null,
      data.ultimaVisita || null
    ]
  );

  const cliente = await getCliente(result.lastID);
  await syncClienteRailway(cliente);
  return { ok: true, cliente };
}

async function updateCliente(id, data) {
  const existing = await getCliente(id);
  if (!existing) return { ok: false, error: 'Cliente no encontrado.' };

  const nombre = data.nombre?.trim();
  if (!nombre) return { ok: false, error: 'El nombre es obligatorio.' };

  await run(
    `UPDATE clientes SET
       nombre = ?, documento = ?, telefono = ?, whatsapp = ?, email = ?,
       direccion = ?, ciudad = ?, observaciones = ?, actualizado_en = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      nombre,
      data.documento?.trim() || null,
      data.telefono?.trim() || null,
      data.whatsapp?.trim() || null,
      data.email?.trim() || null,
      data.direccion?.trim() || null,
      data.ciudad?.trim() || null,
      data.observaciones?.trim() || null,
      id
    ]
  );

  const cliente = await getCliente(id);
  await syncClienteRailway(cliente);
  return { ok: true, cliente };
}

async function deleteCliente(id) {
  const existing = await getCliente(id);
  if (!existing) return { ok: false, error: 'Cliente no encontrado.' };

  await run('DELETE FROM clientes WHERE id = ?', [id]);
  return { ok: true };
}

module.exports = {
  listClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
  syncClienteRailway
};
