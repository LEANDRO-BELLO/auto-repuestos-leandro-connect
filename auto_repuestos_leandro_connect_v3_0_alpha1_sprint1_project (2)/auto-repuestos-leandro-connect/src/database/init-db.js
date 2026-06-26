const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'auto_repuestos_leandro.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    usuario TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    perfil TEXT NOT NULL DEFAULT 'Administrador',
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS empresa (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    whatsapp TEXT,
    email TEXT,
    ruc TEXT,
    logo_path TEXT,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    documento TEXT,
    telefono TEXT,
    whatsapp TEXT,
    email TEXT,
    direccion TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS vehiculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    marca TEXT,
    modelo TEXT,
    anho TEXT,
    motor TEXT,
    combustible TEXT,
    placa TEXT NOT NULL,
    chassi TEXT,
    km_actual INTEGER DEFAULT 0,
    qr_id TEXT UNIQUE,
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS vendedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    cargo TEXT,
    whatsapp TEXT NOT NULL,
    foto_path TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ordenes_servicio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_os TEXT UNIQUE,
    cliente_id INTEGER NOT NULL,
    vehiculo_id INTEGER NOT NULL,
    fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    km_actual INTEGER,
    factura TEXT,
    estado TEXT NOT NULL DEFAULT 'Abierta',
    observaciones TEXT,
    usuario_creador_id INTEGER,
    usuario_finaliza_id INTEGER,
    finalizada_en TEXT,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id),
    FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id),
    FOREIGN KEY (usuario_finaliza_id) REFERENCES usuarios(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS servicios_orden (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_id INTEGER NOT NULL,
    servicio TEXT NOT NULL,
    proxima_revision TEXT,
    FOREIGN KEY (orden_id) REFERENCES ordenes_servicio(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS central_retorno (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    vehiculo_id INTEGER NOT NULL,
    orden_id INTEGER,
    vencimiento TEXT,
    status TEXT NOT NULL DEFAULT 'Pendiente',
    intentos INTEGER NOT NULL DEFAULT 0,
    avisado_en TEXT,
    avisado_por_usuario_id INTEGER,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id),
    FOREIGN KEY (orden_id) REFERENCES ordenes_servicio(id),
    FOREIGN KEY (avisado_por_usuario_id) REFERENCES usuarios(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    accion TEXT NOT NULL,
    entidad TEXT,
    entidad_id INTEGER,
    detalle TEXT,
    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )`);

  db.run(`INSERT OR IGNORE INTO usuarios (id, nombre, usuario, password, perfil, activo)
          VALUES (1, 'Administrador', 'admin', 'admin', 'Administrador', 1)`);

  db.run(`INSERT OR REPLACE INTO empresa (id, nombre, direccion, telefono, whatsapp, email, ruc)
          VALUES (1, 'Auto Repuestos Leandro S.A.', 'Katueté – Canindeyú – Paraguay', '+595 986 773 222', '+595 986 773 222', 'autorepuestosleandrosa@hotmail.com', '80060789-9')`);
});

db.close(() => {
  console.log('Banco SQLite listo:', dbPath);
});
