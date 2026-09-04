/** Keys and matrix must stay in sync with src/utils/permisos.js (source of truth). */
export const PERMISSIONS = {
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

export const ROLES = ['Administrador', 'Supervisor', 'Operador'];

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
  Administrador: [
    ...OPERATIVO,
    PERMISSIONS.MENU_EMPRESA,
    PERMISSIONS.MENU_CONFIG,
    PERMISSIONS.MENU_USUARIOS,
    PERMISSIONS.MENU_REPORTES,
    PERMISSIONS.ELIMINAR_ORDEN,
    PERMISSIONS.ELIMINAR_CLIENTE,
    PERMISSIONS.ELIMINAR_VEHICULO
  ],
  Supervisor: [
    ...OPERATIVO,
    PERMISSIONS.MENU_REPORTES
  ],
  Operador: [
    ...OPERATIVO
  ]
};

const PERFIL_LEGADO = {
  Usuario: 'Operador'
};

function normalizePerfil(perfil) {
  const value = String(perfil || '').trim();

  if (PERMISOS_POR_PERFIL[value]) {
    return value;
  }

  return PERFIL_LEGADO[value] || 'Operador';
}

function listPermissions(perfil) {
  const normalized = normalizePerfil(perfil);
  return [...(PERMISOS_POR_PERFIL[normalized] || PERMISOS_POR_PERFIL.Operador)];
}

export function hasPermission(user, permission) {
  if (!user || !permission) {
    return false;
  }

  return listPermissions(user.perfil).includes(permission);
}
