const express = require('express');
const cors = require('cors');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    sistema: 'Auto Repuestos Leandro Connect',
    modo: 'multiusuario',
    banco: 'PostgreSQL pendiente de configuración'
  });
});

app.use((error, req, res, next) => {
  console.error('Error de la API:', error);

  res.status(500).json({
    ok: false,
    error: 'Error interno del servidor.'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `[API Central] Servidor iniciado en http://localhost:${PORT}`
  );
});