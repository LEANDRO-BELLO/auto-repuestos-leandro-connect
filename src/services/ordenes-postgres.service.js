const {
    query,
    getClient
  } = require('../database/postgres');
  
  const RAILWAY_URL =
    'https://auto-repuestos-leandro-connect-production.up.railway.app';
  
  const ESTADOS = ['Abierta', 'En proceso', 'Finalizada'];
  
  const FACTURA_REGEX = /^\d{3}-\d{3}-\d{7}$/;
  
  const SERVICIOS_CATALOGO = [
    { id: 'aceite_motor', label: 'Cambio de aceite motor' },
    { id: 'filtro_aceite', label: 'Filtro de aceite' },
    { id: 'filtro_aire', label: 'Filtro de aire' },
    {
      id: 'filtro_combustible',
      label: 'Filtro de combustible'
    },
    {
      id: 'filtro_secundario',
      label: 'Filtro secundario'
    },
    {
      id: 'filtro_aire_ac',
      label: 'Filtro de aire acondicionado'
    },
    {
      id: 'aceite_caja_cambio',
      label: 'Cambio de aceite caja de cambio'
    },
    {
      id: 'aceite_caja_transferencia',
      label: 'Cambio de aceite caja de transferencia'
    },
    {
      id: 'aceite_dif_del',
      label: 'Cambio de aceite diferencial delantero'
    },
    {
      id: 'aceite_dif_tras',
      label: 'Cambio de aceite diferencial trasero'
    },
    {
      id: 'aceite_direccion',
      label: 'Cambio de aceite de dirección'
    },
    {
      id: 'fluido_radiador',
      label: 'Cambio de fluido de radiador'
    },
    {
      id: 'fluido_freno',
      label: 'Cambio de fluido de freno'
    },
    {
      id: 'pastilla_freno_delantera',
      label: 'Cambio de pastilla de freno delantera'
    },
    {
      id: 'pastilla_freno_trasera',
      label: 'Cambio de pastilla de freno trasera'
    },
    {
      id: 'engrase_crucetas',
      label: 'Engrase de crucetas'
    },
    {
      id: 'filtro_caja_automatica',
      label: 'Filtro caja automática'
    }
  ];
  
  const SERVICIO_IDS = new Set(
    SERVICIOS_CATALOGO.map((servicio) => servicio.id)
  );
  
  const SERVICIO_LABELS = new Map(
    SERVICIOS_CATALOGO.map((servicio) => [
      servicio.id,
      servicio.label
    ])
  );
  
  function parseIntOrNull(value) {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ''
    ) {
      return null;
    }
  
    const parsed = Number.parseInt(value, 10);
  
    return Number.isNaN(parsed)
      ? null
      : parsed;
  }
  
  function mapOrden(row) {
    if (!row) {
      return null;
    }
  
    return {
      id: Number(row.id),
      numeroOs: row.numero_os,
      clienteId: Number(row.cliente_id),
      clienteNombre: row.cliente_nombre || '',
      clienteCodigo: row.cliente_codigo || '',
      vehiculoId: Number(row.vehiculo_id),
      vehiculoPlaca: row.vehiculo_placa || '',
      vehiculoMarca: row.vehiculo_marca || '',
      vehiculoModelo: row.vehiculo_modelo || '',
      fecha: row.fecha,
      kilometraje: row.kilometraje ?? null,
      intervalo: row.intervalo ?? null,
      proximoKm: row.proximo_km ?? null,
      fechaVencimiento: row.fecha_vencimiento || null,
      observaciones: row.observaciones || '',
      estado: row.estado,
      numeroFactura: row.numero_factura || null,
      creadoEn: row.created_at,
      actualizadoEn: row.updated_at
    };
  }
  
  const BASE_SELECT = `
    SELECT
      o.id,
      o.numero_os,
      o.cliente_id,
      o.vehiculo_id,
      o.fecha,
      o.kilometraje,
      o.intervalo,
      o.proximo_km,
      o.fecha_vencimiento,
      o.observaciones,
      o.estado,
      o.numero_factura,
      o.created_at,
      o.updated_at,
      c.nombre AS cliente_nombre,
      c.codigo AS cliente_codigo,
      v.placa AS vehiculo_placa,
      v.marca AS vehiculo_marca,
      v.modelo AS vehiculo_modelo
    FROM ordenes_trabajo o
    INNER JOIN clientes c
      ON c.id = o.cliente_id
    INNER JOIN vehiculos v
      ON v.id = o.vehiculo_id
  `;
  
  async function generateNumeroOs(client) {
    await client.query(
      'SELECT pg_advisory_xact_lock($1)',
      [2026080303]
    );
  
    const result = await client.query(`
      SELECT numero_os
      FROM ordenes_trabajo
      WHERE numero_os LIKE 'OS-%'
      ORDER BY
        CAST(SUBSTRING(numero_os FROM 4) AS INTEGER) DESC
      LIMIT 1
    `);
  
    const row = result.rows[0];
  
    if (!row) {
      return 'OS-0001';
    }
  
    const actual = Number.parseInt(
      String(row.numero_os).replace('OS-', ''),
      10
    );
  
    const siguiente =
      (Number.isNaN(actual) ? 0 : actual) + 1;
  
    return `OS-${String(siguiente).padStart(4, '0')}`;
  }
  async function listOrdenes(search = '') {
    const term = String(search || '').trim();
  
    if (!term) {
      const result = await query(`
        ${BASE_SELECT}
        ORDER BY o.fecha DESC, o.id DESC
      `);
  
      return result.rows.map(mapOrden);
    }
  
    const like = `%${term}%`;
  
    const result = await query(
      `
        ${BASE_SELECT}
        WHERE o.numero_os ILIKE $1
           OR c.nombre ILIKE $1
           OR v.placa ILIKE $1
           OR v.marca ILIKE $1
           OR v.modelo ILIKE $1
           OR o.estado ILIKE $1
           OR COALESCE(o.numero_factura, '') ILIKE $1
        ORDER BY o.fecha DESC, o.id DESC
      `,
      [like]
    );
  
    return result.rows.map(mapOrden);
  }
  
  async function getServiciosByOrden(
    ordenId,
    client = null
  ) {
    const executor = client || { query };
  
    const result = await executor.query(
      `
        SELECT servicio, proximo_km
        FROM ordenes_servicios
        WHERE orden_id = $1
        ORDER BY servicio ASC
      `,
      [Number(ordenId)]
    );
  
    return result.rows.map((row) => ({
      id: row.servicio,
      proximoKm: row.proximo_km ?? null
    }));
  }
  
  async function saveServiciosForOrden(
    client,
    ordenId,
    servicios = []
  ) {
    await client.query(
      `
        DELETE FROM ordenes_servicios
        WHERE orden_id = $1
      `,
      [Number(ordenId)]
    );
  
    for (const item of servicios) {
      const id =
        typeof item === 'string'
          ? item
          : item?.id;
  
      const proximoKm =
        typeof item === 'string'
          ? null
          : parseIntOrNull(item?.proximoKm);
  
      if (!SERVICIO_IDS.has(id)) {
        continue;
      }
  
      const label = SERVICIO_LABELS.get(id) || id;
  
      await client.query(
        `
          INSERT INTO ordenes_servicios (
            orden_id,
            servicio,
            proximo_km,
            codigo_servicio,
            nombre_servicio,
            kilometraje_proximo
          )
          VALUES ($1, $2, $3, $2, $4, $3)
        `,
        [
          Number(ordenId),
          id,
          proximoKm,
          label
        ]
      );
    }
  }
  
  async function getOrden(id) {
    const ordenId = Number(id);
  
    if (!Number.isInteger(ordenId) || ordenId <= 0) {
      return null;
    }
  
    const result = await query(
      `
        ${BASE_SELECT}
        WHERE o.id = $1
      `,
      [ordenId]
    );
  
    const orden = mapOrden(result.rows[0]);
  
    if (!orden) {
      return null;
    }
  
    const serviciosRows =
      await getServiciosByOrden(ordenId);
  
    orden.servicios = serviciosRows.map(
      (servicio) => servicio.id
    );
  
    orden.serviciosKm = Object.fromEntries(
      serviciosRows.map((servicio) => [
        servicio.id,
        servicio.proximoKm
      ])
    );
  
    return orden;
  }
  
  async function syncOrdenRailway(orden) {
    if (!orden) {
      return;
    }
  
    if (orden.estado !== 'Finalizada') {
      console.log(
        'Orden todavía no finalizada. No se envió al portal:',
        orden.numeroOs
      );
      return;
    }
  
    const serviciosRows =
      await getServiciosByOrden(orden.id);
  
    const payload = {
      orden: {
        id: orden.id,
        numero_os: orden.numeroOs,
        cliente_id: orden.clienteId,
        vehiculo_id: orden.vehiculoId,
        fecha: orden.fecha,
        kilometraje: orden.kilometraje,
        intervalo: orden.intervalo,
        proximo_km: orden.proximoKm,
        fecha_vencimiento: orden.fechaVencimiento,
        observaciones: orden.observaciones || null,
        estado: orden.estado,
        numero_factura: orden.numeroFactura
      },
  
      servicios: serviciosRows.map((servicio) => ({
        servicio: servicio.id,
        proximo_km: servicio.proximoKm
      }))
    };
  
    try {
      console.log(
        'Enviando orden al Railway:',
        orden.numeroOs,
        orden.vehiculoPlaca
      );
  
      const response = await fetch(
        `${RAILWAY_URL}/api/sync/orden`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );
  
      const texto = await response.text();
  
      console.log(
        'RESPUESTA SYNC ORDEN:',
        response.status,
        texto
      );
  
      if (!response.ok) {
        console.error(
          'El Railway rechazó la orden:',
          response.status,
          texto
        );
        return;
      }
  
      console.log(
        'Orden sincronizada con Railway:',
        orden.numeroOs
      );
    } catch (error) {
      console.error(
        'No se pudo sincronizar la orden:',
        error.message
      );
    }
  }
  async function listVehiculosByCliente(clienteId) {
    const id = Number(clienteId);
  
    if (!Number.isInteger(id) || id <= 0) {
      return [];
    }
  
    const result = await query(
      `
        SELECT
          v.id,
          v.codigo,
          v.cliente_id,
          v.placa,
          v.marca,
          v.modelo,
          v.anio,
          v.kilometraje,
          c.nombre AS cliente_nombre,
          c.codigo AS cliente_codigo
        FROM vehiculos v
        INNER JOIN clientes c
          ON c.id = v.cliente_id
        WHERE v.cliente_id = $1
        ORDER BY UPPER(v.placa) ASC
      `,
      [id]
    );
  
    return result.rows.map((row) => ({
      id: Number(row.id),
      codigo: row.codigo,
      clienteId: Number(row.cliente_id),
      clienteNombre: row.cliente_nombre,
      clienteCodigo: row.cliente_codigo,
      placa: row.placa,
      marca: row.marca || '',
      modelo: row.modelo || '',
      anio: row.anio ?? null,
      kilometraje: row.kilometraje ?? null
    }));
  }
  
  async function searchVehiculosForOrden(search = '') {
    try {
      const term = String(search || '').trim();
  
      console.log(
        '[ORDENES POSTGRES] Buscando vehículo:',
        term
      );
  
      if (!term) {
        return [];
      }
  
      const like = `%${term}%`;
  
      const result = await query(
        `
          SELECT
            v.id,
            v.cliente_id,
            v.placa,
            v.marca,
            v.modelo,
            v.kilometraje,
            c.nombre AS cliente_nombre,
            c.codigo AS cliente_codigo
          FROM vehiculos v
          INNER JOIN clientes c
            ON c.id = v.cliente_id
          WHERE COALESCE(c.nombre, '') ILIKE $1
             OR COALESCE(v.placa, '') ILIKE $1
             OR COALESCE(c.codigo, '') ILIKE $1
             OR COALESCE(v.marca, '') ILIKE $1
             OR COALESCE(v.modelo, '') ILIKE $1
          ORDER BY UPPER(v.placa) ASC
          LIMIT 25
        `,
        [like]
      );
  
      console.log(
        '[ORDENES POSTGRES] Vehículos encontrados:',
        result.rows.length,
        result.rows
      );
  
      return result.rows.map((row) => ({
        id: Number(row.id),
        clienteId: Number(row.cliente_id),
        clienteNombre: row.cliente_nombre || '',
        clienteCodigo: row.cliente_codigo || '',
        placa: row.placa || '',
        marca: row.marca || '',
        modelo: row.modelo || '',
        kilometraje: row.kilometraje ?? null
      }));
    } catch (error) {
      console.error(
        '[ORDENES POSTGRES] Error al buscar vehículos:',
        error
      );
  
      return [];
    }
  }
  
  function validateNumeroFactura(
    value,
    required = false
  ) {
    const factura = String(value || '').trim();
  
    if (!factura) {
      return required
        ? {
            ok: false,
            error: 'Ingrese el número de factura.'
          }
        : {
            ok: true,
            value: null
          };
    }
  
    if (!FACTURA_REGEX.test(factura)) {
      return {
        ok: false,
        error:
          'Formato inválido. Use XXX-XXX-XXXXXXX (ej: 001-001-0000123).'
      };
    }
  
    return {
      ok: true,
      value: factura
    };
  }
  
  function resolveNumeroFactura(
    data,
    existing = null,
    estado
  ) {
    if (estado === 'Finalizada') {
      return validateNumeroFactura(
        data.numeroFactura,
        true
      );
    }
  
    if (existing?.numeroFactura) {
      return {
        ok: true,
        value: existing.numeroFactura
      };
    }
  
    return validateNumeroFactura(
      data.numeroFactura,
      false
    );
  }
  async function createOrden(data = {}) {
    const vehiculoId = Number(data.vehiculoId);
  
    if (
      !Number.isInteger(vehiculoId) ||
      vehiculoId <= 0
    ) {
      return {
        ok: false,
        error: 'Seleccione un vehículo.'
      };
    }
  
    const estado = ESTADOS.includes(data.estado)
      ? data.estado
      : 'Abierta';
  
    const facturaResult = resolveNumeroFactura(
      data,
      null,
      estado
    );
  
    if (!facturaResult.ok) {
      return {
        ok: false,
        error: facturaResult.error
      };
    }
  
    const kilometraje = parseIntOrNull(
      data.kilometraje
    );
  
    const intervalo = parseIntOrNull(
      data.intervalo
    );
  
    const proximoKm = parseIntOrNull(
      data.proximoKm
    );
  
    const fecha =
      String(data.fecha || '').trim() ||
      new Date().toISOString().slice(0, 10);
  
    const fechaVencimiento =
      String(data.fechaVencimiento || '').trim() ||
      null;
  
    const client = await getClient();
  
    try {
      await client.query('BEGIN');
  
      const vehiculoResult = await client.query(
        `
          SELECT id, cliente_id, placa
          FROM vehiculos
          WHERE id = $1
        `,
        [vehiculoId]
      );
  
      const vehiculo = vehiculoResult.rows[0];
  
      if (!vehiculo) {
        await client.query('ROLLBACK');
  
        return {
          ok: false,
          error: 'Vehículo no encontrado.'
        };
      }
  
      const numeroOs = await generateNumeroOs(client);
  
      const result = await client.query(
        `
          INSERT INTO ordenes_trabajo (
            numero_os,
            cliente_id,
            vehiculo_id,
            fecha,
            kilometraje,
            intervalo,
            proximo_km,
            fecha_vencimiento,
            observaciones,
            estado,
            numero_factura,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            CURRENT_TIMESTAMP
          )
          RETURNING id
        `,
        [
          numeroOs,
          Number(vehiculo.cliente_id),
          vehiculoId,
          fecha,
          kilometraje,
          intervalo,
          proximoKm,
          fechaVencimiento,
          String(data.observaciones || '').trim() ||
            null,
          estado,
          facturaResult.value
        ]
      );
  
      const ordenId = Number(result.rows[0].id);
  
      await saveServiciosForOrden(
        client,
        ordenId,
        data.servicios || []
      );
  
      if (data.agendamientoId) {
        await client.query(
          `
            UPDATE agendamientos
            SET
              orden_id = $1,
              estado = $2,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `,
          [
            ordenId,
            estado === 'Finalizada'
              ? 'Finalizado'
              : 'En proceso',
            Number(data.agendamientoId)
          ]
        );
      }
  
      await client.query('COMMIT');
  
      const orden = await getOrden(ordenId);
  
      await syncOrdenRailway(orden);
  
      return {
        ok: true,
        orden
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Mantém o erro principal.
      }
  
      console.error(
        'Error al crear orden en PostgreSQL:',
        error
      );
  
      if (error?.code === '23505') {
        return {
          ok: false,
          error:
            'No se pudo generar el número de la orden. Intente nuevamente.'
        };
      }
  
      return {
        ok: false,
        error: 'No se pudo crear la orden de trabajo.'
      };
    } finally {
      client.release();
    }
  }
  async function updateOrden(id, data = {}) {
    const ordenId = Number(id);
    const existing = await getOrden(ordenId);
  
    if (!existing) {
      return {
        ok: false,
        error: 'Orden no encontrada.'
      };
    }
  
    const vehiculoId = Number(data.vehiculoId);
  
    if (
      !Number.isInteger(vehiculoId) ||
      vehiculoId <= 0
    ) {
      return {
        ok: false,
        error: 'Seleccione un vehículo.'
      };
    }
  
    const estado = ESTADOS.includes(data.estado)
      ? data.estado
      : existing.estado;
  
    const facturaResult = resolveNumeroFactura(
      data,
      existing,
      estado
    );
  
    if (!facturaResult.ok) {
      return {
        ok: false,
        error: facturaResult.error
      };
    }
  
    const kilometraje = parseIntOrNull(
      data.kilometraje
    );
  
    const intervalo = parseIntOrNull(
      data.intervalo
    );
  
    const proximoKm = parseIntOrNull(
      data.proximoKm
    );
  
    const fecha =
      String(data.fecha || '').trim() ||
      existing.fecha;
  
    const fechaVencimiento =
      String(data.fechaVencimiento || '').trim() ||
      null;
  
    const client = await getClient();
  
    try {
      await client.query('BEGIN');
  
      const vehiculoResult = await client.query(
        `
          SELECT id, cliente_id
          FROM vehiculos
          WHERE id = $1
        `,
        [vehiculoId]
      );
  
      const vehiculo = vehiculoResult.rows[0];
  
      if (!vehiculo) {
        await client.query('ROLLBACK');
  
        return {
          ok: false,
          error: 'Vehículo no encontrado.'
        };
      }
  
      await client.query(
        `
          UPDATE ordenes_trabajo
          SET
            cliente_id = $1,
            vehiculo_id = $2,
            fecha = $3,
            kilometraje = $4,
            intervalo = $5,
            proximo_km = $6,
            fecha_vencimiento = $7,
            observaciones = $8,
            estado = $9,
            numero_factura = $10,
            updated_at = CURRENT_TIMESTAMP,
            fecha_cierre = CASE
              WHEN $9 = 'Finalizada'
                THEN COALESCE(
                  fecha_cierre,
                  CURRENT_TIMESTAMP
                )
              ELSE NULL
            END
          WHERE id = $11
        `,
        [
          Number(vehiculo.cliente_id),
          vehiculoId,
          fecha,
          kilometraje,
          intervalo,
          proximoKm,
          fechaVencimiento,
          String(data.observaciones || '').trim() ||
            null,
          estado,
          facturaResult.value,
          ordenId
        ]
      );
  
      await saveServiciosForOrden(
        client,
        ordenId,
        data.servicios || []
      );
  
      await client.query(
        `
          UPDATE agendamientos
          SET
            estado = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE orden_id = $2
        `,
        [
          estado === 'Finalizada'
            ? 'Finalizado'
            : 'En proceso',
          ordenId
        ]
      );
  
      await client.query('COMMIT');
  
      const orden = await getOrden(ordenId);
  
      await syncOrdenRailway(orden);
  
      return {
        ok: true,
        orden
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Mantém o erro principal.
      }
  
      console.error(
        'Error al actualizar orden en PostgreSQL:',
        error
      );
  
      return {
        ok: false,
        error:
          'No se pudo actualizar la orden de trabajo.'
      };
    } finally {
      client.release();
    }
  }
  async function deleteOrden(id) {
    const ordenId = Number(id);
    const existing = await getOrden(ordenId);
  
    if (!existing) {
      return {
        ok: false,
        error: 'Orden no encontrada.'
      };
    }
  
    const client = await getClient();
  
    try {
      await client.query('BEGIN');
  
      await client.query(
        `
          UPDATE agendamientos
          SET
            orden_id = NULL,
            estado = CASE
              WHEN estado = 'Finalizado'
                OR estado = 'En proceso'
              THEN 'Pendiente'
              ELSE estado
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE orden_id = $1
        `,
        [ordenId]
      );
  
      await client.query(
        `
          DELETE FROM ordenes_trabajo
          WHERE id = $1
        `,
        [ordenId]
      );
  
      await client.query('COMMIT');
  
      return {
        ok: true
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Mantém o erro principal.
      }
  
      console.error(
        'Error al eliminar orden en PostgreSQL:',
        error
      );
  
      return {
        ok: false,
        error:
          'No se pudo eliminar la orden de trabajo.'
      };
    } finally {
      client.release();
    }
  }
  
  module.exports = {
    listOrdenes,
    getOrden,
    createOrden,
    updateOrden,
    deleteOrden,
    listVehiculosByCliente,
    searchVehiculosForOrden,
    SERVICIOS_CATALOGO,
    ESTADOS,
    FACTURA_REGEX
  };