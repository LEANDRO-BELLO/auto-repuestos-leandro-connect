const {
    query,
    getClient
  } = require('../database/postgres');
  
  const { generateQrCodeValue } = require('../utils/qr-code');
  
  const RAILWAY_URL =
    'https://auto-repuestos-leandro-connect-production.up.railway.app';
  
  function mapVehiculo(row) {
    if (!row) {
      return null;
    }
  
    return {
      id: Number(row.id),
      codigo: row.codigo || '',
      clienteId: Number(row.cliente_id),
      clienteNombre: row.cliente_nombre || '',
      clienteCodigo: row.cliente_codigo || '',
      placa: row.placa || '',
      marca: row.marca || '',
      modelo: row.modelo || '',
      anio: row.anio ?? null,
      color: row.color || '',
      motor: row.motor || '',
      combustible: row.combustible || '',
      chasis: row.chasis || '',
      kilometraje: row.kilometraje ?? null,
      observaciones: row.observaciones || '',
      qrCode: row.qr_code || null,
      dataGeracaoQr: row.data_geracao_qr || null,
      ultimaImpressaoQr: row.ultima_impressao_qr || null,
      creadoEn: row.created_at,
      actualizadoEn: row.updated_at
    };
  }
  
  const BASE_SELECT = `
    SELECT
      v.id,
      v.codigo,
      v.cliente_id,
      v.placa,
      v.marca,
      v.modelo,
      v.anio,
      v.color,
      v.motor,
      v.combustible,
      v.chasis,
      v.kilometraje,
      v.observaciones,
      v.qr_code,
      v.data_geracao_qr,
      v.ultima_impressao_qr,
      v.created_at,
      v.updated_at,
      c.nombre AS cliente_nombre,
      c.codigo AS cliente_codigo
    FROM vehiculos v
    INNER JOIN clientes c
      ON c.id = v.cliente_id
  `;
  
  function normalizarEntero(valor) {
    if (
      valor === null ||
      valor === undefined ||
      String(valor).trim() === ''
    ) {
      return null;
    }
  
    const numero = Number.parseInt(valor, 10);
  
    return Number.isNaN(numero) ? null : numero;
  }
  
  async function generateCodigo(client) {
    /*
     * Este bloqueo evita que dos computadoras generen
     * el mismo código al mismo tiempo.
     */
    await client.query(
      'SELECT pg_advisory_xact_lock($1)',
      [2026080302]
    );
  
    const result = await client.query(`
      SELECT codigo
      FROM vehiculos
      WHERE codigo LIKE 'VEH-%'
      ORDER BY CAST(SUBSTRING(codigo FROM 5) AS INTEGER) DESC
      LIMIT 1
    `);
  
    const row = result.rows[0];
  
    if (!row) {
      return 'VEH-0001';
    }
  
    const actual = Number.parseInt(
      String(row.codigo).replace('VEH-', ''),
      10
    );
  
    const siguiente =
      (Number.isNaN(actual) ? 0 : actual) + 1;
  
    return `VEH-${String(siguiente).padStart(4, '0')}`;
  }
  
  async function syncVehiculoRailway(vehiculo) {
    if (!vehiculo) {
      return false;
    }
  
    try {
      const response = await fetch(
        `${RAILWAY_URL}/api/sync/vehiculo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: vehiculo.id,
            codigo: vehiculo.codigo,
            cliente_id: vehiculo.clienteId,
            placa: vehiculo.placa,
            marca: vehiculo.marca,
            modelo: vehiculo.modelo,
            anio: vehiculo.anio,
            color: vehiculo.color,
            motor: vehiculo.motor,
            combustible: vehiculo.combustible,
            chasis: vehiculo.chasis,
            kilometraje: vehiculo.kilometraje,
            observaciones: vehiculo.observaciones,
            qr_code: vehiculo.qrCode,
            data_geracao_qr: vehiculo.dataGeracaoQr
          })
        }
      );
  
      const texto = await response.text();
  
      console.log(
        'RESPUESTA SYNC VEHÍCULO:',
        response.status,
        texto
      );
  
      return response.ok;
    } catch (error) {
      console.error(
        'No se pudo sincronizar el vehículo:',
        error.message
      );
  
      return false;
    }
  }
  
  async function listVehiculos(search = '') {
    const term = String(search || '').trim();
  
    if (!term) {
      const result = await query(`
        ${BASE_SELECT}
        ORDER BY UPPER(v.placa) ASC
      `);
  
      return result.rows.map(mapVehiculo);
    }
  
    const like = `%${term}%`;
  
    const result = await query(
      `
        ${BASE_SELECT}
        WHERE v.placa ILIKE $1
           OR v.marca ILIKE $1
           OR v.modelo ILIKE $1
           OR v.codigo ILIKE $1
           OR v.motor ILIKE $1
           OR v.chasis ILIKE $1
           OR c.nombre ILIKE $1
           OR c.codigo ILIKE $1
        ORDER BY UPPER(v.placa) ASC
      `,
      [like]
    );
  
    return result.rows.map(mapVehiculo);
  }
  
  async function ensureQrCodeForVehiculo(id) {
    const result = await query(
      `
        SELECT id, qr_code
        FROM vehiculos
        WHERE id = $1
      `,
      [Number(id)]
    );
  
    const row = result.rows[0];
  
    if (!row || row.qr_code) {
      return;
    }
  
    const qrCode = generateQrCodeValue();
  
    await query(
      `
        UPDATE vehiculos
        SET
          qr_code = $1,
          data_geracao_qr = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [
        qrCode,
        Number(id)
      ]
    );
  }
  
  async function getVehiculo(id) {
    const vehiculoId = Number(id);
  
    if (!Number.isInteger(vehiculoId) || vehiculoId <= 0) {
      return null;
    }
  
    await ensureQrCodeForVehiculo(vehiculoId);
  
    const result = await query(
      `
        ${BASE_SELECT}
        WHERE v.id = $1
      `,
      [vehiculoId]
    );
  
    return mapVehiculo(result.rows[0]);
  }
  
  async function createVehiculo(data = {}) {
    const placa = String(data.placa || '').trim().toUpperCase();
    const clienteId = Number(data.clienteId);
  
    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      return {
        ok: false,
        error: 'Seleccione un cliente.'
      };
    }
  
    if (!placa) {
      return {
        ok: false,
        error: 'La placa es obligatoria.'
      };
    }
  
    const client = await getClient();
  
    try {
      await client.query('BEGIN');
  
      const clienteResult = await client.query(
        `
          SELECT id
          FROM clientes
          WHERE id = $1
        `,
        [clienteId]
      );
  
      if (clienteResult.rowCount === 0) {
        await client.query('ROLLBACK');
  
        return {
          ok: false,
          error: 'Cliente no encontrado.'
        };
      }
  
      const placaResult = await client.query(
        `
          SELECT id
          FROM vehiculos
          WHERE UPPER(TRIM(placa)) = UPPER(TRIM($1))
          LIMIT 1
        `,
        [placa]
      );
  
      if (placaResult.rowCount > 0) {
        await client.query('ROLLBACK');
  
        return {
          ok: false,
          error: 'Ya existe un vehículo con esa placa.'
        };
      }
  
      const codigo = await generateCodigo(client);
      const qrCode = generateQrCodeValue();
  
      const result = await client.query(
        `
          INSERT INTO vehiculos (
            codigo,
            cliente_id,
            placa,
            marca,
            modelo,
            anio,
            color,
            motor,
            combustible,
            chasis,
            kilometraje,
            observaciones,
            qr_code,
            data_geracao_qr,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
          RETURNING id
        `,
        [
          codigo,
          clienteId,
          placa,
          String(data.marca || '').trim() || null,
          String(data.modelo || '').trim() || null,
          normalizarEntero(data.anio),
          String(data.color || '').trim() || null,
          String(data.motor || '').trim() || null,
          String(data.combustible || '').trim() || null,
          String(data.chasis || '').trim() || null,
          normalizarEntero(data.kilometraje),
          String(data.observaciones || '').trim() || null,
          qrCode
        ]
      );
  
      await client.query('COMMIT');
  
      const vehiculo = await getVehiculo(
        result.rows[0].id
      );
  
      await syncVehiculoRailway(vehiculo);
  
      return {
        ok: true,
        vehiculo
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // No reemplaza el error principal.
      }
  
      if (
        error?.code === '23505' &&
        String(error.constraint || '').includes('placa')
      ) {
        return {
          ok: false,
          error: 'Ya existe un vehículo con esa placa.'
        };
      }
  
      if (
        error?.code === '23505' &&
        String(error.constraint || '').includes('codigo')
      ) {
        return {
          ok: false,
          error:
            'No se pudo generar el código del vehículo. Intente nuevamente.'
        };
      }
  
      console.error(
        'Error al crear vehículo en PostgreSQL:',
        error
      );
  
      return {
        ok: false,
        error: 'No se pudo crear el vehículo.'
      };
    } finally {
      client.release();
    }
  }
  
  async function updateVehiculo(id, data = {}) {
    const vehiculoId = Number(id);
    const placa = String(data.placa || '').trim().toUpperCase();
    const clienteId = Number(data.clienteId);

    console.log('CLIENTE RECEBIDO PARA VEHÍCULO:', {
      valorOriginal: data.clienteId,
      clienteIdConvertido: clienteId
    });
  
    if (!Number.isInteger(vehiculoId) || vehiculoId <= 0) {
      return {
        ok: false,
        error: 'Vehículo no encontrado.'
      };
    }
  
    const existing = await getVehiculo(vehiculoId);
  
    if (!existing) {
      return {
        ok: false,
        error: 'Vehículo no encontrado.'
      };
    }
  
    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      return {
        ok: false,
        error: 'Seleccione un cliente.'
      };
    }
  
    if (!placa) {
      return {
        ok: false,
        error: 'La placa es obligatoria.'
      };
    }
  
    const clienteResult = await query(
      `
        SELECT id
        FROM clientes
        WHERE id = $1 
      `,
      [clienteId]
    );

    console.log(
      'RESULTADO CLIENTE POSTGRES:',
      clienteResult.rows
    );
  
    if (clienteResult.rowCount === 0) {
      return {
        ok: false,
        error: 'Cliente no encontrado.'
      };
    }
  
    const placaResult = await query(
      `
        SELECT id
        FROM vehiculos
        WHERE UPPER(TRIM(placa)) = UPPER(TRIM($1))
          AND id <> $2
        LIMIT 1
      `,
      [
        placa,
        vehiculoId
      ]
    );
  
    if (placaResult.rowCount > 0) {
      return {
        ok: false,
        error: 'Ya existe un vehículo con esa placa.'
      };
    }
  
    try {
      await query(
        `
          UPDATE vehiculos
          SET
            cliente_id = $1,
            placa = $2,
            marca = $3,
            modelo = $4,
            anio = $5,
            color = $6,
            motor = $7,
            combustible = $8,
            chasis = $9,
            kilometraje = $10,
            observaciones = $11,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $12
        `,
        [
          clienteId,
          placa,
          String(data.marca || '').trim() || null,
          String(data.modelo || '').trim() || null,
          normalizarEntero(data.anio),
          String(data.color || '').trim() || null,
          String(data.motor || '').trim() || null,
          String(data.combustible || '').trim() || null,
          String(data.chasis || '').trim() || null,
          normalizarEntero(data.kilometraje),
          String(data.observaciones || '').trim() || null,
          vehiculoId
        ]
      );
  
      const vehiculo = await getVehiculo(vehiculoId);
  
      await syncVehiculoRailway(vehiculo);
  
      return {
        ok: true,
        vehiculo
      };
    } catch (error) {
      if (error?.code === '23505') {
        return {
          ok: false,
          error: 'Ya existe un vehículo con esa placa.'
        };
      }
  
      console.error(
        'Error al actualizar vehículo en PostgreSQL:',
        error
      );
  
      return {
        ok: false,
        error: 'No se pudo actualizar el vehículo.'
      };
    }
  }
  
  async function deleteVehiculo(id) {
    const vehiculoId = Number(id);
    const existing = await getVehiculo(vehiculoId);
  
    if (!existing) {
      return {
        ok: false,
        error: 'Vehículo no encontrado.'
      };
    }
  
    const ordenesResult = await query(
      `
        SELECT COUNT(*)::INTEGER AS cantidad
        FROM ordenes_trabajo
        WHERE vehiculo_id = $1
      `,
      [vehiculoId]
    );
  
    if (ordenesResult.rows[0].cantidad > 0) {
      return {
        ok: false,
        error:
          'No se puede eliminar el vehículo porque posee órdenes de trabajo registradas.'
      };
    }
  
    const agendamientosResult = await query(
      `
        SELECT COUNT(*)::INTEGER AS cantidad
        FROM agendamientos
        WHERE vehiculo_id = $1
      `,
      [vehiculoId]
    );
  
    if (agendamientosResult.rows[0].cantidad > 0) {
      return {
        ok: false,
        error:
          'No se puede eliminar el vehículo porque posee agendamientos registrados.'
      };
    }
  
    await query(
      `
        DELETE FROM vehiculos
        WHERE id = $1
      `,
      [vehiculoId]
    );
  
    return {
      ok: true
    };
  }
  
  async function recordEtiquetaPrint(id) {
    const vehiculoId = Number(id);
    const existing = await getVehiculo(vehiculoId);
  
    if (!existing) {
      return {
        ok: false,
        error: 'Vehículo no encontrado.'
      };
    }
  
    await query(
      `
        UPDATE vehiculos
        SET
          ultima_impressao_qr = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [vehiculoId]
    );
  
    return {
      ok: true,
      vehiculo: await getVehiculo(vehiculoId)
    };
  }
  
  async function getVehiculoByQrCode(qrCode) {
    const codigoQr = String(qrCode || '').trim();
  
    if (!codigoQr) {
      return null;
    }
  
    const result = await query(
      `
        ${BASE_SELECT}
        WHERE v.qr_code = $1
      `,
      [codigoQr]
    );
  
    return mapVehiculo(result.rows[0]);
  }
  
  module.exports = {
    listVehiculos,
    getVehiculo,
    getVehiculoByQrCode,
    createVehiculo,
    updateVehiculo,
    deleteVehiculo,
    recordEtiquetaPrint
  };