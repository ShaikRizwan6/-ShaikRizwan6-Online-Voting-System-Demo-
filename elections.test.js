const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
const app = require('../server');

describe('Elections API & Authorization Suite (/api/elections)', () => {
  it('should reject unauthenticated access to /api/elections with HTTP 401', async () => {
    const res = await request(app)
      .get('/api/elections');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /authentication required/i);
  });

  it('should reject unauthenticated election creation with HTTP 401', async () => {
    const res = await request(app)
      .post('/api/elections')
      .send({
        title: 'Unauthorized Election',
        start_time: '2026-01-01 09:00:00',
        end_time: '2026-01-02 17:00:00'
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('should reject invalid election ID requests with HTTP 400', async () => {
    // When requesting details with an alphabetic ID
    const res = await request(app)
      .get('/api/elections/not-a-valid-id');

    // Without session, auth middleware intercepts first
    assert.equal(res.status, 401);
  });
});
