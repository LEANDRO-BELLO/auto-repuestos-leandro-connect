const { get, all, run } = require('../database/connection');
const { hashPassword, looksLikeHash } = require('../utils/password');
const { ROLES, PERFILES, normalizePerfil } = require('../utils/permisos');
const MIN_PASSWORD_LENGTH = 4;

function isActiveValue(value) {
  return value === 1 || value === true || value === '1' || value === 't';
}

function mapUsuario(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    nombre: row.nombre,
    usuario: row.usuario,
    perfil: normalizePerfil(row.perfil),
    whatsapp: row.whatsapp || '',
    activo: isActiveValue(row.activo) ? 1 : 0,
    creadoEn: row.creado_en || null
  };
}

function normalizeWhatsApp(value) {
  return String(value || '').trim();
}

function isValidWhatsApp(value) {
  const digits = normalizeWhatsApp(value).replace(/\D/g, '');
  return digits.length >= 8;
}

function normalizeRol(value) {
  const rol = String(value || '').trim();

  if (ROLES.includes(rol)) {
    return rol;
  }

  if (rol === 'Usuario') {
    return PERFILES.OPERADOR;
  }

  return null;
}

async function countActiveAdmins(excludeId = null) {
  const rows = await all(
    `SELECT id, perfil, activo FROM usuarios WHERE perfil = 'Administrador'`
  );

  return (rows || []).filter((row) => {
    if (!isActiveValue(row.activo)) {
      return false;
    }
    if (excludeId && Number(row.id) === Number(excludeId)) {
      return false;
    }
    return true;
  }).length;
}

async function listUsuarios(search = '') {
  const term = String(search || '').trim();

  if (!term) {
    const rows = await all(
      `SELECT id, nombre, usuario, perfil, whatsapp, activo, creado_en
       FROM usuarios
       ORDER BY LOWER(nombre) ASC, id ASC`
    );
    return (rows || []).map(mapUsuario);
  }

  const like = `%${term}%`;
  const rows = await all(
    `SELECT id, nombre, usuario, perfil, whatsapp, activo, creado_en
     FROM usuarios
     WHERE LOWER(nombre) LIKE LOWER(?)
        OR LOWER(usuario) LIKE LOWER(?)
        OR LOWER(perfil) LIKE LOWER(?)
        OR COALESCE(whatsapp, '') LIKE ?
     ORDER BY LOWER(nombre) ASC, id ASC`,
    [like, like, like, like]
  );

  return (rows || []).map(mapUsuario);
}

async function getUsuario(id) {
  const row = await get(
    `SELECT id, nombre, usuario, perfil, whatsapp, activo, creado_en
     FROM usuarios
     WHERE id = ?`,
    [id]
  );

  return mapUsuario(row);
}

function validatePayload(data, { requirePassword }) {
  const nombre = String(data?.nombre || '').trim();
  const usuario = String(data?.usuario || '').trim();
  const password = String(data?.password || '');
  const whatsapp = normalizeWhatsApp(data?.whatsapp);
  const perfil = normalizeRol(data?.perfil);
  const activo = data?.activo === 0 || data?.activo === false || data?.activo === '0'
    ? 0
    : 1;

  if (!nombre) {
    return { ok: false, error: 'El nombre es obligatorio.' };
  }

  if (!usuario) {
    return { ok: false, error: 'El usuario es obligatorio.' };
  }

  if (/\s/.test(usuario)) {
    return { ok: false, error: 'El usuario no puede contener espacios.' };
  }

  if (!perfil) {
    return { ok: false, error: 'Seleccione un rol válido.' };
  }

  if (!isValidWhatsApp(whatsapp)) {
    return { ok: false, error: 'Ingrese un WhatsApp con código de país. Ej: +595 981 123456.' };
  }

  if (requirePassword || password.trim()) {
    if (password.trim().length < MIN_PASSWORD_LENGTH) {
      return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
    }
  }

  return {
    ok: true,
    value: {
      nombre,
      usuario,
      password: password.trim(),
      whatsapp,
      perfil,
      activo
    }
  };
}

async function createUsuario(data) {
  const parsed = validatePayload(data, { requirePassword: true });
  if (!parsed.ok) {
    return parsed;
  }

  const existing = await get(
    'SELECT id FROM usuarios WHERE usuario = ?',
    [parsed.value.usuario]
  );

  if (existing) {
    return { ok: false, error: 'Ya existe un usuario con ese nombre de acceso.' };
  }

  const hashed = await hashPassword(parsed.value.password);
  await run(
    `INSERT INTO usuarios (nombre, usuario, password, perfil, activo, whatsapp)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      parsed.value.nombre,
      parsed.value.usuario,
      hashed,
      parsed.value.perfil,
      parsed.value.activo,
      parsed.value.whatsapp
    ]
  );

  const created = await get(
    'SELECT id FROM usuarios WHERE usuario = ?',
    [parsed.value.usuario]
  );

  return { ok: true, id: created?.id ?? null };
}

async function updateUsuario(id, data, { currentUserId } = {}) {
  const current = await getUsuario(id);
  if (!current) {
    return { ok: false, error: 'Usuario no encontrado.' };
  }

  const parsed = validatePayload(data, { requirePassword: false });
  if (!parsed.ok) {
    return parsed;
  }

  const existing = await get(
    'SELECT id FROM usuarios WHERE usuario = ? AND id <> ?',
    [parsed.value.usuario, id]
  );

  if (existing) {
    return { ok: false, error: 'Ya existe un usuario con ese nombre de acceso.' };
  }

  if (Number(id) === Number(currentUserId) && parsed.value.activo !== 1) {
    return { ok: false, error: 'No puede desactivar su propio usuario.' };
  }

  if (
    current.perfil === 'Administrador' &&
    (parsed.value.perfil !== 'Administrador' || parsed.value.activo !== 1)
  ) {
    const remaining = await countActiveAdmins(id);
    if (remaining < 1) {
      return { ok: false, error: 'Debe permanecer al menos un administrador activo.' };
    }
  }

  const fields = [
    'nombre = ?',
    'usuario = ?',
    'perfil = ?',
    'activo = ?',
    'whatsapp = ?'
  ];
  const params = [
    parsed.value.nombre,
    parsed.value.usuario,
    parsed.value.perfil,
    parsed.value.activo,
    parsed.value.whatsapp
  ];

  if (parsed.value.password) {
    fields.push('password = ?');
    params.push(await hashPassword(parsed.value.password));
  }

  params.push(id);

  await run(
    `UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  return { ok: true };
}

async function setUsuarioActivo(id, activo, { currentUserId } = {}) {
  const current = await getUsuario(id);
  if (!current) {
    return { ok: false, error: 'Usuario no encontrado.' };
  }

  const nextActivo = activo === 0 || activo === false || activo === '0' ? 0 : 1;

  if (Number(id) === Number(currentUserId) && nextActivo !== 1) {
    return { ok: false, error: 'No puede desactivar su propio usuario.' };
  }

  if (current.perfil === 'Administrador' && nextActivo !== 1) {
    const remaining = await countActiveAdmins(id);
    if (remaining < 1) {
      return { ok: false, error: 'Debe permanecer al menos un administrador activo.' };
    }
  }

  await run('UPDATE usuarios SET activo = ? WHERE id = ?', [nextActivo, id]);
  return { ok: true };
}

module.exports = {
  ROLES,
  listUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  setUsuarioActivo,
  mapUsuario,
  isActiveValue,
  looksLikeHash
};
