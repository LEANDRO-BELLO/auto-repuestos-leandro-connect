export async function abrirHistorialVehiculo(qrCode) {
    const root = document.querySelector('.dashboard-content');
  
    root.innerHTML = `
      <div class="card">
        <h2>Historial del Vehículo</h2>
        <p>Cargando información...</p>
      </div>
    `;
  
    if (!qrCode) {
      root.innerHTML = `
        <div class="card">
          <h2>Historial del Vehículo</h2>
          <p>No se recibió un código QR.</p>
        </div>
      `;
      return;
    }
  
    const vehiculo = await window.api.getVehiculoByQrCode(qrCode);
  
    if (!vehiculo) {
      root.innerHTML = `
        <div class="card">
          <h2>Vehículo no encontrado</h2>
        </div>
      `;
      return;
    }
  
    const historial = await window.api.listServiciosRealizados({
      vehiculoId: vehiculo.id
    });
  
    const filas = (historial.items || []).map((item) => `
      <tr class="historial-item" data-id="${item.id}">
        <td>${item.fecha || ''}</td>
        <td>${item.kilometraje || ''}</td>
        <td>${item.proximoKm || ''}</td>
      </tr>
    `).join('');
  
    root.innerHTML = `
      <div class="card">
        <h2>${vehiculo.placa}</h2>
        <p><strong>Cliente:</strong> ${vehiculo.clienteNombre || '—'}</p>
        <p><strong>Vehículo:</strong> ${vehiculo.marca || ''} ${vehiculo.modelo || ''}</p>
  
        <hr>
  
        <h3>Historial de Servicios</h3>
  
        <table border="1" cellspacing="0" cellpadding="8" width="100%">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>KM</th>
              <th>Próximo KM</th>
            </tr>
          </thead>
          <tbody>
            ${filas}
          </tbody>
        </table>
  
        <div id="detalle-servicio" style="margin-top:30px"></div>
      </div>
    `;
    document.querySelectorAll('.historial-item').forEach((linha) => {
        linha.addEventListener('click', () => {
          const id = Number(linha.dataset.id);
      
          const servico = historial.items.find((s) => s.id === id);
      
          if (!servico) return;
      
          document.getElementById('detalle-servicio').innerHTML = `
            <hr>
      
            <h3>Servicios realizados</h3>
      
            <p><strong>Fecha:</strong> ${servico.fecha}</p>
      
            <ul>
              ${servico.serviciosLabels
                .map((s) => `<li>${s}</li>`)
                .join('')}
            </ul>
      
            ${
              servico.observaciones
                ? `<p><strong>Observaciones:</strong><br>${servico.observaciones}</p>`
                : ''
            }
          `;
        });
      });
  }