import logger from '../logger.js';

export function notFoundHandler(req, res, _next) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err, req, res, _next) {
  logger.error(`${err.message} - ${req.method} ${req.originalUrl}`);
  const status = err.status || 500;
  const payload = {
    error: err.message || 'Internal Server Error'
  };

  if (process.env.NODE_ENV === 'development') {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}
