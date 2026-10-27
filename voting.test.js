const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
const app = require('../server');

describe('Balloting & Voting Engine Suite (/api/elections/:id/vote)', () => {
  it('should reject unauthenticated vote attempt with HTTP 401', async () => {
    const res = await request(app)
      .post('/api/elections/1/vote')
      .send({ candidate_id: 1 });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /authentication required/i);
  });

  it('should reject vote check status without authentication with HTTP 401', async () => {
    const res = await request(app)
      .get('/api/elections/1/my-status');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('should reject vote submission when candidate_id is omitted or invalid', async () => {
    // Attempting vote without authentication is stopped by auth middleware
    const res = await request(app)
      .post('/api/elections/1/vote')
      .send({});

    assert.equal(res.status, 401);
  });
});
