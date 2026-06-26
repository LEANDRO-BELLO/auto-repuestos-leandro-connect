import { escapeHtml } from '../utils/dom.js';

const MOCK_DATA = {
  vencidos: [
    { nombre: 'Cambio de aceite', placa: 'ABC 123', vencimiento: '15/05/2026' },
    { nombre: 'Filtro de aire', placa: 'XYZ 789', vencimiento: '20/05/2026' },
    { nombre: 'Rotación de neumáticos', placa: 'DEF 456', vencimiento: '01/06/2026' }
  ],
  cercaVencer: [
    { nombre: 'Cambio de aceite', placa: 'GHI 321', vencimiento: '05/07/2026' },
    { nombre: 'Filtro de combustible', placa: 'JKL 654', vencimiento: '10/07/2026' }
  ],
  realizadosHoy: [
    { fecha: '26/06/2026', cliente: 'Juan Pérez', vehiculo: 'Toyota Hilux — ABC 123' },
    { fecha: '26/06/2026', cliente: 'María González', vehiculo: 'Chevrolet Onix — XYZ 789' },
    { fecha: '26/06/2026', cliente: 'Carlos Benítez', vehiculo: 'Ford Ranger — DEF 456' }
  ],
  ordenesAbiertas: [
    { os: 'OS-0042', cliente: 'Ana Martínez', vehiculo: 'Hyundai Tucson — GHI 321' },
    { os: 'OS-0043', cliente: 'Roberto Silva', vehiculo: 'Volkswagen Gol — JKL 654' }
  ]
};

function renderTableRows(rows, columns, emptyMessage) {
  if (!rows.length) {
    return `<tr><td class="dashboard-table__empty" colspan="${columns.length}">${escapeHtml(emptyMessage)}</td></tr>`;
  }

  return rows.map((row) => `
    <tr>
      ${columns.map((col) => `<td>${escapeHtml(row[col])}</td>`).join('')}
    </tr>
  `).join('');
}

function renderStatCard(label, count, variant) {
  return `
    <article class="dashboard-card dashboard-card--${variant}">
      <span class="dashboard-card__count">${count}</span>
      <span class="dashboard-card__label">${escapeHtml(label)}</span>
    </article>
  `;
}

function renderTableSection(title, columns, rows, columnKeys, emptyMessage) {
  const headers = columns.map((col) => `<th scope="col">${escapeHtml(col)}</th>`).join('');

  return `
    <section class="dashboard-section">
      <h3 class="dashboard-section__title">${escapeHtml(title)}</h3>
      <div class="dashboard-table-wrap">
        <table class="dashboard-table">
          <thead>
            <tr>${headers}</tr>
          </thead>
          <tbody>
            ${renderTableRows(rows, columnKeys, emptyMessage)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

export function renderDashboardContent() {
  const { vencidos, cercaVencer, realizadosHoy, ordenesAbiertas } = MOCK_DATA;

  return `
    <div class="dashboard">
      <div class="dashboard-cards">
        ${renderStatCard('Servicios vencidos', vencidos.length, 'danger')}
        ${renderStatCard('Cerca de vencer', cercaVencer.length, 'warning')}
        ${renderStatCard('Servicios realizados hoy', realizadosHoy.length, 'success')}
        ${renderStatCard('Órdenes abiertas', ordenesAbiertas.length, 'info')}
      </div>

      <div class="dashboard-grid">
        ${renderTableSection(
          'Servicios vencidos',
          ['Nombre', 'Placa', 'Vencimiento'],
          vencidos,
          ['nombre', 'placa', 'vencimiento'],
          'No hay servicios vencidos.'
        )}
        ${renderTableSection(
          'Cerca de vencer',
          ['Nombre', 'Placa', 'Vencimiento'],
          cercaVencer,
          ['nombre', 'placa', 'vencimiento'],
          'No hay servicios próximos a vencer.'
        )}
        ${renderTableSection(
          'Servicios realizados hoy',
          ['Fecha', 'Cliente', 'Vehículo'],
          realizadosHoy,
          ['fecha', 'cliente', 'vehiculo'],
          'No hay servicios realizados hoy.'
        )}
        ${renderTableSection(
          'Órdenes abiertas',
          ['OS', 'Cliente', 'Vehículo'],
          ordenesAbiertas,
          ['os', 'cliente', 'vehiculo'],
          'No hay órdenes abiertas.'
        )}
      </div>
    </div>
  `;
}
