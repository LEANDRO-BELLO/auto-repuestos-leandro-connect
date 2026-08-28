import { renderLoginPage, renderShellPage } from './pages/login.js';

let currentUser = null;
let startupPage = 'inicio';

async function handleLogin(credentials) {
  const result = await window.api.login(credentials);

  if (!result.ok) {
    throw new Error(result.error);
  }

  currentUser = result.user;
  const empresa = await window.api.getEmpresa();
  renderShellPage({
    user: currentUser,
    empresa,
    onLogout: handleLogout,
    page: startupPage
  });
}

function handleLogout() {
  currentUser = null;
  window.api.logout();
  renderLoginPage({ onSubmit: handleLogin });
}

document.addEventListener('DOMContentLoaded', async () => {
  const bootstrap = await window.api.getDevBootstrap();
  startupPage = bootstrap?.startupPage || 'inicio';
  renderLoginPage({ onSubmit: handleLogin });

  if (bootstrap?.autoLogin) {
    try {
      await handleLogin({ usuario: 'admin', password: 'admin' });
    } catch (_error) {
      /* login manual */
    }
  }
});
