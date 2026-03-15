const apiBase = '/api/sessions';

const $ = (selector) => document.querySelector(selector);
const DAYS_TO_SHOW = 2; // 初期表示は「今日から2日間」の予定
let showAllSessions = false;

const formatDatetimeLocal = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - tzOffset * 60000);
  return local.toISOString().slice(0, 16);
};

const filterSessionsForNextDays = (sessions, days = DAYS_TO_SHOW) => {
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return sessions.filter((session) => {
    const start = new Date(session.startAt);
    const endAt = new Date(session.endAt);
    // 期間内に開始または継続しているセッションを含める
    return endAt > now && start < end;
  });
};

const parseTags = (value) =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const buildTagHtml = (tags) =>
  (tags || [])
    .map((tag) => `<span class="tag">${tag}</span>`)
    .join('');

const displaySessions = (sessions) => {
  const tbody = $('#sessionsTable tbody');
  tbody.innerHTML = '';

  if (!sessions.length) {
    $('#emptyMessage').style.display = 'block';
    $('#sessionsTable').style.display = 'none';
    return;
  }

  $('#emptyMessage').style.display = 'none';
  $('#sessionsTable').style.display = '';

  sessions.forEach((session) => {
    const tr = document.createElement('tr');

    const start = document.createElement('td');
    start.textContent = new Date(session.startAt).toLocaleString();

    const end = document.createElement('td');
    end.textContent = new Date(session.endAt).toLocaleString();

    const title = document.createElement('td');
    title.textContent = session.title;

    const venue = document.createElement('td');
    venue.textContent = session.venue || '-';

    const tags = document.createElement('td');
    tags.innerHTML = buildTagHtml(session.tags);

    const notes = document.createElement('td');
    notes.textContent = session.notes || '-';

    const actions = document.createElement('td');
    actions.className = 'actions';
    actions.innerHTML = `
      <button type="button" data-action="edit" data-id="${session.id}">編集</button>
      <button type="button" data-action="delete" data-id="${session.id}">削除</button>
    `;

    tr.append(start, end, title, venue, tags, notes, actions);
    tbody.appendChild(tr);
  });
};

const fetchSessions = async () => {
  const res = await fetch(apiBase);
  const json = await res.json();
  return json.data || [];
};

const refreshSessions = async () => {
  const sessions = await fetchSessions();
  const sessionsToDisplay = showAllSessions ? sessions : filterSessionsForNextDays(sessions);
  displaySessions(sessionsToDisplay);
};

const clearForm = () => {
  $('#sessionId').value = '';
  $('#title').value = '';
  $('#startAt').value = '';
  $('#endAt').value = '';
  $('#venue').value = '';
  $('#tags').value = '';
  $('#notes').value = '';
  $('#formTitle').textContent = 'セッションを追加';
  $('#saveBtn').textContent = '保存';
};

const fillForm = (session) => {
  $('#sessionId').value = session.id;
  $('#title').value = session.title;
  $('#startAt').value = formatDatetimeLocal(session.startAt);
  $('#endAt').value = formatDatetimeLocal(session.endAt);
  $('#venue').value = session.venue || '';
  $('#tags').value = (session.tags || []).join(', ');
  $('#notes').value = session.notes || '';
  $('#formTitle').textContent = 'セッションを編集';
  $('#saveBtn').textContent = '更新';
};

const submitForm = async (event) => {
  event.preventDefault();

  const id = $('#sessionId').value;
  const payload = {
    title: $('#title').value.trim(),
    startAt: new Date($('#startAt').value).toISOString(),
    endAt: new Date($('#endAt').value).toISOString(),
    venue: $('#venue').value.trim(),
    tags: parseTags($('#tags').value),
    notes: $('#notes').value.trim()
  };

  const errorIf = (condition, msg) => {
    if (condition) throw new Error(msg);
  };

  try {
    errorIf(!payload.title, 'タイトルを入力してください');
    errorIf(!payload.startAt || !payload.endAt, '開始/終了日時を指定してください');
    errorIf(new Date(payload.startAt) >= new Date(payload.endAt), '開始日時は終了日時より前に設定してください');

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${apiBase}/${id}` : apiBase;

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    clearForm();
    await refreshSessions();
  } catch (err) {
    alert(err.message);
  }
};

const deleteSession = async (id) => {
  if (!confirm('本当に削除しますか？')) return;
  await fetch(`${apiBase}/${id}`, { method: 'DELETE' });
  await refreshSessions();
};

const init = async () => {
  await refreshSessions();

  $('#sessionForm').addEventListener('submit', submitForm);
  $('#cancelBtn').addEventListener('click', (e) => {
    e.preventDefault();
    clearForm();
  });

  $('#refreshBtn').addEventListener('click', async () => {
    await refreshSessions();
  });

  $('#exportBtn').addEventListener('click', () => {
    window.location.href = `${apiBase}/export.ics`;
  });

  const toggleBtn = $('#toggleRangeBtn');
  const updateToggleButton = () => {
    toggleBtn.textContent = showAllSessions ? '2日間の予定に戻す' : '全予定を表示';
  };
  updateToggleButton();

  toggleBtn.addEventListener('click', async () => {
    showAllSessions = !showAllSessions;
    updateToggleButton();
    await refreshSessions();
  });

  $('#sessionsTable').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === 'edit') {
      const row = button.closest('tr');
      if (!row) return;
      const cells = row.querySelectorAll('td');
      const session = {
        id: Number(id),
        title: cells[2].textContent,
        startAt: new Date(cells[0].textContent).toISOString(),
        endAt: new Date(cells[1].textContent).toISOString(),
        venue: cells[3].textContent === '-' ? '' : cells[3].textContent,
        tags: Array.from(cells[4].querySelectorAll('.tag')).map((t) => t.textContent),
        notes: cells[5].textContent === '-' ? '' : cells[5].textContent
      };
      fillForm(session);
    }

    if (action === 'delete') {
      deleteSession(id);
    }
  });

  const socket = io();
  socket.on('sessions:created', refreshSessions);
  socket.on('sessions:updated', refreshSessions);
  socket.on('sessions:deleted', refreshSessions);
};

init().catch((err) => {
  console.error(err);
  alert('起動中にエラーが発生しました。コンソールを確認してください。');
});
