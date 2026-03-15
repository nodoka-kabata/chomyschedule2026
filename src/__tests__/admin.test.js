import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../app.js';

const settingsPath = path.resolve(process.cwd(), 'config', 'settings.json');

describe('Admin settings API', () => {
  beforeEach(() => {
    if (fs.existsSync(settingsPath)) {
      fs.unlinkSync(settingsPath);
    }
  });

  afterAll(() => {
    if (fs.existsSync(settingsPath)) {
      fs.unlinkSync(settingsPath);
    }
  });

  it('should return an object for /api/admin/settings', async () => {
    const res = await request(app).get('/api/admin/settings').expect(200);
    expect(res.body).toHaveProperty('data');
    expect(typeof res.body.data).toBe('object');
  });

  it('should be able to create and read a setting', async () => {
    const key = 'testKey';
    const value = { foo: 'bar' };

    await request(app)
      .put(`/api/admin/settings/${key}`)
      .send({ value })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('data.key', key);
        expect(res.body).toHaveProperty('data.value');
        expect(res.body.data.value).toEqual(value);
      });

    const getRes = await request(app).get(`/api/admin/settings/${key}`).expect(200);
    expect(getRes.body).toHaveProperty('data.key', key);
    expect(getRes.body).toHaveProperty('data.value');
    expect(getRes.body.data.value).toEqual(value);
  });

  it('should return 404 for nonexistent setting', async () => {
    await request(app).get('/api/admin/settings/doesnotexist').expect(404);
  });
});
