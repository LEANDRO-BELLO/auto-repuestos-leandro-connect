const { get, run } = require('../database/connection');
const proximosServiciosService = require('./proximos-servicios.service');
const agendamientosService = require('./agendamientos.service');
const ordenesService = require('./ordenes.service');

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function within15Days(item) {
  if (item.estado === 'Vencido') return true;
  if (item.estado !== 'PrÃ³ximo') return false;
  if (!item.fechaVencimiento) return true;
  const today = new Date(`${todayIso()}T12:00:00`);
  const due = new Date(`${item.fechaVencimiento}T12:00:00`);
  const days = Math.ceil((due - today) / 86400000);
  return days >= 0 && days <= 15;
}

async function getDashboard() {
  const [agendamientos, proximos, ordenes] = await Promise.all([
    agendamientosService.listProximosAgendamientos(12),
    proximosServiciosService.listProximosServicios({}),
    ordenesService.listOrdenes('')
  ]);
  const date = todayIso();
  const servicios = [];
  for (const item of proximos.items.filter(within15Days)) {
    const aviso = await get('SELECT id FROM avisos_servicios WHERE item_id = ? AND fecha_aviso = ?', [item.id, date]);
    if (!aviso) servicios.push(item);
    if (servicios.length >= 20) break;
  }
  const ordenesAbiertas = ordenes.filter((orden) => orden.estado === 'Abierta' || orden.estado === 'En proceso').slice(0, 20);
  return { agendamientos, servicios, ordenesAbiertas };
}

async function marcarAvisado(itemId) {
  await run('INSERT INTO avisos_servicios (item_id, fecha_aviso) VALUES (?, ?) ON CONFLICT (item_id, fecha_aviso) DO NOTHING', [String(itemId), todayIso()]);
  return { ok: true };
}

module.exports = { getDashboard, marcarAvisado };





