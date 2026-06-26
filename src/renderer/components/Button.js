/**
 * Componente reutilizable de botón primario.
 * Base para futuros componentes de la interfaz.
 */
export function createPrimaryButton({ label, type = 'button', disabled = false }) {
  const button = document.createElement('button');
  button.type = type;
  button.className = 'btn-primary';
  button.textContent = label;
  button.disabled = disabled;
  return button;
}
