import logger from '../logger.js';

export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.warn(`Validation failed: ${error.message}`);
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map((d) => ({ path: d.path, message: d.message }))
      });
    }

    req.validatedBody = value;
    next();
  };
}
