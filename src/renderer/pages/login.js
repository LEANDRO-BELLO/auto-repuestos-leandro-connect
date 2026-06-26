import { escapeHtml } from '../utils/dom.js';

export function renderLoginPage({ onSubmit }) {
  const root = document.getElementById('app-root');

  root.innerHTML = `
    <section class="login-screen" id="login-screen">
      <div class="login-card">
        <header class="login-brand">
          <div class="login-brand__logo" aria-hidden="true">ARL</div>
          <h1 class="login-brand__title">AUTO REPUESTOS<br>LEANDRO CONNECT</h1>
          <p class="login-brand__subtitle">Katueté – Canindeyú – Paraguay</p>
        </header>

        <form class="login-form" id="login-form" novalidate>
          <div class="form-field">
            <label for="login-usuario">Usuario</label>
            <input
              id="login-usuario"
              name="usuario"
              type="text"
              autocomplete="username"
              placeholder="Ingrese su usuario"
              required
            />
          </div>

          <div class="form-field">
            <label for="login-password">Contraseña</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="Ingrese su contraseña"
              required
            />
          </div>

          <button class="btn-primary" type="submit" id="login-submit">Ingresar</button>
          <p class="login-error" id="login-error" role="alert" aria-live="polite"></p>
        </form>

        <footer class="login-footer">
          <span id="app-version">Versión —</span>
        </footer>
      </div>
    </section>
  `;

  const form = root.querySelector('#login-form');
  const errorBox = root.querySelector('#login-error');
  const submitButton = root.querySelector('#login-submit');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.textContent = '';

    const usuario = form.usuario.value.trim();
    const password = form.password.value.trim();

    if (!usuario || !password) {
      errorBox.textContent = 'Complete usuario y contraseña.';
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Ingresando...';

    try {
      await onSubmit({ usuario, password });
    } catch (error) {
      errorBox.textContent = error.message || 'No se pudo iniciar sesión.';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Ingresar';
    }
  });

  window.api.getVersion().then((version) => {
    root.querySelector('#app-version').textContent = `Versión ${version}`;
  });
}

export function renderShellPage({ user, empresa, onLogout }) {
  const root = document.getElementById('app-root');

  root.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <div class="app-header__brand">AUTO REPUESTOS LEANDRO CONNECT</div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="app-header__user">${escapeHtml(user.nombre)} (${escapeHtml(user.perfil)})</span>
          <button class="btn-ghost" type="button" id="logout-button">Salir</button>
        </div>
      </header>

      <main class="app-main">
        <section class="welcome-panel">
          <h2>Bienvenido al sistema</h2>
          <p>
            Estructura base lista para desarrollo modular.
            Los módulos de negocio se integrarán aquí sin afectar componentes existentes.
          </p>
          <p><strong>Empresa:</strong> ${escapeHtml(empresa?.nombre || '—')}</p>
          <p><strong>Ubicación:</strong> ${escapeHtml(empresa?.direccion || '—')}</p>
          <span class="status-badge">Base de datos SQLite conectada</span>
        </section>
      </main>
    </div>
  `;

  root.querySelector('#logout-button').addEventListener('click', onLogout);
}
