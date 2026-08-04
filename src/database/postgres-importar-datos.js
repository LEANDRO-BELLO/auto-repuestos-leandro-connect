const {
  all: sqliteAll,
  closeDatabase
} = require('./connection');

const {
  query,
  getClient,
  closePool
} = require('./postgres');

function resolveValue(row, column) {
  const aliases = {
    created_at: [
      'created_at',
      'creado_en'
    ],

    updated_at: [
      'updated_at',
      'actualizado_en'
    ],

    creado_en: [
      'creado_en',
      'created_at'
    ],

    actualizado_en: [
      'actualizado_en',
      'updated_at'
    ],

    anio: [
      'anio',
      'ano'
    ],

    ano: [
      'ano',
      'anio'
    ],

    servicio: [
      'servicio',
      'codigo_servicio'
    ],

    codigo_servicio: [
      'codigo_servicio',
      'servicio'
    ],

    nombre_servicio: [
      'nombre_servicio',
      'servicio',
      'codigo_servicio'
    ],

    proximo_km: [
      'proximo_km',
      'kilometraje_proximo'
    ],

    kilometraje_proximo: [
      'kilometraje_proximo',
      'proximo_km'
    ],

    fecha_apertura: [
      'fecha_apertura',
      'fecha',
      'creado_en',
      'created_at'
    ],

    fecha_cierre: [
      'fecha_cierre',
      'actualizado_en',
      'updated_at'
    ]
  };

  const candidates = aliases[column] || [column];

  for (const candidate of candidates) {
    if (
      Object.prototype.hasOwnProperty.call(
        row,
        candidate
      ) &&
      row[candidate] !== undefined &&
      row[candidate] !== null
    ) {
      return row[candidate];
    }
  }

  /*
   * Valores padrão para colunas que existem
   * somente na estrutura PostgreSQL.
   */
  if (column === 'activo') {
    return true;
  }

  if (column === 'sincronizado') {
    return true;
  }

  if (column === 'pendiente_sync') {
    return false;
  }

  if (column === 'eliminado') {
    return false;
  }

  if (column === 'version') {
    return 1;
  }

  if (column === 'fecha_apertura') {
    return (
      row.fecha ||
      row.creado_en ||
      row.created_at ||
      new Date().toISOString()
    );
  }

  if (column === 'fecha_cierre') {
    if (row.estado !== 'Finalizada') {
      return null;
    }

    return (
      row.actualizado_en ||
      row.updated_at ||
      row.fecha ||
      new Date().toISOString()
    );
  }

  return null;
}

async function getPostgresColumns(table) {
  const result = await query(
    `
      SELECT
        column_name,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [table]
  );

  return result.rows;
}

async function resetSequence(client, table) {
  const result = await client.query(
    `
      SELECT
        pg_get_serial_sequence($1, 'id')
          AS sequence_name
    `,
    [table]
  );

  const sequenceName =
    result.rows[0]?.sequence_name;

  if (!sequenceName) {
    return;
  }

  const maxResult = await client.query(
    `
      SELECT COALESCE(MAX(id), 0) AS max_id
      FROM ${table}
    `
  );

  const maxId = Number(
    maxResult.rows[0]?.max_id || 0
  );

  if (maxId > 0) {
    await client.query(
      `
        SELECT setval($1, $2, true)
      `,
      [
        sequenceName,
        maxId
      ]
    );
  } else {
    await client.query(
      `
        SELECT setval($1, 1, false)
      `,
      [sequenceName]
    );
  }
}

async function importTableWithId(
  client,
  table,
  rows
) {
  if (!rows.length) {
    console.log(
      `${table}: ningún registro en SQLite.`
    );

    return;
  }

  const pgColumns =
    await getPostgresColumns(table);

  for (const row of rows) {
    const columns = [];
    const values = [];

    for (const definition of pgColumns) {
      const column = definition.column_name;
      const value = resolveValue(row, column);

      if (column === 'id') {
        if (
          row.id !== undefined &&
          row.id !== null
        ) {
          columns.push(column);
          values.push(row.id);
        }

        continue;
      }

      /*
       * Inclui somente valores realmente disponíveis.
       * Colunas ausentes com DEFAULT ficam a cargo
       * do próprio PostgreSQL.
       */
      if (
        value !== null &&
        value !== undefined
      ) {
        columns.push(column);
        values.push(value);
        continue;
      }

      /*
       * Se a coluna é obrigatória e não possui
       * valor padrão, interrompe com uma mensagem clara.
       */
      if (
        definition.is_nullable === 'NO' &&
        !definition.column_default
      ) {
        throw new Error(
          `No se encontró valor para la columna obligatoria ` +
          `"${column}" de la tabla "${table}". ` +
          `Registro SQLite ID: ${row.id ?? 'sin ID'}`
        );
      }
    }

    const placeholders = columns.map(
      (_, index) => `$${index + 1}`
    );

    const updateColumns = columns.filter(
      (column) => column !== 'id'
    );

    const updateSql = updateColumns.length
      ? updateColumns
          .map(
            (column) =>
              `${column} = EXCLUDED.${column}`
          )
          .join(', ')
      : 'id = EXCLUDED.id';

    await client.query(
      `
        INSERT INTO ${table}
          (${columns.join(', ')})
        VALUES
          (${placeholders.join(', ')})
        ON CONFLICT (id)
        DO UPDATE SET
          ${updateSql}
      `,
      values
    );
  }

  await resetSequence(client, table);

  console.log(
    `${table}: ${rows.length} registros importados.`
  );
}

async function importOrdenesServicios(
  client,
  rows
) {
  if (!rows.length) {
    console.log(
      'ordenes_servicios: ningún registro en SQLite.'
    );

    return;
  }

  const pgColumns =
    await getPostgresColumns(
      'ordenes_servicios'
    );

  for (const row of rows) {
    const columns = [];
    const values = [];

    for (const definition of pgColumns) {
      const column = definition.column_name;
      const value = resolveValue(row, column);

      if (
        value !== null &&
        value !== undefined
      ) {
        columns.push(column);
        values.push(value);
        continue;
      }

      if (
        definition.is_nullable === 'NO' &&
        !definition.column_default
      ) {
        throw new Error(
          `No se encontró valor para la columna obligatoria ` +
          `"${column}" de la tabla "ordenes_servicios". ` +
          `Registro SQLite ID: ${row.id ?? 'sin ID'}`
        );
      }
    }

    const placeholders = columns.map(
      (_, index) => `$${index + 1}`
    );

    await client.query(
      `
        INSERT INTO ordenes_servicios
          (${columns.join(', ')})
        VALUES
          (${placeholders.join(', ')})
      `,
      values
    );
  }

  await resetSequence(
    client,
    'ordenes_servicios'
  );

  console.log(
    `ordenes_servicios: ${rows.length} registros importados.`
  );
}

async function limpiarPostgres(client) {
  console.log(
    '[IMPORTACIÓN] Limpiando datos de prueba del PostgreSQL...'
  );

  /*
   * A ordem é importante para respeitar
   * os vínculos entre as tabelas.
   */
  await client.query(
    'DELETE FROM ordenes_servicios'
  );

  await client.query(
    'DELETE FROM agendamientos'
  );

  await client.query(
    'DELETE FROM ordenes_trabajo'
  );

  await client.query(
    'DELETE FROM vehiculos'
  );

  await client.query(
    'DELETE FROM clientes'
  );

  console.log(
    '[IMPORTACIÓN] Datos de prueba eliminados.'
  );
}

async function main() {
  const client = await getClient();

  try {
    console.log(
      '[IMPORTACIÓN] Leyendo datos del SQLite...'
    );

    const clientes = await sqliteAll(
      'SELECT * FROM clientes'
    );

    const vehiculos = await sqliteAll(
      'SELECT * FROM vehiculos'
    );

    const ordenes = await sqliteAll(
      'SELECT * FROM ordenes_trabajo'
    );

    const servicios = await sqliteAll(
      'SELECT * FROM ordenes_servicios'
    );
    /*
 * Algumas ordens de teste podem apontar para clientes
 * ou veículos que já foram excluídos.
 * Essas ordens serão ignoradas nesta importação.
 */
const clienteIdsValidos = new Set(
  clientes.map((cliente) => Number(cliente.id))
);

const vehiculoIdsValidos = new Set(
  vehiculos.map((vehiculo) => Number(vehiculo.id))
);

const ordenesValidas = ordenes.filter((orden) => {
  return (
    clienteIdsValidos.has(Number(orden.cliente_id)) &&
    vehiculoIdsValidos.has(Number(orden.vehiculo_id))
  );
});

const ordenesIgnoradas = ordenes.filter((orden) => {
  return (
    !clienteIdsValidos.has(Number(orden.cliente_id)) ||
    !vehiculoIdsValidos.has(Number(orden.vehiculo_id))
  );
});

const ordenesValidasIds = new Set(
  ordenesValidas.map((orden) => Number(orden.id))
);

const serviciosValidos = servicios.filter((servicio) =>
  ordenesValidasIds.has(Number(servicio.orden_id))
);

    console.log(
      `SQLite → clientes: ${clientes.length}`
    );

    console.log(
      `SQLite → vehículos: ${vehiculos.length}`
    );

    console.log(
      `SQLite → órdenes: ${ordenes.length}`
    );

    console.log(
      `SQLite → servicios: ${servicios.length}`
    );
    console.log(
      `Órdenes válidas para importar: ${ordenesValidas.length}`
    );
    
    console.log(
      `Órdenes de vehículos/clientes eliminados: ${ordenesIgnoradas.length}`
    );
    
    console.log(
      `Servicios válidos para importar: ${serviciosValidos.length}`
    );
    
    if (ordenesIgnoradas.length > 0) {
      console.log(
        'Órdenes ignoradas:',
        ordenesIgnoradas.map((orden) => ({
          id: orden.id,
          numeroOs: orden.numero_os,
          clienteId: orden.cliente_id,
          vehiculoId: orden.vehiculo_id
        }))
      );
    }

    await client.query('BEGIN');

    await limpiarPostgres(client);

    await importTableWithId(
      client,
      'clientes',
      clientes
    );

    await importTableWithId(
      client,
      'vehiculos',
      vehiculos
    );

    await importTableWithId(
      client,
      'ordenes_trabajo',
      ordenesValidas
    );

    await importOrdenesServicios(
      client,
      serviciosValidos
    );

    await client.query('COMMIT');

    console.log('');
    console.log(
      '[PostgreSQL] Importación finalizada correctamente.'
    );

    console.log(
      'IDs, vínculos, histórico y códigos QR fueron preservados.'
    );
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Mantém o erro original.
    }

    console.error('');
    console.error(
      '[PostgreSQL] Error durante la importación.'
    );

    console.error(error);

    process.exitCode = 1;
  } finally {
    client.release();

    await closeDatabase();
    await closePool();
  }
}

main();