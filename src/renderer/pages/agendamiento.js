import { escapeHtml } from '../utils/dom.js';

let pageRoot = null;

let agendamientosActuales = [];

function formatarData(fecha) {
  if (!fecha) {
    return '';
  }

  const [ano, mes, dia] = fecha.split('-');

  if (!ano || !mes || !dia) {
    return fecha;
  }

  return `${dia}/${mes}/${ano}`;
}

function getTipoSelecionado() {
  return (
    pageRoot?.querySelector(
      'input[name="tipoAgendamiento"]:checked'
    )?.value || 'rapido'
  );
}

function renderEstado(estado = 'Pendiente') {
  const classe = estado
    .toLowerCase()
    .replaceAll(' ', '-')
    .replaceAll('á', 'a')
    .replaceAll('é', 'e');

  return `
    <span class="dashboard-badge dashboard-badge--${classe}">
      ${escapeHtml(estado)}
    </span>
  `;
}

function renderAgendamientos(agendamientos = []) {
  agendamientosActuales = Array.isArray(agendamientos)
    ? agendamientos
    : [];

  const tbody = pageRoot?.querySelector('#agendamientos-body');

  if (!tbody) {
    return;
  }

  if (!agendamientosActuales.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="dashboard-table__empty">
          No hay agendamientos registrados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = agendamientosActuales
    .map((item) => {
      const estado = item.estado || 'Pendiente';
      const esPendiente = estado === 'Pendiente';
      const esConfirmado = estado === 'Confirmado';
      const estaActivo = esPendiente || esConfirmado;
      const esClienteCadastrado = item.tipo === 'cadastrado';

      const acciones = [];

      if (!esClienteCadastrado && estaActivo) {
        acciones.push(`
          <button
            type="button"
            class="btn-ghost"
            data-action="registrar-cliente"
            data-id="${item.id}"
          >
            Registrar cliente
          </button>
        `);
      }

      if (esPendiente) {
        acciones.push(`
          <button
            type="button"
            class="btn-ghost"
            data-action="confirmar"
            data-id="${item.id}"
          >
            Confirmar
          </button>
        `);
      }

      if (esClienteCadastrado && estaActivo) {
        acciones.push(`
          <button
            type="button"
            class="btn-primary"
            data-action="iniciar-ot"
            data-id="${item.id}"
          >
            Iniciar OT
          </button>
        `);
      }

      if (estaActivo) {
        acciones.push(`
          <button
            type="button"
            class="btn-ghost"
            data-action="cancelar"
            data-id="${item.id}"
          >
            Cancelar
          </button>
        `);
      }

      if (esPendiente) {
        acciones.push(`
          <button
            type="button"
            class="btn-ghost"
            data-action="delete"
            data-id="${item.id}"
          >
            Eliminar
          </button>
        `);
      }

      if (estado === 'En proceso') {
        acciones.push(`
          <span class="dashboard-badge dashboard-badge--progress">
            OT iniciada
          </span>
        `);
      }

      if (estado === 'Finalizado') {
        acciones.push(`
          <span class="dashboard-badge dashboard-badge--finalizado">
            Finalizado
          </span>
        `);
      }

      return `
        <tr>
          <td>${escapeHtml(formatarData(item.fecha))}</td>
          <td>${escapeHtml(item.hora || '')}</td>
          <td>${escapeHtml(item.clienteNombre || '')}</td>
          <td>${escapeHtml(item.vehiculoDescripcion || '')}</td>
          <td>${renderEstado(estado)}</td>
          <td>${acciones.join('')}</td>
        </tr>
      `;
    })
    .join('');
}

async function carregarAgendamientos() {
  try {
    const dados = await window.api.listAgendamientos({});
    renderAgendamientos(Array.isArray(dados) ? dados : []);
  } catch (error) {
    console.error('Error al cargar agendamientos:', error);
    renderAgendamientos([]);
  }
}

async function carregarClientes() {
  const select = pageRoot?.querySelector('#agendamiento-cliente');

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">Seleccione un cliente</option>
  `;

  try {
    const clientes = await window.api.listClientes('');

    for (const cliente of clientes || []) {
      const option = document.createElement('option');
      option.value = String(cliente.id);
      option.textContent = cliente.nombre;
      select.appendChild(option);
    }
  } catch (error) {
    console.error('Error al cargar clientes:', error);
  }
}

async function carregarVehiculosDoCliente(clienteId) {
  const select = pageRoot?.querySelector('#agendamiento-vehiculo');

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">Seleccione un vehículo</option>
  `;

  select.disabled = true;

  if (!clienteId) {
    return;
  }

  try {
    const vehiculos = await window.api.listVehiculosByCliente(
      Number(clienteId)
    );

    for (const vehiculo of vehiculos || []) {
      const option = document.createElement('option');
      option.value = String(vehiculo.id);
      option.textContent =
        vehiculo.modelo ||
        vehiculo.marca ||
        'Vehículo sin descripción';

      select.appendChild(option);
    }

    select.disabled = false;
  } catch (error) {
    console.error('Error al cargar vehículos:', error);
  }
}

function atualizarTipoFormulario() {
  const tipo = getTipoSelecionado();
  const rapidoAtivo = tipo === 'rapido';

  const rapido = pageRoot?.querySelector('#campos-agendamiento-rapido');
  const cadastrado = pageRoot?.querySelector('#campos-cliente-cadastrado');

  const nome = pageRoot?.querySelector('#agendamiento-cliente-nombre');
  const veiculoDescricao = pageRoot?.querySelector(
    '#agendamiento-vehiculo-descripcion'
  );

  const clienteSelect = pageRoot?.querySelector('#agendamiento-cliente');
  const vehiculoSelect = pageRoot?.querySelector('#agendamiento-vehiculo');

  if (rapido) {
    rapido.style.display = rapidoAtivo ? 'block' : 'none';
  }

  if (cadastrado) {
    cadastrado.style.display = rapidoAtivo ? 'none' : 'block';
  }

  if (nome) {
    nome.required = rapidoAtivo;
  }

  if (veiculoDescricao) {
    veiculoDescricao.required = rapidoAtivo;
  }

  if (clienteSelect) {
    clienteSelect.required = !rapidoAtivo;
  }

  if (vehiculoSelect) {
    vehiculoSelect.required = !rapidoAtivo;
  }
}
function abrirModal() {
  const modal = pageRoot?.querySelector('#modal-agendamiento');
  const form = pageRoot?.querySelector('#form-agendamiento');

  form?.reset();

  const rapidoRadio = pageRoot?.querySelector(
    'input[name="tipoAgendamiento"][value="rapido"]'
  );

  if (rapidoRadio) {
    rapidoRadio.checked = true;
  }

  const vehiculoSelect = pageRoot?.querySelector(
    '#agendamiento-vehiculo'
  );

  if (vehiculoSelect) {
    vehiculoSelect.innerHTML = `
      <option value="">Seleccione un vehículo</option>
    `;
    vehiculoSelect.disabled = true;
  }

  atualizarTipoFormulario();
  modal?.showModal();
}

async function guardarAgendamiento(event) {
  event.preventDefault();

  try {
    const tipo = getTipoSelecionado();

    const dados = {
      tipo,
      fecha:
        pageRoot?.querySelector('#agendamiento-fecha')?.value || '',
      hora:
        pageRoot?.querySelector('#agendamiento-hora')?.value || '',
      observaciones:
        pageRoot
          ?.querySelector('#agendamiento-observaciones')
          ?.value.trim() || '',
      estado: 'Pendiente'
    };

    if (tipo === 'rapido') {
      dados.clienteNombre =
        pageRoot
          ?.querySelector('#agendamiento-cliente-nombre')
          ?.value.trim() || '';

      dados.clienteTelefono =
        pageRoot
          ?.querySelector('#agendamiento-cliente-telefono')
          ?.value.trim() || '';

      dados.vehiculoDescripcion =
        pageRoot
          ?.querySelector('#agendamiento-vehiculo-descripcion')
          ?.value.trim() || '';
    } else {
      dados.clienteId =
        pageRoot?.querySelector('#agendamiento-cliente')?.value || '';

      dados.vehiculoId =
        pageRoot?.querySelector('#agendamiento-vehiculo')?.value || '';
    }

    console.log('Datos del agendamiento:', dados);

    if (typeof window.api.createAgendamiento !== 'function') {
      throw new Error(
        'La función createAgendamiento no está disponible en preload.'
      );
    }

    const resultado = await window.api.createAgendamiento(dados);

    console.log('Resultado del banco:', resultado);

    if (!resultado?.ok) {
      window.alert(
        resultado?.error || 'No se pudo guardar el agendamiento.'
      );
      return;
    }

    pageRoot?.querySelector('#modal-agendamiento')?.close();
    await carregarAgendamientos();

    window.alert('Agendamiento guardado correctamente.');
  } catch (error) {
    console.error('Error al guardar agendamiento:', error);
    window.alert(`Error al guardar: ${error.message}`);
  }
}

async function eliminarAgendamiento(id) {
  try {
    const confirmado = window.confirm(
      '¿Está seguro de que desea eliminar este agendamiento?'
    );

    if (!confirmado) {
      return;
    }

    const resultado = await window.api.deleteAgendamiento(Number(id));

    if (!resultado?.ok) {
      window.alert(
        resultado?.error || 'No se pudo eliminar el agendamiento.'
      );
      return;
    }

    await carregarAgendamientos();
  } catch (error) {
    console.error('Error al eliminar agendamiento:', error);

    window.alert(
      `Error al eliminar: ${error.message}`
    );
  }
}

async function cambiarEstadoAgendamiento(id, nuevoEstado) {
  try {
    if (nuevoEstado === 'Cancelado') {
      const confirmado = window.confirm(
        '¿Está seguro de que desea cancelar este agendamiento?'
      );

      if (!confirmado) {
        return false;
      }
    }

    const resultado = await window.api.changeAgendamientoStatus(
      Number(id),
      nuevoEstado
    );

    if (!resultado?.ok) {
      window.alert(
        resultado?.error || 'No se pudo actualizar el agendamiento.'
      );
      return false;
    }

    await carregarAgendamientos();
    return true;
  } catch (error) {
    console.error('Error al actualizar el agendamiento:', error);
    window.alert(`Error al actualizar: ${error.message}`);
    return false;
  }
}

function bindEventos() {
  pageRoot
    ?.querySelector('#btn-nuevo-agendamiento')
    ?.addEventListener('click', abrirModal);

  pageRoot
    ?.querySelector('#btn-cancelar-agendamiento')
    ?.addEventListener('click', () => {
      pageRoot
        ?.querySelector('#modal-agendamiento')
        ?.close();
    });

  pageRoot
    ?.querySelector('#form-agendamiento')
    ?.addEventListener('submit', guardarAgendamiento);

  pageRoot
    ?.querySelectorAll('input[name="tipoAgendamiento"]')
    .forEach((radio) => {
      radio.addEventListener('change', atualizarTipoFormulario);
    });

  pageRoot
    ?.querySelector('#agendamiento-cliente')
    ?.addEventListener('change', (event) => {
      carregarVehiculosDoCliente(event.target.value);
    });

  pageRoot
    ?.querySelector('#agendamientos-body')
    ?.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-action]');

      if (!button) {
        return;
      }

      const id = Number(button.dataset.id);
      const action = button.dataset.action;

      if (action === 'delete') {
        await eliminarAgendamiento(id);
        return;
      }

      const agendamiento = agendamientosActuales.find(
        (item) => Number(item.id) === id
      );

      if (!agendamiento) {
        window.alert('Agendamiento no encontrado.');
        return;
      }

      if (action === 'confirmar') {
        await cambiarEstadoAgendamiento(id, 'Confirmado');
        return;
      }

      if (action === 'cancelar') {
        await cambiarEstadoAgendamiento(id, 'Cancelado');
        return;
      }

      if (action === 'registrar-cliente') {
        window.alert(
          'Este es un agendamiento rápido. Registre primero el cliente y el vehículo.'
        );
        return;
      }

      if (action === 'iniciar-ot') {
        const atualizado = await cambiarEstadoAgendamiento(
          agendamiento.id,
          'En proceso'
        );

        if (!atualizado) {
          return;
        }

        sessionStorage.setItem(
          'agendamientoEnProcesoId',
          String(agendamiento.id)
        );

        sessionStorage.setItem(
          'ordenDesdeAgendamiento',
          JSON.stringify({
            ...agendamiento,
            estado: 'En proceso'
          })
        );

        const ordenesButton = document.querySelector(
          '[data-nav="ordenes"]'
        );

        ordenesButton?.click();
      }
    });
}

export async function mountAgendamientoPage(container) {
  pageRoot = container;

  container.innerHTML = `
    <section class="page-section">
      <div class="page-header">
        <div>
          <h2>Agendamiento de Servicios</h2>
          <p>Organice los servicios programados de la oficina.</p>
        </div>

        <button
          type="button"
          class="btn-primary"
          id="btn-nuevo-agendamiento"
        >
          + Nuevo Agendamiento
        </button>
      </div>

      <div class="dashboard-panel">
        <div class="dashboard-panel__body">
          <table class="dashboard-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Vehículo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody id="agendamientos-body">
              <tr>
                <td colspan="6" class="dashboard-table__empty">
                  Cargando agendamientos...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <dialog id="modal-agendamiento" class="modal-agendamiento">
        <form id="form-agendamiento">
          <div class="modal-header">
            <h2>Nuevo Agendamiento</h2>
          </div>

          <div class="form-grid">
            <div class="form-field form-field--full">
              <label>
                <strong>Tipo de Agendamiento</strong>
              </label>

              <div style="display:flex; gap:30px; margin-top:8px;">
                <label>
                  <input
                    type="radio"
                    name="tipoAgendamiento"
                    value="rapido"
                    checked
                  >
                  Agendamiento rápido
                </label>

                <label>
                  <input
                    type="radio"
                    name="tipoAgendamiento"
                    value="cadastrado"
                  >
                  Cliente cadastrado
                </label>
              </div>
            </div>

            <div
              id="campos-agendamiento-rapido"
              class="form-field form-field--full"
            >
              <div class="form-grid">
                <div class="form-field">
                  <label for="agendamiento-cliente-nombre">
                    Nombre del cliente *
                  </label>

                  <input
                    type="text"
                    id="agendamiento-cliente-nombre"
                  >
                </div>

                <div class="form-field">
                  <label for="agendamiento-cliente-telefono">
                    Teléfono / WhatsApp
                  </label>

                  <input
                    type="text"
                    id="agendamiento-cliente-telefono"
                  >
                </div>

                <div class="form-field form-field--full">
                  <label for="agendamiento-vehiculo-descripcion">
                    Vehículo *
                  </label>

                  <input
                    type="text"
                    id="agendamiento-vehiculo-descripcion"
                    placeholder="Ej.: Toyota Hilux"
                  >
                </div>
              </div>
            </div>

            <div
              id="campos-cliente-cadastrado"
              class="form-field form-field--full"
              hidden
            >
              <div class="form-grid">
                <div class="form-field">
                  <label for="agendamiento-cliente">
                    Cliente *
                  </label>

                  <select id="agendamiento-cliente">
                    <option value="">
                      Seleccione un cliente
                    </option>
                  </select>
                </div>

                <div class="form-field">
                  <label for="agendamiento-vehiculo">
                    Vehículo *
                  </label>

                  <select
                    id="agendamiento-vehiculo"
                    disabled
                  >
                    <option value="">
                      Seleccione un vehículo
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div class="form-field">
              <label for="agendamiento-fecha">
                Fecha *
              </label>

              <input
                type="date"
                id="agendamiento-fecha"
                required
              >
            </div>

            <div class="form-field">
              <label for="agendamiento-hora">
                Hora *
              </label>

              <input
                type="time"
                id="agendamiento-hora"
                required
              >
            </div>

            <div class="form-field form-field--full">
              <label for="agendamiento-observaciones">
                Observaciones
              </label>

              <textarea
                id="agendamiento-observaciones"
                rows="4"
                placeholder="Observaciones opcionales"
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn-ghost"
              id="btn-cancelar-agendamiento"
            >
              Cancelar
            </button>

            <button type="submit" class="btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </dialog>
    </section>
  `;

  bindEventos();
  await carregarClientes();
  await carregarAgendamientos();
  atualizarTipoFormulario();
}

export function unmountAgendamientoPage() {
  pageRoot = null;
}