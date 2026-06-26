let currentUser = null;
let clientesCache = [];

async function login() {
  const usuario = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value.trim();
  const res = await window.api.login({ usuario, password });
  if (!res.ok) {
    document.getElementById('loginError').textContent = res.error;
    return;
  }
  currentUser = res.user;
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('userBox').textContent = `${currentUser.nombre} (${currentUser.perfil})`;
  await cargarEmpresa();
  await cargarClientes();
  await cargarVehiculos();
}

function logout() {
  currentUser = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login').classList.remove('hidden');
}

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  const titles = { dashboard: 'Inicio', clientes: 'Clientes', vehiculos: 'Vehículos', empresa: 'Configuración de Empresa' };
  document.getElementById('sectionTitle').textContent = titles[id] || id;
}

async function cargarEmpresa() {
  const e = await window.api.getEmpresa();
  document.getElementById('empresaDatos').innerHTML = `
    <p><b>Empresa:</b> ${e.nombre}</p>
    <p><b>Dirección:</b> ${e.direccion}</p>
    <p><b>Teléfono:</b> ${e.telefono}</p>
    <p><b>WhatsApp:</b> ${e.whatsapp}</p>
    <p><b>E-mail:</b> ${e.email}</p>
    <p><b>RUC:</b> ${e.ruc}</p>
  `;
}

async function guardarCliente() {
  const cliente = {
    nombre: document.getElementById('clienteNombre').value.trim(),
    documento: document.getElementById('clienteDocumento').value.trim(),
    telefono: document.getElementById('clienteTelefono').value.trim(),
    whatsapp: document.getElementById('clienteWhatsapp').value.trim(),
    email: document.getElementById('clienteEmail').value.trim(),
    direccion: document.getElementById('clienteDireccion').value.trim()
  };
  if (!cliente.nombre) return alert('Ingrese el nombre del cliente.');
  const res = await window.api.createCliente(cliente);
  if (!res.ok) return alert(res.error);
  ['clienteNombre','clienteDocumento','clienteTelefono','clienteWhatsapp','clienteEmail','clienteDireccion'].forEach(id => document.getElementById(id).value = '');
  await cargarClientes();
  alert('Cliente registrado correctamente.');
}

async function cargarClientes() {
  const q = document.getElementById('buscarCliente')?.value || '';
  const clientes = await window.api.listClientes(q);
  clientesCache = clientes;
  document.getElementById('listaClientes').innerHTML = clientes.map(c => `
    <div class="item"><b>${c.nombre}</b><br><small>${c.telefono || ''} ${c.whatsapp || ''}</small></div>
  `).join('') || '<p>No hay clientes.</p>';
}

async function buscarClienteVehiculo() {
  const q = document.getElementById('vehClienteBuscar').value.trim();
  if (!q) { document.getElementById('vehClienteResultados').innerHTML = ''; return; }
  const clientes = await window.api.listClientes(q);
  document.getElementById('vehClienteResultados').innerHTML = clientes.slice(0, 8).map(c => `
    <div class="item" onclick="seleccionarClienteVehiculo(${c.id}, '${escapeHtml(c.nombre)}')"><b>${c.nombre}</b><br><small>${c.telefono || c.whatsapp || ''}</small></div>
  `).join('') || '<p>No encontrado.</p>';
}

function seleccionarClienteVehiculo(id, nombre) {
  document.getElementById('vehClienteId').value = id;
  document.getElementById('vehClienteSeleccionado').textContent = `Cliente seleccionado: ${nombre}`;
  document.getElementById('vehClienteResultados').innerHTML = '';
  document.getElementById('vehClienteBuscar').value = nombre;
}

async function guardarVehiculo() {
  const cliente_id = Number(document.getElementById('vehClienteId').value);
  if (!cliente_id) return alert('Seleccione un cliente.');
  const vehiculo = {
    cliente_id,
    marca: document.getElementById('vehMarca').value.trim(),
    modelo: document.getElementById('vehModelo').value.trim(),
    anho: document.getElementById('vehAnho').value.trim(),
    motor: document.getElementById('vehMotor').value.trim(),
    combustible: document.getElementById('vehCombustible').value.trim(),
    placa: document.getElementById('vehPlaca').value.trim(),
    chassi: document.getElementById('vehChassi').value.trim(),
    km_actual: Number(document.getElementById('vehKm').value || 0)
  };
  if (!vehiculo.placa) return alert('Ingrese la placa.');
  const res = await window.api.createVehiculo(vehiculo);
  if (!res.ok) return alert(res.error);
  ['vehClienteBuscar','vehClienteId','vehMarca','vehModelo','vehAnho','vehMotor','vehCombustible','vehPlaca','vehChassi','vehKm'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('vehClienteSeleccionado').textContent = '';
  await cargarVehiculos();
  alert('Vehículo registrado correctamente.');
}

async function cargarVehiculos() {
  const q = document.getElementById('buscarVehiculo')?.value || '';
  const vehiculos = await window.api.listVehiculos(q);
  document.getElementById('listaVehiculos').innerHTML = vehiculos.map(v => `
    <div class="item"><b>${v.placa}</b> - ${v.marca || ''} ${v.modelo || ''}<br><small>Cliente: ${v.cliente_nombre}</small></div>
  `).join('') || '<p>No hay vehículos.</p>';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s]));
}
