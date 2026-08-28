const { run } = require('../database/connection');
const agendamientosService = require('./agendamientos.service');
const ordenesService = require('./ordenes.service');

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function timed(label, fn) {
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    console.log(`[PERF] ${label} ${Math.round(performance.now() - t0)}ms`);
  }
}

async function getDashboard() {
  const t0 = performance.now();
  const [agendamientos, ordenesAbiertas] = await Promise.all([
    timed('dashboard.agendamientos', () => agendamientosService.listProximosAgendamientos(12)),
    timed('dashboard.ordenes-abiertas', () => ordenesService.listOrdenesAbiertasDashboard())
  ]);
  console.log(`[PERF] dashboard.getDashboard.total ${Math.round(performance.now() - t0)}ms agendamientos=${agendamientos.length} ordenesAbiertas=${ordenesAbiertas.length} servicios=0`);
  return { agendamientos, servicios: [], ordenesAbiertas };
}

async function marcarAvisado(itemId) {
  await run('INSERT INTO avisos_servicios (item_id, fecha_aviso) VALUES (?, ?) ON CONFLICT (item_id, fecha_aviso) DO NOTHING', [String(itemId), todayIso()]);
  return { ok: true };
}

module.exports = { getDashboard, marcarAvisado };





