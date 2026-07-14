const fs = require('fs');
const path = require('path');
const { ensureDataDir, getDatabase, closeDatabase, get, run } = require('./connection');
const logger = require('../utils/logger');

const SCHEMA_VERSION = 10;

const MIGRATIONS = [
  { version: 1, file: '001-inicial.sql', seed: true },
  { version: 2, file: '002-clientes.sql', seed: false },
  { version: 3, file: '003-vehiculos.sql', seed: false },
  { version: 4, file: '004-ordenes.sql', seed: false },
  { version: 5, file: '005-ordenes-servicios.sql', seed: false },
  { version: 6, file: '006-ordenes-campos.sql', seed: false },
  { version: 7, file: '007-ordenes-servicios-km.sql', seed: false },
  { version: 8, file: '008-ordenes-factura.sql', seed: false },
  { version: 9, file: '009-config-etiqueta-qr.sql', seed: false },
  { version: 10, file: '010-vehiculos-qr.sql', seed: false }
];

async function seedInitialData() {
  await run(
    `INSERT OR IGNORE INTO usuarios (id, nombre, usuario, password, perfil, activo)
     VALUES (1, 'Administrador', 'admin', 'admin', 'Administrador', 1)`
  );

  await run(
    `INSERT OR IGNORE INTO empresa (id, nombre, direccion, telefono, whatsapp, email, ruc)
     VALUES (1, ?, ?, ?, ?, ?, ?)`,
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

async function applySchemaFile(filename) {
  const schemaPath = path.join(__dirname, 'schema', filename);
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const statements = schemaSql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await run(statement);
  }
}

async function getCurrentSchemaVersion() {
  const table = await get(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_version'"
  );

  if (!table) {
    return null;
  }

  return get('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1');
}

async function initializeDatabase() {
  ensureDataDir();
  getDatabase();

  const currentVersion = (await getCurrentSchemaVersion())?.version ?? 0;

  if (currentVersion >= SCHEMA_VERSION) {
    logger.info('Base de datos ya inicializada.');
    return;
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) {
      continue;
    }

    logger.info(`Aplicando migración v${migration.version}...`);
    await applySchemaFile(migration.file);
    await run('INSERT OR IGNORE INTO schema_version (version) VALUES (?)', [migration.version]);

    if (migration.seed) {
      await seedInitialData();
    }
  }

  logger.info('Base de datos inicializada correctamente.');
}

async function runStandalone() {
  try {
    await initializeDatabase();
    await closeDatabase();
    console.log('Banco SQLite listo.');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runStandalone();
}

module.exports = { initializeDatabase, SCHEMA_VERSION };
