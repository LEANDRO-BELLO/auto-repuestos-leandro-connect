import { escapeHtml } from '../utils/dom.js';
import { SERVICIOS_CATALOGO } from '../utils/servicios-labels.js';
import { exportRelatorioProximosPdf } from '../utils/relatorio-proximos-document.js';
import { exportRelatorioServiciosPdf } from '../utils/relatorio-servicios-document.js';
import { exportRelatorioClientesVehiculosPdf } from '../utils/relatorio-clientes-vehiculos-document.js';
import { exportRelatorioServiciosPorTipoPdf } from '../utils/relatorio-servicios-por-tipo-document.js';
import { exportRelatorioHistorialVehiculoPdf } from '../utils/relatorio-historial-vehiculo-document.js';

function renderTiposHtml() {
  return `
    <div class="relatorios-page">
      <section class="dashboard-panel">
        <div class="dashboard-panel__body">
          <h2>Tipos de reportes</h2>
          <p>Seleccione el reporte que desea consultar.</p>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-top:20px;">
            <button type="button" class="btn-ghost" data-reporte="servicios">Servicios realizados</button>
            <button type="button" class="btn-ghost" data-reporte="proximos">Próximos servicios</button>
            <button type="button" class="btn-ghost" data-reporte="clientes">Clientes y vehículos</button>
            <button type="button" class="btn-ghost" data-reporte="servicios-tipo">Servicios por tipo</button>
            <button type="button" class="btn-ghost" data-reporte="historial">Historial por vehículo</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderProximosReporteHtml() {
  return `
    <div class="relatorios-page">
      <section class="dashboard-panel">
        <div class="dashboard-panel__body">
          <h2>Reporte de próximos servicios</h2>

          <div class="servicios-filters" style="margin-top:20px;">
            <div class="servicios-filter">
              <label for="relatorios-fecha-desde">Fecha desde</label>
              <input type="date" id="relatorios-fecha-desde" />
            </div>
            <div class="servicios-filter">
              <label for="relatorios-fecha-hasta">Fecha hasta</label>
              <input type="date" id="relatorios-fecha-hasta" />
            </div>
            <button type="button" class="btn-primary" data-action="generar-pdf">Generar PDF</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

async function generarPdfProximos(container) {
  const fechaDesde = container.querySelector('#relatorios-fecha-desde')?.value || '';
  const fechaHasta = container.querySelector('#relatorios-fecha-hasta')?.value || '';
  const button = container.querySelector('[data-action="generar-pdf"]');

  if (!fechaDesde || !fechaHasta) {
    window.alert('Seleccione Fecha desde y Fecha hasta.');
    return;
  }

  if (fechaDesde > fechaHasta) {
    window.alert('La fecha desde no puede ser posterior a la fecha hasta.');
    return;
  }

  const originalLabel = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = 'Generando PDF...';
  }

  try {
    await exportRelatorioProximosPdf({ fechaDesde, fechaHasta });
  } catch (error) {
    window.alert(error.message || 'No se pudo generar el PDF.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel || 'Generar PDF';
    }
  }
}

function showProximosReporte(container) {
  container.innerHTML = renderProximosReporteHtml();
  container.querySelector('[data-action="generar-pdf"]')?.addEventListener('click', () => {
    generarPdfProximos(container);
  });
}

function renderServiciosReporteHtml() {
  return `
    <div class="relatorios-page">
      <section class="dashboard-panel">
        <div class="dashboard-panel__body">
          <h2>Reporte de servicios realizados</h2>

          <div class="servicios-filters" style="margin-top:20px;">
            <div class="servicios-filter">
              <label for="relatorios-servicios-fecha-desde">Fecha desde</label>
              <input type="date" id="relatorios-servicios-fecha-desde" />
            </div>
            <div class="servicios-filter">
              <label for="relatorios-servicios-fecha-hasta">Fecha hasta</label>
              <input type="date" id="relatorios-servicios-fecha-hasta" />
            </div>
            <button type="button" class="btn-primary" data-action="generar-pdf-servicios">Generar PDF</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

async function generarPdfServicios(container) {
  const fechaDesde = container.querySelector('#relatorios-servicios-fecha-desde')?.value || '';
  const fechaHasta = container.querySelector('#relatorios-servicios-fecha-hasta')?.value || '';
  const button = container.querySelector('[data-action="generar-pdf-servicios"]');

  if (!fechaDesde || !fechaHasta) {
    window.alert('Seleccione Fecha desde y Fecha hasta.');
    return;
  }

  if (fechaDesde > fechaHasta) {
    window.alert('La fecha desde no puede ser posterior a la fecha hasta.');
    return;
  }

  const originalLabel = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = 'Generando PDF...';
  }

  try {
    await exportRelatorioServiciosPdf({ fechaDesde, fechaHasta });
  } catch (error) {
    window.alert(error.message || 'No se pudo generar el PDF.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel || 'Generar PDF';
    }
  }
}

function showServiciosReporte(container) {
  container.innerHTML = renderServiciosReporteHtml();
  container.querySelector('[data-action="generar-pdf-servicios"]')?.addEventListener('click', () => {
    generarPdfServicios(container);
  });
}

function renderClientesReporteHtml() {
  return `
    <div class="relatorios-page">
      <section class="dashboard-panel">
        <div class="dashboard-panel__body">
          <h2>Reporte de clientes y vehículos</h2>

          <div class="servicios-filters" style="margin-top:20px;">
            <div class="servicios-filter">
              <label for="relatorios-clientes-ordenar">Ordenar por</label>
              <select id="relatorios-clientes-ordenar">
                <option value="cliente" selected>Cliente</option>
                <option value="vehiculo">Vehículo</option>
              </select>
            </div>
            <button type="button" class="btn-primary" data-action="generar-pdf-clientes">Generar PDF</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

async function generarPdfClientes(container) {
  const button = container.querySelector('[data-action="generar-pdf-clientes"]');
  const originalLabel = button?.textContent;

  if (button) {
    button.disabled = true;
    button.textContent = 'Generando PDF...';
  }

  try {
    const ordenarPor = container.querySelector('#relatorios-clientes-ordenar')?.value || 'cliente';
    await exportRelatorioClientesVehiculosPdf({ ordenarPor });
  } catch (error) {
    window.alert(error.message || 'No se pudo generar el PDF.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel || 'Generar PDF';
    }
  }
}

function showClientesReporte(container) {
  container.innerHTML = renderClientesReporteHtml();
  container.querySelector('[data-action="generar-pdf-clientes"]')?.addEventListener('click', () => {
    generarPdfClientes(container);
  });
}

function renderServicioTipoOptions() {
  const opciones = SERVICIOS_CATALOGO.map((servicio) => (
    `<option value="${escapeHtml(servicio.id)}">${escapeHtml(servicio.label)}</option>`
  )).join('');

  return `<option value="todos" selected>Todos</option>${opciones}`;
}

function renderServiciosPorTipoReporteHtml() {
  return `
    <div class="relatorios-page">
      <section class="dashboard-panel">
        <div class="dashboard-panel__body">
          <h2>Reporte de servicios por tipo</h2>

          <div class="servicios-filters" style="margin-top:20px;">
            <div class="servicios-filter">
              <label for="relatorios-tipo-fecha-desde">Fecha desde</label>
              <input type="date" id="relatorios-tipo-fecha-desde" />
            </div>
            <div class="servicios-filter">
              <label for="relatorios-tipo-fecha-hasta">Fecha hasta</label>
              <input type="date" id="relatorios-tipo-fecha-hasta" />
            </div>
            <div class="servicios-filter">
              <label for="relatorios-tipo-servicio">Servicio</label>
              <select id="relatorios-tipo-servicio">
                ${renderServicioTipoOptions()}
              </select>
            </div>
            <button type="button" class="btn-primary" data-action="generar-pdf-tipo">Generar PDF</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

async function generarPdfServiciosPorTipo(container) {
  const fechaDesde = container.querySelector('#relatorios-tipo-fecha-desde')?.value || '';
  const fechaHasta = container.querySelector('#relatorios-tipo-fecha-hasta')?.value || '';
  const servicioId = container.querySelector('#relatorios-tipo-servicio')?.value || 'todos';
  const button = container.querySelector('[data-action="generar-pdf-tipo"]');

  if (!fechaDesde || !fechaHasta) {
    window.alert('Seleccione Fecha desde y Fecha hasta.');
    return;
  }

  if (fechaDesde > fechaHasta) {
    window.alert('La fecha desde no puede ser posterior a la fecha hasta.');
    return;
  }

  const originalLabel = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = 'Generando PDF...';
  }

  try {
    await exportRelatorioServiciosPorTipoPdf({ fechaDesde, fechaHasta, servicioId });
  } catch (error) {
    window.alert(error.message || 'No se pudo generar el PDF.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel || 'Generar PDF';
    }
  }
}

function showServiciosPorTipoReporte(container) {
  container.innerHTML = renderServiciosPorTipoReporteHtml();
  container.querySelector('[data-action="generar-pdf-tipo"]')?.addEventListener('click', () => {
    generarPdfServiciosPorTipo(container);
  });
}

let historialVehiculo = null;
let historialSearchResults = [];
let historialSearchTimeout = null;

function formatVehiculoConfirmacion(vehiculo) {
  return [vehiculo?.marca, vehiculo?.modelo].filter(Boolean).join(' ') || '—';
}

function renderHistorialConfirmacion(vehiculo) {
  if (!vehiculo) {
    return 'Seleccione un vehículo por chapa.';
  }

  return `Confirmación: <strong>${escapeHtml(formatVehiculoConfirmacion(vehiculo))}</strong>`;
}

function renderHistorialResults(vehiculos) {
  if (!vehiculos.length) {
    return '<div class="ordenes-search-results__empty">No se encontraron vehículos con esa chapa.</div>';
  }

  return vehiculos.map((vehiculo) => `
    <button type="button" class="ordenes-search-results__item" data-vehiculo-id="${vehiculo.id}">
      <span class="ordenes-search-results__codigo">${escapeHtml(vehiculo.placa || '—')}</span>
      <span>${escapeHtml(formatVehiculoConfirmacion(vehiculo))}</span>
    </button>
  `).join('');
}

function updateHistorialConfirmacion(container) {
  const confirmacion = container.querySelector('#relatorios-historial-confirmacion');
  if (confirmacion) {
    confirmacion.innerHTML = renderHistorialConfirmacion(historialVehiculo);
  }
}

function selectHistorialVehiculo(container, vehiculo) {
  historialVehiculo = vehiculo || null;
  const input = container.querySelector('#relatorios-historial-chapa');
  const results = container.querySelector('#relatorios-historial-results');

  if (input && historialVehiculo) {
    input.value = historialVehiculo.placa || '';
  }

  results?.classList.add('hidden');
  updateHistorialConfirmacion(container);
}

async function buscarVehiculosPorChapa(container, term) {
  const resultsEl = container.querySelector('#relatorios-historial-results');
  if (!resultsEl) {
    return;
  }

  const query = term.trim();
  if (!query) {
    historialSearchResults = [];
    historialVehiculo = null;
    resultsEl.classList.add('hidden');
    resultsEl.innerHTML = '';
    updateHistorialConfirmacion(container);
    return;
  }

  const vehiculos = await window.api.listVehiculos(query);
  const lower = query.toLowerCase();
  historialSearchResults = (Array.isArray(vehiculos) ? vehiculos : []).filter((vehiculo) => (
    String(vehiculo.placa || '').toLowerCase().includes(lower)
  ));

  resultsEl.innerHTML = renderHistorialResults(historialSearchResults);
  resultsEl.classList.remove('hidden');
}

function renderHistorialReporteHtml() {
  return `
    <div class="relatorios-page">
      <section class="dashboard-panel">
        <div class="dashboard-panel__body">
          <h2>Historial por vehículo</h2>

          <div class="servicios-filters" style="margin-top:20px;">
            <div class="servicios-filter ordenes-search-inline" style="min-width:240px;">
              <label for="relatorios-historial-chapa">Chapa</label>
              <input
                type="search"
                id="relatorios-historial-chapa"
                placeholder="Buscar por chapa..."
                autocomplete="off"
                style="padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);min-width:220px;"
              />
              <div id="relatorios-historial-results" class="ordenes-search-results hidden"></div>
            </div>
            <div class="servicios-filter">
              <label for="relatorios-historial-fecha-desde">Fecha desde</label>
              <input type="date" id="relatorios-historial-fecha-desde" />
            </div>
            <div class="servicios-filter">
              <label for="relatorios-historial-fecha-hasta">Fecha hasta</label>
              <input type="date" id="relatorios-historial-fecha-hasta" />
            </div>
            <button type="button" class="btn-primary" data-action="generar-pdf-historial">Generar PDF</button>
          </div>
          <p id="relatorios-historial-confirmacion" style="margin:16px 0 0;color:var(--color-text-muted);">Seleccione un vehículo por chapa.</p>
        </div>
      </section>
    </div>
  `;
}

async function generarPdfHistorial(container) {
  const fechaDesde = container.querySelector('#relatorios-historial-fecha-desde')?.value || '';
  const fechaHasta = container.querySelector('#relatorios-historial-fecha-hasta')?.value || '';
  const button = container.querySelector('[data-action="generar-pdf-historial"]');

  if (!historialVehiculo) {
    window.alert('Seleccione un vehículo por chapa.');
    return;
  }

  if (!fechaDesde || !fechaHasta) {
    window.alert('Seleccione Fecha desde y Fecha hasta.');
    return;
  }

  if (fechaDesde > fechaHasta) {
    window.alert('La fecha desde no puede ser posterior a la fecha hasta.');
    return;
  }

  const originalLabel = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = 'Generando PDF...';
  }

  try {
    await exportRelatorioHistorialVehiculoPdf({
      vehiculo: historialVehiculo,
      fechaDesde,
      fechaHasta
    });
  } catch (error) {
    window.alert(error.message || 'No se pudo generar el PDF.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel || 'Generar PDF';
    }
  }
}

function showHistorialReporte(container) {
  historialVehiculo = null;
  historialSearchResults = [];
  container.innerHTML = renderHistorialReporteHtml();

  const input = container.querySelector('#relatorios-historial-chapa');
  const resultsEl = container.querySelector('#relatorios-historial-results');

  input?.addEventListener('input', () => {
    clearTimeout(historialSearchTimeout);
    historialSearchTimeout = setTimeout(() => {
      buscarVehiculosPorChapa(container, input.value);
    }, 250);
  });

  resultsEl?.addEventListener('click', (event) => {
    const item = event.target.closest('[data-vehiculo-id]');
    if (!item) {
      return;
    }

    const vehiculo = historialSearchResults.find((entry) => Number(entry.id) === Number(item.dataset.vehiculoId));
    selectHistorialVehiculo(container, vehiculo);
  });

  container.querySelector('[data-action="generar-pdf-historial"]')?.addEventListener('click', () => {
    generarPdfHistorial(container);
  });
}

export async function mountRelatoriosPage(container) {
  container.innerHTML = renderTiposHtml();

  container.querySelector('[data-reporte="servicios"]')?.addEventListener('click', () => {
    showServiciosReporte(container);
  });

  container.querySelector('[data-reporte="proximos"]')?.addEventListener('click', () => {
    showProximosReporte(container);
  });

  container.querySelector('[data-reporte="clientes"]')?.addEventListener('click', () => {
    showClientesReporte(container);
  });

  container.querySelector('[data-reporte="servicios-tipo"]')?.addEventListener('click', () => {
    showServiciosPorTipoReporte(container);
  });

  container.querySelector('[data-reporte="historial"]')?.addEventListener('click', () => {
    showHistorialReporte(container);
  });
}

export function unmountRelatoriosPage() {
  clearTimeout(historialSearchTimeout);
  historialVehiculo = null;
  historialSearchResults = [];
}
