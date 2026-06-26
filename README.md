# Auto Repuestos Leandro Connect

Sistema comercial modular para **Auto Repuestos Leandro S.A.**

## Objetivo

- Rápido
- Simple
- Confiable
- Preparado para expansión modular

## Tecnologías

- Electron
- SQLite
- JavaScript (ES Modules en renderer)
- Arquitectura modular por capas

## Estructura del proyecto

```text
src/
├── main/           # Proceso principal de Electron
│   └── ipc/        # Handlers IPC centralizados
├── preload/        # Puente seguro main ↔ renderer
├── renderer/       # Interfaz de usuario
│   ├── components/
│   ├── pages/
│   ├── styles/
│   └── assets/
├── database/       # Conexión, esquema e inicialización SQLite
├── services/       # Lógica de aplicación (extensible por módulos)
└── utils/          # Utilidades compartidas
```

## Cómo ejecutar

```bash
npm install
npm start
```

La base de datos SQLite se crea automáticamente en la primera ejecución dentro de `data/`.

## Credenciales iniciales de desarrollo

```text
Usuario: admin
Contraseña: admin
```

## Empresa

- Auto Repuestos Leandro S.A.
- Katueté – Canindeyú – Paraguay
- Teléfono / WhatsApp: +595 986 773 222
- E-mail: autorepuestosleandrosa@hotmail.com
- RUC: 80060789-9

## Próximos pasos

Los módulos de negocio (clientes, vehículos, órdenes de servicio, etc.) se agregarán como servicios e IPC independientes, sin modificar la base estructural existente.
