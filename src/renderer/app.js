import { renderLoginPage, renderShellPage } from './pages/login.js';

let currentUser = null;
let startupPage = 'inicio';

async function handleLogin(credentials) {
  console.time('[PERF] post-login.until-shell');
  console.time('[PERF] ipcRenderer.auth:login');
  const result = await window.api.login(credentials);
  console.timeEnd('[PERF] ipcRenderer.auth:login');

  if (!result.ok) {
    console.timeEnd('[PERF] post-login.until-shell');
    throw new Error(result.error);
  }

  currentUser = result.user;
  console.time('[PERF] ipcRenderer.empresa:get');
  const empresa = await window.api.getEmpresa();
  console.timeEnd('[PERF] ipcRenderer.empresa:get');
  renderShellPage({
    user: currentUser,
    empresa,
    onLogout: handleLogout,
    page: startupPage
  });
  console.timeEnd('[PERF] post-login.until-shell');
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
