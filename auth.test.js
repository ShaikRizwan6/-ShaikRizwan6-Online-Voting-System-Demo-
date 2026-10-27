const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

// Set environment before loading application
process.env.NODE_ENV = 'test';
const app = require('../server');

describe('Authentication API Suite (/api/auth)', () => {
  it('should reject registration when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Incomplete User'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /required/i);
  });

  it('should reject registration with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test Voter',
        email: 'invalid-email-address',
        password: 'Password123!'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /valid email/i);
  });

  it('should reject registration with password shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test Voter',
        email: 'shortpass@voting.local',
        password: '123'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /at least 6 characters/i);
  });

  it('should reject login when credentials are not supplied', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('should reject login with non-existent or incorrect credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent_user@voting.local',
        password: 'WrongPassword999!'
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /invalid/i);
  });

  it('should reject access to protected /api/auth/me without active session', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });
});
