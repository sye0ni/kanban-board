let _db;
let currentUser;
let draggedCard    = null;
let modalTargetCol = null;
let touchCard      = null;
let touchGhost     = null;
let touchOffsetX   = 0;
let touchOffsetY   = 0;

const PRIORITY_LABEL = { high: '높음', medium: '중간', low: '낮음' };

// ── UI 헬퍼 ────────────────────────────────────────────────────────────────

function updateBadges() {
  document.querySelectorAll('.column').forEach(col => {
    const count = col.querySelectorAll('.card').length;
    col.querySelector('.badge').textContent = count;
    const ph = col.querySelector('.empty-placeholder');
    if (ph) ph.style.display = count === 0 ? '' : 'none';
  });
}

// ── Supabase CRUD ──────────────────────────────────────────────────────────

async function loadCards() {
  const { data, error } = await _db
    .from('cards')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('position');

  if (error) { console.error('loadCards:', error); return; }

  data.forEach(row => {
    const col = document.querySelector(`.column[data-status="${row.status}"]`);
    if (!col) return;
    col.querySelector('.cards').appendChild(
      createCardDOM(row.id, row.title, row.description || '', row.priority || 'medium')
    );
  });
  updateBadges();
}

async function dbAddCard(title, desc, status, priority) {
  const position = document.querySelectorAll(`.column[data-status="${status}"] .card`).length;
  const { data, error } = await _db
    .from('cards')
    .insert({ user_id: currentUser.id, title, description: desc, status, priority, position })
    .select()
    .single();
  if (error) { console.error('dbAddCard:', error); return null; }
  return data;
}

async function dbDeleteCard(dbId) {
  const { error } = await _db.from('cards').delete().eq('id', dbId);
  if (error) console.error('dbDeleteCard:', error);
}

async function dbUpdateCard(dbId, fields) {
  const { error } = await _db.from('cards').update(fields).eq('id', dbId);
  if (error) console.error('dbUpdateCard:', error);
}

// 컬럼 내 카드 DOM 순서 기준으로 position + status 일괄 업데이트
async function dbUpdatePositions(statusList) {
  await Promise.all(
    [...new Set(statusList)].flatMap(status => {
      const cards = [...document.querySelectorAll(`.column[data-status="${status}"] .card`)];
      return cards.map((card, i) =>
        _db.from('cards').update({ status, position: i }).eq('id', card.dataset.dbId)
      );
    })
  );
}

// ── 드래그 앤 드롭 (데스크탑) ──────────────────────────────────────────────

function getDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll('.card:not(.dragging)')];
  return cards.reduce((closest, child) => {
    const box    = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function addDragEvents(card) {
  card.addEventListener('dragstart', () => {
    draggedCard = card;
    setTimeout(() => card.classList.add('dragging'), 0);
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
    draggedCard = null;
    updateBadges();
  });
}

function addColumnDropEvents(column) {
  const cardsArea = column.querySelector('.cards');

  column.addEventListener('dragover', e => {
    e.preventDefault();
    column.classList.add('drag-over');
  });

  column.addEventListener('dragleave', e => {
    if (!column.contains(e.relatedTarget)) column.classList.remove('drag-over');
  });

  column.addEventListener('drop', async e => {
    e.preventDefault();
    column.classList.remove('drag-over');
    if (!draggedCard) return;

    const oldStatus = draggedCard.closest('.column')?.dataset.status;
    const newStatus = column.dataset.status;
    const afterEl   = getDragAfterElement(cardsArea, e.clientY);

    if (afterEl) cardsArea.insertBefore(draggedCard, afterEl);
    else cardsArea.appendChild(draggedCard);

    updateBadges();
    await dbUpdatePositions(oldStatus !== newStatus ? [oldStatus, newStatus] : [newStatus]);
  });
}

// ── 터치 드래그 (모바일) ───────────────────────────────────────────────────

function addTouchEvents(card) {
  card.addEventListener('touchstart', e => {
    const touch = e.touches[0];
    const rect  = card.getBoundingClientRect();
    touchOffsetX = touch.clientX - rect.left;
    touchOffsetY = touch.clientY - rect.top;
    touchCard    = card;

    touchGhost = card.cloneNode(true);
    Object.assign(touchGhost.style, {
      position: 'fixed', width: `${rect.width}px`, opacity: '0.85',
      pointerEvents: 'none', zIndex: '999', transform: 'rotate(2deg)',
      left: `${touch.clientX - touchOffsetX}px`,
      top:  `${touch.clientY - touchOffsetY}px`,
    });
    document.body.appendChild(touchGhost);
    card.classList.add('dragging');
    e.preventDefault();
  }, { passive: false });

  card.addEventListener('touchmove', e => {
    if (!touchGhost) return;
    const touch = e.touches[0];
    touchGhost.style.left = `${touch.clientX - touchOffsetX}px`;
    touchGhost.style.top  = `${touch.clientY - touchOffsetY}px`;
    touchGhost.style.display = 'none';
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    touchGhost.style.display = '';
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
    el?.closest('.column')?.classList.add('drag-over');
    e.preventDefault();
  }, { passive: false });

  card.addEventListener('touchend', async e => {
    if (!touchCard || !touchGhost) return;
    const touch     = e.changedTouches[0];
    const oldStatus = touchCard.closest('.column')?.dataset.status;

    touchGhost.style.display = 'none';
    const el  = document.elementFromPoint(touch.clientX, touch.clientY);
    touchGhost.style.display = '';

    const col = el?.closest('.column');
    if (col) {
      const afterEl = getDragAfterElement(col.querySelector('.cards'), touch.clientY);
      if (afterEl) col.querySelector('.cards').insertBefore(touchCard, afterEl);
      else col.querySelector('.cards').appendChild(touchCard);
    }

    touchCard.classList.remove('dragging');
    touchGhost.remove();
    const movedCard = touchCard;
    touchGhost = null;
    touchCard  = null;
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
    updateBadges();

    if (col) {
      const newStatus = col.dataset.status;
      await dbUpdatePositions(oldStatus !== newStatus ? [oldStatus, newStatus] : [newStatus]);
    }
  });
}

// ── 인라인 편집 ────────────────────────────────────────────────────────────

function makeEditable(el, multiline, dbId) {
  const original = el.textContent;
  const input    = document.createElement(multiline ? 'textarea' : 'input');
  input.className = multiline ? 'card-desc-edit' : 'card-title-edit';
  input.value = original;
  if (multiline) input.rows = 2;

  el.replaceWith(input);
  input.focus();
  if (!multiline) input.select();

  const field = multiline ? 'description' : 'title';
  const save  = async () => {
    const val = input.value.trim();
    el.textContent = val || original;
    input.replaceWith(el);
    if (val && val !== original) await dbUpdateCard(dbId, { [field]: val });
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (!multiline && e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); input.replaceWith(el); }
  });
}

// ── 카드 DOM 생성 ──────────────────────────────────────────────────────────

function createCardDOM(dbId, title, desc = '', priority = 'medium') {
  const card = document.createElement('div');
  card.classList.add('card');
  card.setAttribute('draggable', 'true');
  card.dataset.priority = priority;
  card.dataset.dbId     = String(dbId);

  // 우선순위 뱃지
  const badge = document.createElement('span');
  badge.className   = `priority-badge ${priority}`;
  badge.textContent = PRIORITY_LABEL[priority] ?? '중간';
  card.appendChild(badge);

  // 제목
  const titleEl = document.createElement('p');
  titleEl.classList.add('card-title');
  titleEl.textContent = title;
  titleEl.title = '더블클릭하여 편집';
  titleEl.addEventListener('dblclick', e => { e.stopPropagation(); makeEditable(titleEl, false, dbId); });
  card.appendChild(titleEl);

  // 설명
  if (desc) {
    const descEl = document.createElement('p');
    descEl.classList.add('card-desc');
    descEl.textContent = desc;
    descEl.title = '더블클릭하여 편집';
    descEl.addEventListener('dblclick', e => { e.stopPropagation(); makeEditable(descEl, true, dbId); });
    card.appendChild(descEl);
  }

  // 삭제 버튼
  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('card-delete');
  deleteBtn.textContent = '×';
  deleteBtn.title = '카드 삭제';
  deleteBtn.addEventListener('click', async () => {
    await dbDeleteCard(dbId);
    card.remove();
    updateBadges();
  });
  card.appendChild(deleteBtn);

  addDragEvents(card);
  addTouchEvents(card);
  return card;
}

// ── 모달 ───────────────────────────────────────────────────────────────────

function openModal(column) {
  modalTargetCol = column;
  document.getElementById('modal-title-input').value = '';
  document.getElementById('modal-desc-input').value  = '';
  document.getElementById('modal-title-input').classList.remove('error');
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.priority === 'medium');
  });
  document.getElementById('card-modal').classList.remove('hidden');
  document.getElementById('modal-title-input').focus();
}

function closeModal() {
  document.getElementById('card-modal').classList.add('hidden');
  modalTargetCol = null;
}

async function submitModal() {
  const titleInput = document.getElementById('modal-title-input');
  const title      = titleInput.value.trim();
  if (!title) { titleInput.classList.add('error'); titleInput.focus(); return; }

  const desc     = document.getElementById('modal-desc-input').value.trim();
  const priority = document.querySelector('.priority-btn.selected')?.dataset.priority || 'medium';
  const status   = modalTargetCol.dataset.status;

  const row = await dbAddCard(title, desc, status, priority);
  if (!row) return;

  modalTargetCol.querySelector('.cards').appendChild(
    createCardDOM(row.id, row.title, row.description || '', row.priority)
  );
  updateBadges();
  closeModal();
}

function initModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-submit-btn').addEventListener('click', submitModal);
  document.getElementById('card-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('modal-title-input').addEventListener('keydown', e => {
    if (e.key === 'Enter')  submitModal();
    if (e.key === 'Escape') closeModal();
  });
  document.getElementById('modal-desc-input').addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
  document.getElementById('modal-title-input').addEventListener('input', e => {
    e.target.classList.remove('error');
  });
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

// ── 초기화 ────────────────────────────────────────────────────────────────

async function init() {
  _db = window._supabase;

  // 세션 확인 — 없으면 login.html 로 이동
  currentUser = await requireAuth();
  if (!currentUser) return;

  // 헤더에 유저 이메일 표시
  const emailDisplay = currentUser.email
    ?? currentUser.user_metadata?.full_name
    ?? currentUser.user_metadata?.user_name
    ?? '';
  document.getElementById('user-email').textContent = emailDisplay;
  document.getElementById('logout-btn').addEventListener('click', signOut);

  // 이벤트 초기화
  document.querySelectorAll('.column').forEach(addColumnDropEvents);
  initModal();
  document.querySelectorAll('.add-card-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.closest('.column')));
  });

  // Supabase DB 에서 카드 로드
  await loadCards();
}

document.addEventListener('DOMContentLoaded', init);
