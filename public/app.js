// 문제 풀기 화면: 항목 선택 → 랜덤 순서로 풀기 → 완료
const app = document.getElementById('app');

const state = {
  categories: [],
  selected: new Set(),
  deck: [],
  index: 0,
  revealed: false,
};

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function categoryName(id) {
  return state.categories.find((c) => c.id === id)?.name ?? '';
}

async function showPicker() {
  state.deck = [];
  state.categories = await api.listCategories();
  // 삭제된 항목은 선택에서 뺀다
  const ids = new Set(state.categories.map((c) => c.id));
  for (const id of state.selected) if (!ids.has(id)) state.selected.delete(id);
  renderPicker();
}

function renderPicker() {
  if (state.categories.length === 0) {
    app.replaceChildren(
      el('h1', {}, '문제 풀기'),
      el('div', { class: 'card empty' },
        el('p', {}, '아직 등록된 항목이 없어요.'),
        el('a', { href: '/manage.html' }, el('button', { class: 'primary' }, '문제 등록하러 가기'))),
    );
    return;
  }

  const total = state.categories
    .filter((c) => state.selected.has(c.id))
    .reduce((sum, c) => sum + c.count, 0);
  const allOn = state.selected.size === state.categories.length;

  const chips = state.categories.map((c) =>
    el('label', { class: `chip${state.selected.has(c.id) ? ' on' : ''}` },
      el('input', {
        type: 'checkbox',
        checked: state.selected.has(c.id),
        onchange: () => {
          state.selected.has(c.id) ? state.selected.delete(c.id) : state.selected.add(c.id);
          renderPicker();
        },
      }),
      c.name,
      el('span', { class: 'count' }, String(c.count))));

  app.replaceChildren(
    el('h1', {}, '문제 풀기'),
    el('p', { class: 'sub' }, '풀고 싶은 항목을 하나 이상 고르세요. 문제는 랜덤 순서로 나와요.'),
    el('div', { class: 'card' },
      el('div', { class: 'row', style: 'justify-content: space-between; margin-bottom: 12px' },
        el('h2', { style: 'margin: 0' }, '항목'),
        el('button', {
          class: 'small',
          onclick: () => {
            state.selected = allOn ? new Set() : new Set(state.categories.map((c) => c.id));
            renderPicker();
          },
        }, allOn ? '전체 해제' : '전체 선택')),
      el('div', { class: 'chips' }, chips),
      el('div', { class: 'actions' },
        el('button', { class: 'primary big', disabled: total === 0, onclick: start },
          total ? `${total}문제 시작하기` : '항목을 선택하세요'))),
  );
}

async function start() {
  const questions = await api.listQuestions([...state.selected]);
  if (questions.length === 0) return toast('선택한 항목에 문제가 없어요.');
  state.deck = shuffle(questions);
  state.index = 0;
  state.revealed = false;
  renderQuiz();
}

function renderQuiz() {
  const { deck, index, revealed } = state;
  if (index >= deck.length) return renderDone();
  const q = deck[index];
  const last = index === deck.length - 1;

  app.replaceChildren(
    el('div', { class: 'progress' }, el('div', { style: `width: ${(index / deck.length) * 100}%` })),
    el('div', { class: 'meta' },
      el('span', {}, `${index + 1} / ${deck.length}`),
      el('span', { class: 'tag' }, categoryName(q.categoryId))),
    el('div', { class: 'card' },
      el('p', { class: 'question' }, q.question),
      revealed && el('div', { class: 'answer' }, q.answer),
      el('div', { class: 'actions' },
        el('button', { onclick: showPicker }, '그만하기'),
        revealed
          ? el('button', { class: 'primary big', onclick: next }, last ? '결과 보기' : '다음 문제')
          : el('button', { class: 'primary big', onclick: reveal }, '답안 보기'))),
    el('p', { class: 'hint' }, el('kbd', {}, 'Space'), ' 또는 ', el('kbd', {}, 'Enter'), ' 로 넘길 수 있어요'),
  );
}

function reveal() {
  state.revealed = true;
  renderQuiz();
}

function next() {
  state.index += 1;
  state.revealed = false;
  renderQuiz();
}

function renderDone() {
  app.replaceChildren(
    el('div', { class: 'progress' }, el('div', { style: 'width: 100%' })),
    el('div', { class: 'card done' },
      el('p', { class: 'big-text' }, '🎉'),
      el('h1', {}, `${state.deck.length}문제를 모두 풀었어요`),
      el('p', { class: 'sub' }, '같은 문제를 다시 섞어서 풀거나, 다른 항목을 고를 수 있어요.'),
      el('div', { class: 'actions', style: 'justify-content: center' },
        el('button', { onclick: showPicker }, '항목 다시 고르기'),
        el('button', { class: 'primary', onclick: start }, '다시 풀기'))),
  );
}

document.addEventListener('keydown', (e) => {
  if (!state.deck.length || state.index >= state.deck.length) return;
  if (e.key !== ' ' && e.key !== 'Enter') return;
  e.preventDefault();
  state.revealed ? next() : reveal();
});

showPicker().catch((err) => toast(err.message));
