const fs = require('fs');
const path = require('path');
const { ensureDataDir, getDatabase, closeDatabase, get, run } = require('./connection');
const logger = require('../utils/logger');

const SCHEMA_VERSION = 1;
const schemaPath = path.join(__dirname, 'schema', '001-inicial.sql');

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

async function applySchema() {
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

  const currentVersion = await getCurrentSchemaVersion();

  if (currentVersion?.version >= SCHEMA_VERSION) {
    logger.info('Base de datos ya inicializada.');
    return;
  }

  logger.info('Inicializando base de datos SQLite...');
  await applySchema();
  await run('INSERT OR IGNORE INTO schema_version (version) VALUES (?)', [SCHEMA_VERSION]);
  await seedInitialData();
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
