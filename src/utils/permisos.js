/**
 * Niveles y permisos centralizados.
 * El campo usuarios.perfil (TEXT) ya existe; no requiere migración.
 * El perfil legado "Usuario" se trata como Operador.
 */

const PERFILES = {
  ADMINISTRADOR: 'Administrador',
  SUPERVISOR: 'Supervisor',
  OPERADOR: 'Operador'
};

const PERMISSIONS = {
  MENU_INICIO: 'menu.inicio',
  MENU_CLIENTES: 'menu.clientes',
  MENU_VEHICULOS: 'menu.vehiculos',
  MENU_ORDENES: 'menu.ordenes',
  MENU_AGENDAMIENTOS: 'menu.agendamientos',
  MENU_SERVICIOS: 'menu.servicios',
  MENU_PROXIMOS: 'menu.proximos',
  MENU_EMPRESA: 'menu.empresa',
  MENU_CONFIG: 'menu.config',
  MENU_USUARIOS: 'menu.usuarios',
  MENU_REPORTES: 'menu.reportes',
  AVISAR_CLIENTE: 'avisar.cliente',
  ELIMINAR_ORDEN: 'eliminar.orden',
  ELIMINAR_CLIENTE: 'eliminar.cliente',
  ELIMINAR_VEHICULO: 'eliminar.vehiculo'
};

const OPERATIVO = [
  PERMISSIONS.MENU_INICIO,
  PERMISSIONS.MENU_CLIENTES,
  PERMISSIONS.MENU_VEHICULOS,
  PERMISSIONS.MENU_ORDENES,
  PERMISSIONS.MENU_AGENDAMIENTOS,
  PERMISSIONS.MENU_SERVICIOS,
  PERMISSIONS.MENU_PROXIMOS,
  PERMISSIONS.AVISAR_CLIENTE
];

const PERMISOS_POR_PERFIL = {
  [PERFILES.ADMINISTRADOR]: [
    ...OPERATIVO,
    PERMISSIONS.MENU_EMPRESA,
    PERMISSIONS.MENU_CONFIG,
    PERMISSIONS.MENU_USUARIOS,
    PERMISSIONS.MENU_REPORTES,
    PERMISSIONS.ELIMINAR_ORDEN,
    PERMISSIONS.ELIMINAR_CLIENTE,
    PERMISSIONS.ELIMINAR_VEHICULO
  ],
  [PERFILES.SUPERVISOR]: [
    ...OPERATIVO,
    PERMISSIONS.MENU_REPORTES
  ],
  [PERFILES.OPERADOR]: [
    ...OPERATIVO
  ]
};

const PERFIL_LEGADO = {
  Usuario: PERFILES.OPERADOR
};

const ROLES = [PERFILES.ADMINISTRADOR, PERFILES.SUPERVISOR, PERFILES.OPERADOR];

function normalizePerfil(perfil) {
  const value = String(perfil || '').trim();

  if (PERMISOS_POR_PERFIL[value]) {
    return value;
  }

  return PERFIL_LEGADO[value] || PERFILES.OPERADOR;
}

function listPermissions(perfil) {
  const normalized = normalizePerfil(perfil);
  return [...(PERMISOS_POR_PERFIL[normalized] || PERMISOS_POR_PERFIL[PERFILES.OPERADOR])];
}

function hasPermission(perfilOrUser, permission) {
  const perfil = perfilOrUser && typeof perfilOrUser === 'object'
    ? perfilOrUser.perfil
    : perfilOrUser;

  return listPermissions(perfil).includes(permission);
}

module.exports = {
  PERFILES,
  PERMISSIONS,
  ROLES,
  PERFIL_LEGADO,
  normalizePerfil,
  listPermissions,
  hasPermission
};
