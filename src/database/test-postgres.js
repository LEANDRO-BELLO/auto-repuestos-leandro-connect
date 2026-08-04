const {
    testConnection,
    closePool
  } = require('./postgres');
  
  async function main() {
    try {
      const resultado = await testConnection();
  
      console.log('[PostgreSQL] Conexión correcta.');
      console.log('Banco:', resultado.banco);
      console.log('Fecha del servidor:', resultado.fecha_servidor);
    } catch (error) {
      console.error('[PostgreSQL] No fue posible conectar.');
      console.error(error.message);
      process.exitCode = 1;
    } finally {
      await closePool();
    }
  }
  
  main();