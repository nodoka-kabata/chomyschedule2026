import express from 'express';
import Joi from 'joi';
import * as settings from '../config/settings.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const keyParamSchema = Joi.string().pattern(/^[A-Za-z0-9_-]+$/).required();
const settingsBodySchema = Joi.object({
  value: Joi.any().required()
});

router.get('/settings', (req, res) => {
  res.json({ data: settings.getAll() });
});

router.get('/settings/:key', (req, res) => {
  const { key } = req.params;
  const { error } = keyParamSchema.validate(key);
  if (error) {
    return res.status(400).json({ error: 'invalid key' });
  }

  const value = settings.get(key);
  if (typeof value === 'undefined') {
    return res.status(404).json({ error: 'setting not found' });
  }
  res.json({ data: { key, value } });
});

router.put('/settings/:key', validate(settingsBodySchema), (req, res) => {
  const { key } = req.params;
  const { value } = req.validatedBody;
  const { error } = keyParamSchema.validate(key);
  if (error) {
    return res.status(400).json({ error: 'invalid key' });
  }

  const updated = settings.set(key, value);
  res.json({ data: { key, value: updated } });
});

router.delete('/settings/:key', (req, res) => {
  const { key } = req.params;
  const { error } = keyParamSchema.validate(key);
  if (error) {
    return res.status(400).json({ error: 'invalid key' });
  }

  const removed = settings.remove(key);
  if (!removed) {
    return res.status(404).json({ error: 'setting not found' });
  }

  res.status(204).send();
});

export default router;
