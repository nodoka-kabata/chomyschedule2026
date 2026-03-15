import express from 'express';
import Joi from 'joi';
import db from '../db/knex.js';
import { validate } from '../middleware/validate.js';
import { getIo } from '../socket.js';

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

const safeParseTags = (value) => {
  if (Array.isArray(value)) return value;
  try {
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
};

const formatSession = (row) => ({
  ...row,
  tags: safeParseTags(row.tags)
});

const formatDateTimeForIcs = (date) => {
  const d = new Date(date);
  // Ensure we have a valid date
  if (Number.isNaN(d.getTime())) return undefined;
  // YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const buildICalendar = (sessions) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//choms-schedule-2026//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  sessions.forEach((session) => {
    const start = formatDateTimeForIcs(session.start_at || session.startAt);
    const end = formatDateTimeForIcs(session.end_at || session.endAt);
    const uid = `session-${session.id}@choms.local`;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    if (start) lines.push(`DTSTART:${start}`);
    if (end) lines.push(`DTEND:${end}`);
    lines.push(`SUMMARY:${session.title || ''}`);
    if (session.venue) lines.push(`LOCATION:${session.venue}`);
    const descriptionParts = [];
    if (Array.isArray(session.tags) && session.tags.length) {
      descriptionParts.push(`tags: ${session.tags.join(', ')}`);
    }
    if (session.notes) {
      descriptionParts.push(`${session.notes}`);
    }
    if (descriptionParts.length) {
      lines.push(`DESCRIPTION:${descriptionParts.join(' | ')}`);
    }
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

router.get('/', async (req, res, next) => {
  try {
    const sessions = await db('sessions').orderBy('start_at', 'asc');
    res.json({ data: sessions.map(formatSession) });
  } catch (err) {
    next(err);
  }
});

router.get('/export.ics', async (req, res, next) => {
  try {
    const sessions = await db('sessions').orderBy('start_at', 'asc');
    const ics = buildICalendar(sessions.map(formatSession));

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="choms-schedule.ics"');
    res.send(ics);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const session = await db('sessions').where({ id }).first();
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ data: formatSession(session) });
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

    const io = getIo();
    if (io) {
      io.emit('sessions:created', formatSession(created));
    }

    res.status(201).json({ data: formatSession(created) });
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

    const io = getIo();
    if (io) {
      io.emit('sessions:updated', formatSession(updated));
    }

    res.json({ data: formatSession(updated) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await db('sessions').where({ id }).del();

    const io = getIo();
    if (io) {
      io.emit('sessions:deleted', { id });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
