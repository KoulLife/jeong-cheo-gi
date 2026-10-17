const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStore } = require('../src/store');
const { createApp } = require('../server');

let server;
let base;

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jcg-api-'));
  const store = await createStore(path.join(dir, 'db.json'));
  server = createApp(store).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

async function call(method, url, body) {
  const res = await fetch(base + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

test('항목 CRUD', async () => {
  const created = await call('POST', '/api/categories', { name: '  소프트웨어 설계  ' });
  assert.equal(created.status, 201);
  assert.equal(created.body.name, '소프트웨어 설계');
  const id = created.body.id;

  assert.equal((await call('POST', '/api/categories', { name: '   ' })).status, 400);
  assert.equal((await call('POST', '/api/categories', {})).status, 400);

  const renamed = await call('PUT', `/api/categories/${id}`, { name: '설계' });
  assert.equal(renamed.body.name, '설계');
  assert.equal((await call('PUT', '/api/categories/nope', { name: 'x' })).status, 404);
  assert.equal((await call('PUT', `/api/categories/${id}`, { name: '' })).status, 400);

  const list = await call('GET', '/api/categories');
  assert.ok(list.body.some((c) => c.id === id && c.count === 0));

  assert.equal((await call('DELETE', `/api/categories/${id}`)).status, 204);
  assert.equal((await call('DELETE', `/api/categories/${id}`)).status, 404);
});

test('문제 CRUD와 항목 필터', async () => {
  const a = (await call('POST', '/api/categories', { name: 'A' })).body;
  const b = (await call('POST', '/api/categories', { name: 'B' })).body;

  const q = await call('POST', '/api/questions', { categoryId: a.id, question: '정규화란?', answer: '이상 현상 제거\n중복 최소화' });
  assert.equal(q.status, 201);
  assert.equal(q.body.answer, '이상 현상 제거\n중복 최소화');
  await call('POST', '/api/questions', { categoryId: b.id, question: 'OSI 7계층', answer: '...' });

  assert.equal((await call('POST', '/api/questions', { categoryId: 'nope', question: 'q', answer: 'a' })).status, 400);
  assert.equal((await call('POST', '/api/questions', { categoryId: a.id, question: '', answer: 'a' })).status, 400);
  assert.equal((await call('POST', '/api/questions', { categoryId: a.id, question: 'q' })).status, 400);

  const onlyA = await call('GET', `/api/questions?categoryIds=${a.id}`);
  assert.deepEqual(onlyA.body.map((x) => x.question), ['정규화란?']);
  const both = await call('GET', `/api/questions?categoryIds=${a.id},${b.id}`);
  assert.equal(both.body.length, 2);

  const updated = await call('PUT', `/api/questions/${q.body.id}`, { answer: '새 답' });
  assert.equal(updated.body.answer, '새 답');
  assert.equal(updated.body.question, '정규화란?');
  assert.equal((await call('PUT', `/api/questions/${q.body.id}`, { question: ' ' })).status, 400);
  assert.equal((await call('PUT', `/api/questions/${q.body.id}`, { categoryId: 'nope' })).status, 400);
  assert.equal((await call('PUT', '/api/questions/nope', { answer: 'x' })).status, 404);

  assert.equal((await call('DELETE', `/api/questions/${q.body.id}`)).status, 204);
  assert.equal((await call('DELETE', `/api/questions/${q.body.id}`)).status, 404);

  await call('DELETE', `/api/categories/${b.id}`);
  const afterDelete = await call('GET', `/api/questions?categoryIds=${b.id}`);
  assert.deepEqual(afterDelete.body, []);
});

test('정적 페이지를 제공한다', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<html/);
});
