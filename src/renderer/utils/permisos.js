/** Keys must stay in sync with src/utils/permisos.js (source of truth). */
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

export function hasPermission(user, permission) {
  if (!user || !permission) {
    return false;
  }

  if (Array.isArray(user.permisos)) {
    return user.permisos.includes(permission);
  }

  return false;
}
