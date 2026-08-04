const { query, closePool } = require('./postgres');

async function migrarOrdenes() {
  try {
    /*
     * Completa a tabela principal de ordens sem apagar
     * nenhuma coluna ou informação que já exista.
     */
    await query(`
      ALTER TABLE ordenes_trabajo
      ADD COLUMN IF NOT EXISTS fecha DATE
    `);

    await query(`
      ALTER TABLE ordenes_trabajo
      ADD COLUMN IF NOT EXISTS intervalo INTEGER
    `);

    await query(`
      ALTER TABLE ordenes_trabajo
      ADD COLUMN IF NOT EXISTS proximo_km INTEGER
    `);

    await query(`
      ALTER TABLE ordenes_trabajo
      ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE
    `);

    await query(`
      ALTER TABLE ordenes_trabajo
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);

    await query(`
      ALTER TABLE ordenes_trabajo
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);

    /*
     * Aproveita a data de abertura nas ordens que eventualmente
     * já existirem no PostgreSQL.
     */
    await query(`
      UPDATE ordenes_trabajo
      SET fecha = COALESCE(
        fecha,
        fecha_apertura::DATE,
        CURRENT_DATE
      )
      WHERE fecha IS NULL
    `);

    /*
     * Completa a tabela que guarda os serviços selecionados
     * em cada ordem.
     */
    await query(`
      ALTER TABLE ordenes_servicios
      ADD COLUMN IF NOT EXISTS servicio TEXT
    `);

    await query(`
      ALTER TABLE ordenes_servicios
      ADD COLUMN IF NOT EXISTS proximo_km INTEGER
    `);

    await query(`
      ALTER TABLE ordenes_servicios
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);

    /*
     * Converte dados antigos, caso já exista alguma informação.
     */
    await query(`
      UPDATE ordenes_servicios
      SET servicio = codigo_servicio
      WHERE servicio IS NULL
        AND codigo_servicio IS NOT NULL
    `);

    await query(`
      UPDATE ordenes_servicios
      SET proximo_km = kilometraje_proximo
      WHERE proximo_km IS NULL
        AND kilometraje_proximo IS NOT NULL
    `);

    /*
     * Índices para busca rápida e para uso simultâneo
     * por vários computadores.
     */
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        idx_ordenes_numero_os
      ON ordenes_trabajo(numero_os)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS
        idx_ordenes_cliente_id
      ON ordenes_trabajo(cliente_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS
        idx_ordenes_vehiculo_id
      ON ordenes_trabajo(vehiculo_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS
        idx_ordenes_fecha
      ON ordenes_trabajo(fecha DESC)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS
        idx_ordenes_estado
      ON ordenes_trabajo(estado)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS
        idx_ordenes_factura
      ON ordenes_trabajo(numero_factura)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS
        idx_ordenes_servicios_orden
      ON ordenes_servicios(orden_id)
    `);

    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        idx_ordenes_servicio_unico
      ON ordenes_servicios(orden_id, servicio)
      WHERE servicio IS NOT NULL
    `);

    console.log(
      '[PostgreSQL] Tablas de órdenes actualizadas correctamente.'
    );
  } catch (error) {
    console.error(
      '[PostgreSQL] Error al actualizar las tablas de órdenes.'
    );
    console.error(error);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

migrarOrdenes();