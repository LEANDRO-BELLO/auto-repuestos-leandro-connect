const { query, closePool } = require('./postgres');

async function migrarClientes() {
  try {
    await query(`
      ALTER TABLE clientes
      ADD COLUMN IF NOT EXISTS ciudad TEXT
    `);

    await query(`
      ALTER TABLE clientes
      ADD COLUMN IF NOT EXISTS observaciones TEXT
    `);

    await query(`
      ALTER TABLE clientes
      ADD COLUMN IF NOT EXISTS ultima_visita DATE
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_clientes_codigo
      ON clientes(codigo)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_clientes_documento
      ON clientes(documento)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_clientes_busqueda_nombre
      ON clientes(LOWER(nombre))
    `);

    console.log(
      '[PostgreSQL] Tabla clientes actualizada correctamente.'
    );
  } catch (error) {
    console.error(
      '[PostgreSQL] Error al actualizar la tabla clientes.'
    );
    console.error(error);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

migrarClientes();