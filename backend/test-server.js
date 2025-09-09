const request = require('supertest');
const app = require('./src/index');

describe('Server Health Check', () => {
  it('should respond with 200 for health check', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('should respond with 404 for non-existent routes', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'Not Found');
  });
});
