const { run } = require('../database/connection');
const agendamientosService = require('./agendamientos.service');
const ordenesService = require('./ordenes.service');

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function getDashboard() {
  const [agendamientos, ordenesAbiertas] = await Promise.all([
    agendamientosService.listProximosAgendamientos(12),
    ordenesService.listOrdenesAbiertasDashboard()
  ]);
  return { agendamientos, servicios: [], ordenesAbiertas };
}

async function marcarAvisado(itemId) {
  await run('INSERT INTO avisos_servicios (item_id, fecha_aviso) VALUES (?, ?) ON CONFLICT (item_id, fecha_aviso) DO NOTHING', [String(itemId), todayIso()]);
  return { ok: true };
}

module.exports = { getDashboard, marcarAvisado };





