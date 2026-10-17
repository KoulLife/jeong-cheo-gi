// 문제 관리 화면: 항목 CRUD, 문제 등록, 문제 목록 수정·삭제
const categoryForm = document.getElementById('category-form');
const categoryList = document.getElementById('category-list');
const questionForm = document.getElementById('question-form');
const questionList = document.getElementById('question-list');
const filter = document.getElementById('filter');

let categories = [];
let questions = [];
// 수정 중인 항목/문제 id
let editingCategory = null;
let editingQuestion = null;

async function refresh() {
  [categories, questions] = await Promise.all([api.listCategories(), api.listQuestions()]);
  render();
}

function render() {
  renderCategories();
  renderCategorySelects();
  renderQuestions();
}

function renderCategories() {
  if (categories.length === 0) {
    categoryList.replaceChildren(el('li', { class: 'empty' }, '항목을 먼저 추가하세요.'));
    return;
  }
  categoryList.replaceChildren(...categories.map((c) => {
    if (editingCategory === c.id) {
      const input = el('input', { type: 'text', value: c.name, required: true });
      return el('li', {},
        el('form', {
          class: 'row',
          onsubmit: (e) => run(e, async () => {
            await api.updateCategory(c.id, input.value);
            editingCategory = null;
          }),
        },
          input,
          el('button', { type: 'button', onclick: () => { editingCategory = null; render(); } }, '취소'),
          el('button', { class: 'primary' }, '저장')));
    }
    return el('li', {},
      el('div', { class: 'head' },
        el('span', {}, el('span', { class: 'name' }, c.name), el('span', { class: 'sub' }, `  ${c.count}문제`)),
        el('div', { class: 'buttons' },
          el('button', { class: 'small', onclick: () => { editingCategory = c.id; render(); } }, '이름 변경'),
          el('button', {
            class: 'small danger',
            onclick: (e) => {
              const msg = c.count
                ? `'${c.name}' 항목과 문제 ${c.count}개를 모두 삭제할까요?`
                : `'${c.name}' 항목을 삭제할까요?`;
              if (confirm(msg)) run(e, () => api.deleteCategory(c.id));
            },
          }, '삭제'))));
  }));
}

function categoryOptions(selectedId) {
  return categories.map((c) => el('option', { value: c.id, selected: c.id === selectedId }, c.name));
}

function renderCategorySelects() {
  const select = questionForm.categoryId;
  const keep = select.value;
  select.replaceChildren(...categoryOptions(keep));
  questionForm.querySelector('button').disabled = categories.length === 0;

  const current = filter.value;
  filter.replaceChildren(el('option', { value: '' }, '전체 항목'), ...categoryOptions(current));
}

function renderQuestions() {
  const shown = filter.value ? questions.filter((q) => q.categoryId === filter.value) : questions;
  if (shown.length === 0) {
    questionList.replaceChildren(el('li', { class: 'empty' }, '등록된 문제가 없어요.'));
    return;
  }
  const nameOf = (id) => categories.find((c) => c.id === id)?.name ?? '';

  questionList.replaceChildren(...shown.map((q) => {
    if (editingQuestion === q.id) {
      const select = el('select', {}, categoryOptions(q.categoryId));
      const qInput = el('textarea', { required: true }, q.question);
      const aInput = el('textarea', { required: true }, q.answer);
      return el('li', {},
        el('form', {
          onsubmit: (e) => run(e, async () => {
            await api.updateQuestion(q.id, { categoryId: select.value, question: qInput.value, answer: aInput.value });
            editingQuestion = null;
          }),
        },
          el('label', { class: 'field' }, el('span', {}, '항목'), select),
          el('label', { class: 'field' }, el('span', {}, '문제'), qInput),
          el('label', { class: 'field' }, el('span', {}, '답'), aInput),
          el('div', { class: 'actions' },
            el('button', { type: 'button', onclick: () => { editingQuestion = null; render(); } }, '취소'),
            el('button', { class: 'primary' }, '저장'))));
    }
    return el('li', {},
      el('div', { class: 'head' },
        el('div', {},
          el('span', { class: 'tag' }, nameOf(q.categoryId)),
          el('div', { class: 'q', style: 'margin-top: 6px' }, q.question),
          el('div', { class: 'a' }, q.answer)),
        el('div', { class: 'buttons' },
          el('button', { class: 'small', onclick: () => { editingQuestion = q.id; render(); } }, '수정'),
          el('button', {
            class: 'small danger',
            onclick: (e) => { if (confirm('이 문제를 삭제할까요?')) run(e, () => api.deleteQuestion(q.id)); },
          }, '삭제'))));
  }));
}

// 폼 제출/버튼 동작을 실행하고 목록을 새로고침한다. 실패하면 메시지를 띄운다.
async function run(event, action) {
  event.preventDefault();
  try {
    await action();
    await refresh();
  } catch (err) {
    toast(err.message);
  }
}

categoryForm.addEventListener('submit', (e) => run(e, async () => {
  // form.name 은 폼 자체의 name 속성이라 elements 로 접근한다
  await api.addCategory(categoryForm.elements.name.value);
  categoryForm.reset();
}));

questionForm.addEventListener('submit', (e) => run(e, async () => {
  await api.addQuestion({
    categoryId: questionForm.categoryId.value,
    question: questionForm.question.value,
    answer: questionForm.answer.value,
  });
  // 같은 항목에 연달아 등록하기 편하도록 항목 선택은 유지한다
  questionForm.question.value = '';
  questionForm.answer.value = '';
  questionForm.question.focus();
  toast('문제를 등록했어요.');
}));

filter.addEventListener('change', renderQuestions);

refresh().catch((err) => toast(err.message));
