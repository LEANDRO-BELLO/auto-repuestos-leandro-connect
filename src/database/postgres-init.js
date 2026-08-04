const { query, closePool } = require('./postgres');

async function criarEstrutura() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id BIGSERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        usuario TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        perfil TEXT NOT NULL DEFAULT 'Administrador',
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS empresa (
        id BIGSERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        direccion TEXT,
        telefono TEXT,
        whatsapp TEXT,
        email TEXT,
        ruc TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id BIGSERIAL PRIMARY KEY,
        codigo TEXT UNIQUE,
        nombre TEXT NOT NULL,
        documento TEXT,
        direccion TEXT,
        telefono TEXT,
        whatsapp TEXT,
        email TEXT,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS vehiculos (
        id BIGSERIAL PRIMARY KEY,
        cliente_id BIGINT NOT NULL REFERENCES clientes(id),
        marca TEXT,
        modelo TEXT,
        placa TEXT NOT NULL UNIQUE,
        motor TEXT,
        kilometraje INTEGER,
        ano INTEGER,
        combustible TEXT,
        qr_code TEXT UNIQUE,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS ordenes_trabajo (
        id BIGSERIAL PRIMARY KEY,
        numero_os TEXT NOT NULL UNIQUE,
        cliente_id BIGINT NOT NULL REFERENCES clientes(id),
        vehiculo_id BIGINT NOT NULL REFERENCES vehiculos(id),
        kilometraje INTEGER,
        numero_factura TEXT,
        estado TEXT NOT NULL DEFAULT 'Abierta',
        fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_cierre TIMESTAMPTZ,
        observaciones TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS ordenes_servicios (
        id BIGSERIAL PRIMARY KEY,
        orden_id BIGINT NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
        codigo_servicio TEXT NOT NULL,
        nombre_servicio TEXT NOT NULL,
        kilometraje_proximo INTEGER,
        fecha_vencimiento DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS agendamientos (
        id BIGSERIAL PRIMARY KEY,
        cliente_id BIGINT REFERENCES clientes(id),
        vehiculo_id BIGINT REFERENCES vehiculos(id),
        cliente_nombre TEXT,
        cliente_telefono TEXT,
        vehiculo_descripcion TEXT,
        fecha DATE NOT NULL,
        hora TIME NOT NULL,
        observaciones TEXT,
        estado TEXT NOT NULL DEFAULT 'Pendiente',
        orden_id BIGINT REFERENCES ordenes_trabajo(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_clientes_nombre
      ON clientes(nombre)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente
      ON vehiculos(cliente_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_ordenes_cliente
      ON ordenes_trabajo(cliente_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_ordenes_vehiculo
      ON ordenes_trabajo(vehiculo_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_agendamientos_fecha
      ON agendamientos(fecha, hora)
    `);

    await query(
      `INSERT INTO usuarios
        (nombre, usuario, password, perfil, activo)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (usuario) DO NOTHING`,
      ['Administrador', 'admin', 'admin', 'Administrador']
    );

    const empresaExistente = await query(
      'SELECT id FROM empresa LIMIT 1'
    );

    if (empresaExistente.rowCount === 0) {
      await query(
        `INSERT INTO empresa
          (nombre, direccion, telefono, whatsapp, email, ruc)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'Auto Repuestos Leandro S.A.',
          'Katueté – Canindeyú – Paraguay',
          '+595 986 773 222',
          '+595 986 773 222',
          'autorepuestosleandrosa@hotmail.com',
          '80060789-9'
        ]
      );
    }

    console.log('[PostgreSQL] Estructura creada correctamente.');
  } catch (error) {
    console.error('[PostgreSQL] Error al crear la estructura.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

criarEstrutura();