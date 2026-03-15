import request from 'supertest';
import app from '../app.js';

describe('App', () => {
  it('returns health status', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});
