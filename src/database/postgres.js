const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'auto_repuestos_leandro',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'Leandro@2026'
});

pool.query(
  "SELECT current_database(), inet_server_addr(), inet_server_port()"
)
.then((r) => {
  console.log("[POSTGRES]", r.rows[0]);
})
.catch(console.error);

pool.on('error', (error) => {
  console.error('[PostgreSQL] Error inesperado:', error);
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

async function testConnection() {
  const result = await query(
    'SELECT NOW() AS fecha_servidor, current_database() AS banco'
  );

  return result.rows[0];
}

async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool
};