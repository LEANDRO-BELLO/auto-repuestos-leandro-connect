# Aplicar o PDF oficial no Railway — v1.0.3

Esta pasta contém a atualização pronta para substituir o PDF antigo do Portal QR.

## Arquivos

- `pdf-route.js`: rota oficial `GET /os/:id/pdf`.
- `public/logo-oficial.png`: logo usado no cabeçalho.

## No repositório do portal Railway

1. Copie `pdf-route.js` para a mesma pasta de `server.js` (normalmente `api/`).
2. Copie a pasta `public` para essa mesma pasta.
3. No início de `server.js`, mantenha/adicione:

```js
const path = require('path');
const express = require('express');
const installPdfRoute = require('./pdf-route');
```

4. Depois de criar `app` e abrir `db`, adicione:

```js
app.use('/assets', express.static(path.join(__dirname, 'public')));
installPdfRoute(app, db);
```

5. Remova ou comente a rota antiga `app.get('/os/:id/pdf', ...)`, para não existirem duas rotas iguais.
6. Faça commit e push. O Railway fará o deploy automaticamente se estiver conectado ao GitHub.
7. Teste pelo Portal QR usando o botão `Ver`.

## Resultado esperado

O documento aberto pelo QR terá o mesmo cabeçalho, cores, campos e estrutura do PDF aprovado no aplicativo desktop.
