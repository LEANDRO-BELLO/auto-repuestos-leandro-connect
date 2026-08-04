const authService = require('./auth.service');
const empresaService = require('./empresa.service');
const clientesService = require('./clientes-postgres.service');
const vehiculosService = require('./vehiculos-postgres.service');
const ordenesService = require('./ordenes.service');
const serviciosRealizadosService = require('./servicios-realizados.service');
const proximosServiciosService = require('./proximos-servicios.service');
const configEtiquetaService = require('./config-etiqueta.service');
const agendamientosService = require('./agendamientos.service');
const dashboardService = require('./dashboard.service');

module.exports = {
  authService,
  empresaService,
  clientesService,
  vehiculosService,
  ordenesService,
  serviciosRealizadosService,
  proximosServiciosService,
  configEtiquetaService,
  agendamientosService,
  dashboardService
};
