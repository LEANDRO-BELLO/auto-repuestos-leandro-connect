const { get } = require('../database/connection');
const { verifyPassword } = require('../utils/password');
const { mapUsuario, isActiveValue } = require('./usuarios.service');

async function login({ usuario, password }) {
  if (!usuario?.trim() || !password?.trim()) {
    return {
      ok: false,
      error: 'Ingrese usuario y contraseña.'
    };
  }

  const row = await get(
    `SELECT id, nombre, usuario, password, perfil, whatsapp, activo
     FROM usuarios
     WHERE usuario = ?`,
    [usuario.trim()]
  );

  if (!row) {
    return {
      ok: false,
      error: 'Usuario o contraseña incorrectos.'
    };
  }

  if (!isActiveValue(row.activo)) {
    return {
      ok: false,
      error: 'Este usuario está inactivo.'
    };
  }

  const valid = await verifyPassword(password.trim(), row.password);
  if (!valid) {
    return {
      ok: false,
      error: 'Usuario o contraseña incorrectos.'
    };
  }

  return {
    ok: true,
    user: mapUsuario(row)
  };
}

module.exports = { login };
