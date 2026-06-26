const { get } = require('../database/connection');

async function getEmpresa() {
  return get('SELECT * FROM empresa WHERE id = 1');
}

module.exports = { getEmpresa };
