const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// JSON 파일 저장소. 데이터는 메모리에 두고, 변경될 때마다 파일 전체를 다시 쓴다.
async function createStore(filePath) {
  const data = await load(filePath);
  let writing = Promise.resolve();

  // 임시 파일에 쓴 뒤 rename 해서, 저장 중 종료돼도 파일이 깨지지 않게 한다.
  // 쓰기는 순서대로 하나씩 처리한다.
  function save() {
    writing = writing.then(async () => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const tmp = `${filePath}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(data, null, 2));
      await fs.rename(tmp, filePath);
    });
    return writing;
  }

  return {
    listCategories() {
      return data.categories.map((c) => ({
        ...c,
        count: data.questions.filter((q) => q.categoryId === c.id).length,
      }));
    },

    hasCategory(id) {
      return data.categories.some((c) => c.id === id);
    },

    async addCategory(name) {
      const category = { id: randomUUID(), name };
      data.categories.push(category);
      await save();
      return category;
    },

    async updateCategory(id, name) {
      const category = data.categories.find((c) => c.id === id);
      if (!category) return null;
      category.name = name;
      await save();
      return category;
    },

    async deleteCategory(id) {
      const before = data.categories.length;
      data.categories = data.categories.filter((c) => c.id !== id);
      if (data.categories.length === before) return false;
      data.questions = data.questions.filter((q) => q.categoryId !== id);
      await save();
      return true;
    },

    listQuestions(categoryIds) {
      if (!categoryIds) return [...data.questions];
      return data.questions.filter((q) => categoryIds.includes(q.categoryId));
    },

    async addQuestion({ categoryId, question, answer }) {
      const item = { id: randomUUID(), categoryId, question, answer };
      data.questions.push(item);
      await save();
      return item;
    },

    async updateQuestion(id, fields) {
      const item = data.questions.find((q) => q.id === id);
      if (!item) return null;
      for (const key of ['categoryId', 'question', 'answer']) {
        if (fields[key] !== undefined) item[key] = fields[key];
      }
      await save();
      return item;
    },

    async deleteQuestion(id) {
      const before = data.questions.length;
      data.questions = data.questions.filter((q) => q.id !== id);
      if (data.questions.length === before) return false;
      await save();
      return true;
    },
  };
}

async function load(filePath) {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
    return {
      categories: parsed.categories ?? [],
      questions: parsed.questions ?? [],
    };
  } catch (err) {
    if (err.code === 'ENOENT') return { categories: [], questions: [] };
    throw err;
  }
}

module.exports = { createStore };
