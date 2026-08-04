const { query } = require('../database/postgres');

const RAILWAY_URL =
  'https://auto-repuestos-leandro-connect-production.up.railway.app';

async function generateCodigo() {
  const result = await query(`
    SELECT codigo
    FROM clientes
    WHERE codigo LIKE 'CLI-%'
    ORDER BY CAST(SUBSTRING(codigo FROM 5) AS INTEGER) DESC
    LIMIT 1
  `);

  const row = result.rows[0];

  if (!row) {
    return 'CLI-0001';
  }

  const next =
    parseInt(row.codigo.replace('CLI-', ''), 10) + 1;

  return `CLI-${String(next).padStart(4, '0')}`;
}

async function syncClienteRailway(cliente) {
  if (!cliente) {
    return false;
  }

  try {
    const response = await fetch(
      `${RAILWAY_URL}/api/sync/cliente`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: cliente.id,
          codigo: cliente.codigo,
          nombre: cliente.nombre,
          documento: cliente.documento,
          telefono: cliente.telefono,
          whatsapp: cliente.whatsapp,
          email: cliente.email,
          direccion: cliente.direccion,
          ciudad: cliente.ciudad,
          observaciones: cliente.observaciones,
          ultima_visita: cliente.ultimaVisita
        })
      }
    );

    const texto = await response.text();

    console.log(
      'RESPUESTA SYNC CLIENTE:',
      response.status,
      texto
    );

    return response.ok;
  } catch (error) {
    console.error(
      'No se pudo sincronizar el cliente:',
      error.message
    );

    return false;
  }
}

function mapCliente(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    codigo: row.codigo,
    nombre: row.nombre,
    documento: row.documento || '',
    telefono: row.telefono || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    direccion: row.direccion || '',
    ciudad: row.ciudad || '',
    observaciones: row.observaciones || '',
    ultimaVisita: row.ultima_visita || null,
    creadoEn: row.created_at,
    actualizadoEn: row.updated_at
  };
}

async function listClientes(search = '') {
  const term = String(search || '').trim();

  if (!term) {
    const result = await query(`
      SELECT
        id,
        codigo,
        nombre,
        documento,
        telefono,
        whatsapp,
        email,
        direccion,
        ciudad,
        observaciones,
        ultima_visita,
        created_at,
        updated_at
      FROM clientes
      ORDER BY LOWER(nombre) ASC
    `);

    return result.rows.map(mapCliente);
  }

  const like = `%${term}%`;

  const result = await query(
    `
      SELECT
        id,
        codigo,
        nombre,
        documento,
        telefono,
        whatsapp,
        email,
        direccion,
        ciudad,
        observaciones,
        ultima_visita,
        created_at,
        updated_at
      FROM clientes
      WHERE codigo ILIKE $1
         OR nombre ILIKE $1
         OR documento ILIKE $1
         OR telefono ILIKE $1
         OR whatsapp ILIKE $1
         OR email ILIKE $1
         OR ciudad ILIKE $1
      ORDER BY LOWER(nombre) ASC
    `,
    [like]
  );

  return result.rows.map(mapCliente);
}

async function getCliente(id) {
  const result = await query(
    `
      SELECT
        id,
        codigo,
        nombre,
        documento,
        telefono,
        whatsapp,
        email,
        direccion,
        ciudad,
        observaciones,
        ultima_visita,
        created_at,
        updated_at
      FROM clientes
      WHERE id = $1
    `,
    [Number(id)]
  );

  return mapCliente(result.rows[0]);
}

async function verificarDuplicidad({
  nombre,
  documento,
  excluirId = null
}) {
  const params = [
    nombre.trim().toLowerCase(),
    documento?.trim() || null
  ];

  let whereExcluir = '';

  if (excluirId) {
    params.push(Number(excluirId));
    whereExcluir = 'AND id <> $3';
  }

  const result = await query(
    `
      SELECT id, nombre, documento
      FROM clientes
      WHERE (
        LOWER(TRIM(nombre)) = $1
        OR (
          $2::TEXT IS NOT NULL
          AND documento = $2
        )
      )
      ${whereExcluir}
      LIMIT 1
    `,
    params
  );

  return result.rows[0] || null;
}

async function createCliente(data) {
  const nombre = data.nombre?.trim();

  if (!nombre) {
    return {
      ok: false,
      error: 'El nombre es obligatorio.'
    };
  }

  const documento =
    data.documento?.trim() || null;

  const duplicado = await verificarDuplicidad({
    nombre,
    documento
  });

  if (duplicado) {
    return {
      ok: false,
      error:
        'Ya existe un cliente con el mismo nombre o documento.'
    };
  }

  const codigo = await generateCodigo();

  const result = await query(
    `
      INSERT INTO clientes (
        codigo,
        nombre,
        documento,
        telefono,
        whatsapp,
        email,
        direccion,
        ciudad,
        observaciones,
        ultima_visita,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        CURRENT_TIMESTAMP
      )
      RETURNING id
    `,
    [
      codigo,
      nombre,
      documento,
      data.telefono?.trim() || null,
      data.whatsapp?.trim() || null,
      data.email?.trim() || null,
      data.direccion?.trim() || null,
      data.ciudad?.trim() || null,
      data.observaciones?.trim() || null,
      data.ultimaVisita || null
    ]
  );

  const cliente = await getCliente(
    result.rows[0].id
  );

  await syncClienteRailway(cliente);

  return {
    ok: true,
    cliente
  };
}

async function updateCliente(id, data) {
  const existing = await getCliente(id);

  if (!existing) {
    return {
      ok: false,
      error: 'Cliente no encontrado.'
    };
  }

  const nombre = data.nombre?.trim();

  if (!nombre) {
    return {
      ok: false,
      error: 'El nombre es obligatorio.'
    };
  }

  const documento =
    data.documento?.trim() || null;

  const duplicado = await verificarDuplicidad({
    nombre,
    documento,
    excluirId: id
  });

  if (duplicado) {
    return {
      ok: false,
      error:
        'Ya existe otro cliente con el mismo nombre o documento.'
    };
  }

  await query(
    `
      UPDATE clientes
      SET
        nombre = $1,
        documento = $2,
        telefono = $3,
        whatsapp = $4,
        email = $5,
        direccion = $6,
        ciudad = $7,
        observaciones = $8,
        ultima_visita = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
    `,
    [
      nombre,
      documento,
      data.telefono?.trim() || null,
      data.whatsapp?.trim() || null,
      data.email?.trim() || null,
      data.direccion?.trim() || null,
      data.ciudad?.trim() || null,
      data.observaciones?.trim() || null,
      data.ultimaVisita || null,
      Number(id)
    ]
  );

  const cliente = await getCliente(id);

  await syncClienteRailway(cliente);

  return {
    ok: true,
    cliente
  };
}

async function deleteCliente(id) {
  const existing = await getCliente(id);

  if (!existing) {
    return {
      ok: false,
      error: 'Cliente no encontrado.'
    };
  }

  const vehiculos = await query(
    `
      SELECT COUNT(*)::INTEGER AS cantidad
      FROM vehiculos
      WHERE cliente_id = $1
    `,
    [Number(id)]
  );

  if (vehiculos.rows[0].cantidad > 0) {
    return {
      ok: false,
      error:
        'No se puede eliminar el cliente porque posee vehículos registrados.'
    };
  }

  await query(
    'DELETE FROM clientes WHERE id = $1',
    [Number(id)]
  );

  return {
    ok: true
  };
}

module.exports = {
  listClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente
};