const { get } = require('../database/connection');

/**
 * Servicio de autenticación.
 * Punto de extensión para reglas de negocio futuras (hash, bloqueo, auditoría, etc.).
 */
async function login({ usuario, password }) {
  if (!usuario?.trim() || !password?.trim()) {
    return {
      ok: false,
      error: 'Ingrese usuario y contraseña.'
    };
  }

  const user = await get(
    `SELECT id, nombre, usuario, perfil
     FROM usuarios
     WHERE usuario = ? AND password = ? AND activo = 1`,
    [usuario.trim(), password.trim()]
  );

  if (!user) {
    return {
      ok: false,
      error: 'Usuario o contraseña incorrectos.'
    };
  }

  return { ok: true, user };
}

module.exports = { login };
