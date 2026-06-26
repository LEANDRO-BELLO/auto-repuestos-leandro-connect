const PREFIX = '[Auto Repuestos Leandro Connect]';

function formatMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `${PREFIX} [${timestamp}] [${level}] ${message}`;
}

const logger = {
  info(message) {
    console.log(formatMessage('INFO', message));
  },
  warn(message) {
    console.warn(formatMessage('WARN', message));
  },
  error(message, error) {
    const detail = error?.message ? `: ${error.message}` : '';
    console.error(formatMessage('ERROR', `${message}${detail}`));
  }
};

module.exports = logger;
