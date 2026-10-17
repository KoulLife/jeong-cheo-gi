// 서버 API 호출 모음. 실패하면 서버가 준 메시지로 Error 를 던진다.
async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '요청에 실패했습니다.');
  return data;
}

const api = {
  listCategories: () => request('GET', '/api/categories'),
  addCategory: (name) => request('POST', '/api/categories', { name }),
  updateCategory: (id, name) => request('PUT', `/api/categories/${id}`, { name }),
  deleteCategory: (id) => request('DELETE', `/api/categories/${id}`),

  listQuestions: (categoryIds) =>
    request('GET', categoryIds ? `/api/questions?categoryIds=${categoryIds.join(',')}` : '/api/questions'),
  addQuestion: (fields) => request('POST', '/api/questions', fields),
  updateQuestion: (id, fields) => request('PUT', `/api/questions/${id}`, fields),
  deleteQuestion: (id) => request('DELETE', `/api/questions/${id}`),
};

// 태그 이름, 속성, 자식으로 DOM 요소를 만든다. 문자열 자식은 텍스트로 들어가므로 HTML 로 해석되지 않는다.
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'class') node.className = value;
    else if (value === true) node.setAttribute(key, '');
    else if (value !== false && value != null) node.setAttribute(key, value);
  }
  // `조건 && 요소` 패턴을 쓸 수 있도록 null/undefined/false 는 건너뛴다
  node.append(...children.flat().filter((c) => c != null && c !== false));
  return node;
}

function toast(message) {
  const node = el('div', { class: 'toast', role: 'status' }, message);
  document.body.append(node);
  setTimeout(() => node.remove(), 2500);
}
