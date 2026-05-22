const els = {
  dateLabel: document.querySelector('#dateLabel'),
  dayHint: document.querySelector('#dayHint'),
  prevDay: document.querySelector('#prevDay'),
  nextDay: document.querySelector('#nextDay'),
  imageStage: document.querySelector('#imageStage'),
  imagePrev: document.querySelector('#imagePrev'),
  imageNext: document.querySelector('#imageNext'),
  dailyImage: document.querySelector('#dailyImage'),
  imageCaption: document.querySelector('#imageCaption'),
  commentStatus: document.querySelector('#commentStatus'),
  commentForm: document.querySelector('#commentForm'),
  commentInput: document.querySelector('#commentInput'),
  charCount: document.querySelector('#charCount'),
  commentsList: document.querySelector('#commentsList'),
  commentTemplate: document.querySelector('#commentTemplate')
};

let daysConfig = {};
let currentDate = startOfLocalDay(new Date());
const today = startOfLocalDay(new Date());
let localMode = false;

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function displayDate(date) {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfLocalDay(next);
}

function isFuture(date) {
  return date.getTime() > today.getTime();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function loadDaysConfig() {
  try {
    const response = await fetchWithTimeout('/data/days.json', { cache: 'no-cache' }, 5000);
    if (!response.ok) return;
    daysConfig = await response.json();
  } catch (error) {
    console.warn('每日图片配置读取失败，使用默认占位图：', error);
    daysConfig = {};
  }
}

function updateImage(dateKey) {
  const config = daysConfig[dateKey] || {};
  els.dailyImage.src = config.image || '/images/placeholder.svg';
  els.dailyImage.alt = config.alt || `${dateKey} 的每日图片`;
  els.imageCaption.textContent = config.caption || '这里是图片预留区。以后把图片放到 images 文件夹，并在 data/days.json 里配置即可。';
}

function updateDateUi() {
  const dateKey = formatDate(currentDate);
  els.dateLabel.textContent = displayDate(currentDate);
  els.dayHint.textContent = dateKey === formatDate(today) ? '今天' : dateKey;
  const disableNext = isFuture(addDays(currentDate, 1));
  els.nextDay.disabled = disableNext;
  els.imageNext.disabled = disableNext;
  updateImage(dateKey);
}

async function fetchComments(dateKey) {
  if (localMode) return readLocalComments(dateKey);

  try {
    const response = await fetchWithTimeout(`/api/comments?date=${encodeURIComponent(dateKey)}`, { cache: 'no-cache' }, 8000);
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  } catch (error) {
    console.warn('评论 API 不可用，已切换为本地浏览器存储模式：', error);
    localMode = true;
    return readLocalComments(dateKey);
  }
}

async function postComment(dateKey, role, content) {
  if (localMode) {
    return saveLocalComment(dateKey, role, content);
  }

  try {
    const response = await fetchWithTimeout('/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: dateKey, role, content })
    }, 8000);

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || '发布失败');
    }

    return response.json();
  } catch (error) {
    console.warn('云端发布失败，已临时保存到本地浏览器：', error);
    localMode = true;
    return saveLocalComment(dateKey, role, content);
  }
}

function localStorageKey(dateKey) {
  return `daily-comments:${dateKey}`;
}

function readLocalComments(dateKey) {
  try {
    return JSON.parse(localStorage.getItem(localStorageKey(dateKey)) || '[]');
  } catch {
    return [];
  }
}

function saveLocalComment(dateKey, role, content) {
  const comment = {
    id: Date.now(),
    date: dateKey,
    role,
    content,
    created_at: new Date().toISOString()
  };
  const comments = readLocalComments(dateKey);
  comments.unshift(comment);
  localStorage.setItem(localStorageKey(dateKey), JSON.stringify(comments.slice(0, 200)));
  return comment;
}

function renderComments(comments) {
  els.commentsList.textContent = '';

  if (!comments.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '今天还没有评论。选择 A / B / C 发表第一条吧。';
    els.commentsList.append(empty);
    return;
  }

  for (const comment of comments) {
    const node = els.commentTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.role-badge').textContent = comment.role;
    const time = node.querySelector('time');
    time.textContent = formatTime(comment.created_at);
    time.dateTime = comment.created_at;
    node.querySelector('p').textContent = comment.content;
    els.commentsList.append(node);
  }
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function refresh() {
  updateDateUi();
  const dateKey = formatDate(currentDate);
  els.commentStatus.textContent = '正在读取评论…';
  const comments = await fetchComments(dateKey);
  renderComments(comments);
  els.commentStatus.textContent = localMode ? `本地模式：${comments.length} 条评论` : `${comments.length} 条评论`;
}

async function goToDate(date) {
  if (isFuture(date)) return;
  currentDate = startOfLocalDay(date);
  await refresh();
}

function requireElements() {
  const missing = Object.entries(els).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    throw new Error(`页面元素缺失：${missing.join(', ')}`);
  }
}

function bindEvents() {
  els.prevDay.addEventListener('click', () => goToDate(addDays(currentDate, -1)));
  els.imagePrev.addEventListener('click', () => goToDate(addDays(currentDate, -1)));
  els.nextDay.addEventListener('click', () => goToDate(addDays(currentDate, 1)));
  els.imageNext.addEventListener('click', () => goToDate(addDays(currentDate, 1)));

  els.imageStage.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') goToDate(addDays(currentDate, -1));
    if (event.key === 'ArrowRight') goToDate(addDays(currentDate, 1));
  });

  els.commentInput.addEventListener('input', () => {
    els.charCount.textContent = `${els.commentInput.value.length} / 300`;
  });

  els.commentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(els.commentForm);
    const role = formData.get('role');
    const content = els.commentInput.value.trim();
    const dateKey = formatDate(currentDate);
    if (!content) return;

    const submit = els.commentForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = '发布中…';

    try {
      const newComment = await postComment(dateKey, role, content);
      els.commentInput.value = '';
      els.charCount.textContent = '0 / 300';

      if (localMode) {
        const localComments = readLocalComments(dateKey);
        renderComments(localComments);
        els.commentStatus.textContent = `本地模式：${localComments.length} 条评论`;
      } else {
        const currentComments = await fetchComments(dateKey);
        renderComments(currentComments.length ? currentComments : [newComment]);
        els.commentStatus.textContent = `${Math.max(currentComments.length, 1)} 条评论`;
      }
    } catch (error) {
      alert(error.message || '发布失败');
    } finally {
      submit.disabled = false;
      submit.textContent = '发布评论';
    }
  });
}

async function init() {
  requireElements();
  bindEvents();
  updateDateUi();
  await loadDaysConfig();
  await refresh();
}

init().catch((error) => {
  console.error(error);
  if (els.dateLabel) els.dateLabel.textContent = displayDate(currentDate);
  if (els.commentStatus) els.commentStatus.textContent = `脚本初始化失败：${error.message}`;
});
