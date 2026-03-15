import request from 'supertest';

const initialSessions = [
  {
    id: 1,
    title: 'Test Session',
    start_at: '2026-04-25T10:00:00.000Z',
    end_at: '2026-04-25T11:00:00.000Z',
    venue: 'Main Hall',
    tags: JSON.stringify(['tag1', 'tag2']),
    notes: 'Some notes',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let sessions;
let dbMock;
let app;

function createMockDb() {
  sessions = initialSessions.map((s) => ({ ...s }));

  const builder = {
    orderBy: (col, dir) => {
      const sorted = [...sessions].sort((a, b) => {
        if (a[col] === b[col]) return 0;
        if (dir === 'asc') return a[col] < b[col] ? -1 : 1;
        return a[col] < b[col] ? 1 : -1;
      });
      return Promise.resolve(sorted);
    },
    where: ({ id }) => {
      const matching = sessions.find((s) => s.id === id);
      return {
        first: () => Promise.resolve(matching),
        update: (payload) => {
          if (!matching) return Promise.resolve(0);
          Object.assign(matching, payload);
          return Promise.resolve(1);
        },
        del: () => {
          sessions = sessions.filter((s) => s.id !== id);
          return Promise.resolve(1);
        }
      };
    },
    insert: (payload) => {
      const id = sessions.length ? Math.max(...sessions.map((s) => s.id)) + 1 : 1;
      const record = { id, ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      sessions.push(record);
      return Promise.resolve([id]);
    }
  };

  const db = jest.fn(() => builder);
  db.fn = {
    now: () => new Date().toISOString()
  };

  db.reset = () => {
    sessions = initialSessions.map((s) => ({ ...s }));
  };

  return db;
}

describe('Sessions API', () => {
  beforeAll(async () => {
    jest.resetModules();
    jest.doMock('../db/knex.js', () => {
      dbMock = createMockDb();
      return dbMock;
    });

    const module = await import('../app.js');
    app = module.default;
  });

  beforeEach(() => {
    dbMock.reset();
  });

  it('returns a list of sessions with parsed tags', async () => {
    const res = await request(app).get('/api/sessions').expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toHaveProperty('tags');
    expect(res.body.data[0].tags).toEqual(['tag1', 'tag2']);
  });

  it('creates a new session', async () => {
    const payload = {
      title: 'New session',
      startAt: '2026-04-25T12:00:00.000Z',
      endAt: '2026-04-25T13:00:00.000Z',
      venue: 'Room A',
      tags: ['a', 'b'],
      notes: 'note'
    };

    const res = await request(app).post('/api/sessions').send(payload).expect(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.tags).toEqual(payload.tags);
  });

  it('returns 404 for missing session by id', async () => {
    await request(app).get('/api/sessions/999').expect(404);
  });
});
