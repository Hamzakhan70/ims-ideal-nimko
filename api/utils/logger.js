import { isProductionLike } from '../config/runtimeConfig.js';

const format = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  if (meta !== undefined) {
    return [`[${timestamp}] [${level}] ${message}`, meta];
  }
  return [`[${timestamp}] [${level}] ${message}`];
};

const logger = {
  info(message, meta) {
    if (isProductionLike) {
      return;
    }
    console.info(...format('INFO', message, meta));
  },
  warn(message, meta) {
    console.warn(...format('WARN', message, meta));
  },
  error(message, meta) {
    console.error(...format('ERROR', message, meta));
  },
  debug(message, meta) {
    if (isProductionLike) {
      return;
    }
    console.debug(...format('DEBUG', message, meta));
  }
};

export default logger;
