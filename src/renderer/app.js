import { renderLoginPage, renderShellPage } from './pages/login.js';

let currentUser = null;

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
    onLogout: handleLogout
  });
}

function handleLogout() {
  currentUser = null;
  renderLoginPage({ onSubmit: handleLogin });
}

document.addEventListener('DOMContentLoaded', () => {
  renderLoginPage({ onSubmit: handleLogin });
});
