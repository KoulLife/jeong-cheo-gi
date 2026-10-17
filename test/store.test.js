const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStore } = require('../src/store');

let file;

beforeEach(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jcg-store-'));
  file = path.join(dir, 'nested', 'db.json');
});

test('파일이 없으면 빈 데이터로 시작한다', async () => {
  const store = await createStore(file);
  assert.deepEqual(store.listCategories(), []);
  assert.deepEqual(store.listQuestions(), []);
});

test('항목을 추가·수정·조회한다', async () => {
  const store = await createStore(file);
  const cat = await store.addCategory('데이터베이스');
  assert.equal(cat.name, '데이터베이스');
  assert.ok(cat.id);

  const renamed = await store.updateCategory(cat.id, 'DB');
  assert.equal(renamed.name, 'DB');
  assert.equal(await store.updateCategory('nope', 'x'), null);
  assert.deepEqual(store.listCategories(), [{ id: cat.id, name: 'DB', count: 0 }]);
});

test('문제를 추가·수정·삭제하고 항목으로 필터링한다', async () => {
  const store = await createStore(file);
  const a = await store.addCategory('A');
  const b = await store.addCategory('B');
  const q1 = await store.addQuestion({ categoryId: a.id, question: 'q1', answer: 'a1' });
  await store.addQuestion({ categoryId: b.id, question: 'q2', answer: 'a2' });

  assert.equal(store.listQuestions().length, 2);
  assert.deepEqual(store.listQuestions([a.id]).map((q) => q.question), ['q1']);
  assert.equal(store.listQuestions([a.id, b.id]).length, 2);
  assert.equal(store.listCategories().find((c) => c.id === a.id).count, 1);

  const updated = await store.updateQuestion(q1.id, { answer: 'new' });
  assert.equal(updated.answer, 'new');
  assert.equal(updated.question, 'q1');

  assert.equal(await store.deleteQuestion(q1.id), true);
  assert.equal(await store.deleteQuestion(q1.id), false);
  assert.equal(store.listQuestions().length, 1);
});

test('항목을 삭제하면 소속 문제도 삭제된다', async () => {
  const store = await createStore(file);
  const a = await store.addCategory('A');
  const b = await store.addCategory('B');
  await store.addQuestion({ categoryId: a.id, question: 'q1', answer: 'a1' });
  await store.addQuestion({ categoryId: b.id, question: 'q2', answer: 'a2' });

  assert.equal(await store.deleteCategory(a.id), true);
  assert.equal(await store.deleteCategory(a.id), false);
  assert.deepEqual(store.listCategories().map((c) => c.name), ['B']);
  assert.deepEqual(store.listQuestions().map((q) => q.question), ['q2']);
});

test('저장한 데이터는 다시 열어도 유지된다', async () => {
  const store = await createStore(file);
  const a = await store.addCategory('A');
  await Promise.all([
    store.addQuestion({ categoryId: a.id, question: 'q1', answer: 'a1' }),
    store.addQuestion({ categoryId: a.id, question: 'q2', answer: 'a2' }),
  ]);

  const reopened = await createStore(file);
  assert.equal(reopened.listCategories().length, 1);
  assert.equal(reopened.listQuestions().length, 2);
});
