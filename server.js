const path = require('node:path');
const express = require('express');
const { createStore } = require('./src/store');

// 문자열이면 앞뒤 공백을 제거하고, 비었거나 문자열이 아니면 null
function text(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function createApp(store) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  const badRequest = (res, error) => res.status(400).json({ error });
  const notFound = (res, error) => res.status(404).json({ error });

  app.get('/api/categories', (req, res) => {
    res.json(store.listCategories());
  });

  app.post('/api/categories', async (req, res) => {
    const name = text(req.body?.name);
    if (!name) return badRequest(res, '항목 이름을 입력하세요.');
    res.status(201).json(await store.addCategory(name));
  });

  app.put('/api/categories/:id', async (req, res) => {
    const name = text(req.body?.name);
    if (!name) return badRequest(res, '항목 이름을 입력하세요.');
    const category = await store.updateCategory(req.params.id, name);
    if (!category) return notFound(res, '항목을 찾을 수 없습니다.');
    res.json(category);
  });

  app.delete('/api/categories/:id', async (req, res) => {
    if (!(await store.deleteCategory(req.params.id))) {
      return notFound(res, '항목을 찾을 수 없습니다.');
    }
    res.status(204).end();
  });

  app.get('/api/questions', (req, res) => {
    const ids = req.query.categoryIds;
    res.json(store.listQuestions(ids ? String(ids).split(',') : undefined));
  });

  app.post('/api/questions', async (req, res) => {
    const { categoryId } = req.body ?? {};
    const question = text(req.body?.question);
    const answer = text(req.body?.answer);
    if (!store.hasCategory(categoryId)) return badRequest(res, '항목을 선택하세요.');
    if (!question) return badRequest(res, '문제를 입력하세요.');
    if (!answer) return badRequest(res, '답을 입력하세요.');
    res.status(201).json(await store.addQuestion({ categoryId, question, answer }));
  });

  app.put('/api/questions/:id', async (req, res) => {
    const body = req.body ?? {};
    const fields = {};
    if (body.categoryId !== undefined) {
      if (!store.hasCategory(body.categoryId)) return badRequest(res, '항목을 찾을 수 없습니다.');
      fields.categoryId = body.categoryId;
    }
    for (const key of ['question', 'answer']) {
      if (body[key] === undefined) continue;
      fields[key] = text(body[key]);
      if (!fields[key]) return badRequest(res, key === 'question' ? '문제를 입력하세요.' : '답을 입력하세요.');
    }
    const item = await store.updateQuestion(req.params.id, fields);
    if (!item) return notFound(res, '문제를 찾을 수 없습니다.');
    res.json(item);
  });

  app.delete('/api/questions/:id', async (req, res) => {
    if (!(await store.deleteQuestion(req.params.id))) {
      return notFound(res, '문제를 찾을 수 없습니다.');
    }
    res.status(204).end();
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: '요청을 처리하지 못했습니다.' });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const dataFile = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');
  createStore(dataFile).then((store) => {
    createApp(store).listen(port, () => {
      console.log(`정처기 문제 서비스: http://localhost:${port}`);
    });
  });
}

module.exports = { createApp };
