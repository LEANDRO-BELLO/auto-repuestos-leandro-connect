const { query, closePool } = require('./postgres');

async function migrarVehiculos() {
  try {
    await query(`
      ALTER TABLE vehiculos
      ADD COLUMN IF NOT EXISTS codigo TEXT
    `);

    await query(`
      ALTER TABLE vehiculos
      ADD COLUMN IF NOT EXISTS anio INTEGER
    `);

    await query(`
      ALTER TABLE vehiculos
      ADD COLUMN IF NOT EXISTS color TEXT
    `);

    await query(`
      ALTER TABLE vehiculos
      ADD COLUMN IF NOT EXISTS chasis TEXT
    `);

    await query(`
      ALTER TABLE vehiculos
      ADD COLUMN IF NOT EXISTS observaciones TEXT
    `);

    await query(`
      ALTER TABLE vehiculos
      ADD COLUMN IF NOT EXISTS data_geracao_qr TIMESTAMPTZ
    `);

    await query(`
      ALTER TABLE vehiculos
      ADD COLUMN IF NOT EXISTS ultima_impressao_qr TIMESTAMPTZ
    `);

    await query(`
      UPDATE vehiculos
      SET anio = ano
      WHERE anio IS NULL
        AND ano IS NOT NULL
    `);

    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vehiculos_codigo
      ON vehiculos(codigo)
      WHERE codigo IS NOT NULL
    `);

    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vehiculos_placa_upper
      ON vehiculos(UPPER(TRIM(placa)))
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente_id
      ON vehiculos(cliente_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_vehiculos_qr_code
      ON vehiculos(qr_code)
    `);

    console.log(
      '[PostgreSQL] Tabla vehículos actualizada correctamente.'
    );
  } catch (error) {
    console.error(
      '[PostgreSQL] Error al actualizar la tabla vehículos.'
    );
    console.error(error);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

migrarVehiculos();