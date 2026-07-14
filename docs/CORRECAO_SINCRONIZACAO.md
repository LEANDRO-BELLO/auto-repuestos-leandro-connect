# Correção da sincronização Railway

Arquivos corrigidos:

- `src/services/clientes.service.js`
- `src/services/vehiculos.service.js`
- `src/services/ordenes.service.js`
- `src/services/railway-sync.service.js` (novo)
- `scripts/sync-railway.js` (novo)
- `package.json` (`npm run sync-railway`)

## Ordem garantida

1. Cliente é enviado primeiro.
2. Veículo é enviado depois.
3. Ordem finalizada e seus serviços são enviados por último.

Falha de internet não impede o cadastro local. O erro fica registrado no terminal.

## Sincronizar dados existentes

Com os três endpoints ativos no portal Railway, execute no terminal:

```bash
npm run sync-railway
```

Isso envia todos os clientes, veículos e ordens finalizadas já existentes no banco local.
