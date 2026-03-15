import express from 'express';
import Joi from 'joi';
import db from '../db/knex.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const sessionSchema = Joi.object({
  title: Joi.string().max(255).required(),
  startAt: Joi.date().required(),
  endAt: Joi.date().required(),
  venue: Joi.string().max(255).allow('', null),
  tags: Joi.array().items(Joi.string().max(50)).default([]),
  notes: Joi.string().max(1024).allow('', null)
}).custom((value, helpers) => {
  if (new Date(value.startAt) >= new Date(value.endAt)) {
    return helpers.error('any.invalid', { message: 'startAt must be before endAt' });
  }
  return value;
});

router.get('/', async (req, res, next) => {
  try {
    const sessions = await db('sessions').orderBy('start_at', 'asc');
    res.json({ data: sessions });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(sessionSchema), async (req, res, next) => {
  try {
    const payload = req.validatedBody;
    const [id] = await db('sessions').insert({
      title: payload.title,
      start_at: payload.startAt,
      end_at: payload.endAt,
      venue: payload.venue,
      tags: JSON.stringify(payload.tags || []),
      notes: payload.notes
    });
    const created = await db('sessions').where({ id }).first();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', validate(sessionSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const payload = req.validatedBody;
    await db('sessions')
      .where({ id })
      .update({
        title: payload.title,
        start_at: payload.startAt,
        end_at: payload.endAt,
        venue: payload.venue,
        tags: JSON.stringify(payload.tags || []),
        notes: payload.notes,
        updated_at: db.fn.now()
      });
    const updated = await db('sessions').where({ id }).first();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await db('sessions').where({ id }).del();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
