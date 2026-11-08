'use strict';

const api = window.lumen;

const els = {
  grid: document.getElementById('grid'),
  empty: document.getElementById('empty'),
  emptyTitle: document.getElementById('emptyTitle'),
  emptyText: document.getElementById('emptyText'),
  emptyOpenFolder: document.getElementById('emptyOpenFolder'),
  countLabel: document.getElementById('countLabel'),
  tagChips: document.getElementById('tagChips'),
  searchInput: document.getElementById('searchInput'),
  searchKbd: document.getElementById('searchKbd'),
  nowCard: document.getElementById('nowCard'),
  nowBg: document.getElementById('nowBg'),
  nowStatus: document.getElementById('nowStatus'),
  nowMain: document.getElementById('nowMain'),
  nowActions: document.getElementById('nowActions'),
  openFolderBtn: document.getElementById('openFolderBtn'),
  addBtn: document.getElementById('addBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  addModal: document.getElementById('addModal'),
  addClose: document.getElementById('addClose'),
  addDone: document.getElementById('addDone'),
  addOpenFolder: document.getElementById('addOpenFolder'),
  copyPathBtn: document.getElementById('copyPathBtn'),
  pathLine: document.getElementById('pathLine'),
  footAdd: document.getElementById('footAdd'),
  platformLabel: document.getElementById('platformLabel'),
  footRight: document.getElementById('footRight'),
  toasts: document.getElementById('toasts'),
  winMinimize: document.getElementById('winMinimize'),
  winMaximize: document.getElementById('winMaximize'),
  winClose: document.getElementById('winClose'),
  titlebar: document.getElementById('titlebar'),
};

const ICONS = {
  play: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.2 5.6v8.8l7.4-4.4z" fill="currentColor" stroke="none"/></svg>',
  monitor:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.8" y="3.5" width="14.4" height="10" rx="1.6"/><path d="M7.2 16.5h5.6M10 13.5v3"/></svg>',
  check: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10.5l3.4 3.4 7.6-8"/></svg>',
  stop: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6.2" y="6.2" width="7.6" height="7.6" rx="1.2"/></svg>',
  retry:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 6.5A6.5 6.5 0 1 0 16.4 12"/><path d="M16.5 3v4h-4"/></svg>',
};

let state = null;
let activeTag = '__all__';
let query = '';
let busyId = null;
let emptyMode = 'folder';
let lastProblemsSignature = '';
let toastCounter = 0;

function platformName(platform) {
  if (platform === 'win32') return 'Windows';
  if (platform === 'darwin') return 'macOS';
  if (platform === 'linux') return 'Linux';
  return platform;
}

function init() {
  document.body.classList.add('platform-' + (api ? api.platform : 'unknown'));
  if (!els.searchKbd) return;
  els.searchKbd.textContent = navigator.platform.toLowerCase().includes('mac') ? '⌘F' : 'Ctrl F';

  if (!api) {
    showFatal('请在流光壁纸应用内打开此页面。');
    return;
  }

  bindWindowControls();
  bindStaticActions();
  bindKeyboard();

  api
    .getState()
    .then((initial) => {
      render(initial);
      api.onState(render);
      api.onWindowState((windowState) => {
        updateMaximizeButton(Boolean(windowState && windowState.maximized));
      });
      api.onNotify((payload) => {
        if (!payload || !payload.message) return;
        toast(payload.message, payload.type === 'error' ? 'error' : 'ok', { duration: 6500 });
      });
      api
        .window.isMaximized()
        .then((maximized) => updateMaximizeButton(Boolean(maximized)))
        .catch(() => {});
    })
    .catch((error) => {
      showFatal('无法读取壁纸目录：' + error.message);
    });
}

function showFatal(message) {
  if (!els.grid) return;
  els.grid.hidden = true;
  els.empty.hidden = false;
  els.emptyTitle.textContent = '引擎未能启动';
  els.emptyText.textContent = message;
  els.emptyOpenFolder.hidden = true;
}

function bindWindowControls() {
  if (!els.winMinimize) return;
  els.winMinimize.addEventListener('click', () => api.window.minimize());
  els.winMaximize.addEventListener('click', async () => {
    const maximized = await api.window.toggleMaximize();
    updateMaximizeButton(Boolean(maximized));
  });
  els.winClose.addEventListener('click', () => api.window.close());
  els.titlebar.addEventListener('dblclick', (event) => {
    if (event.target.closest('button')) return;
    els.winMaximize.click();
  });
}

function updateMaximizeButton(maximized) {
  if (!els.winMaximize) return;
  els.winMaximize.innerHTML = maximized
    ? '<svg viewBox="0 0 12 12"><rect x="2.6" y="3.6" width="6" height="6" rx="0.6"/><path d="M4.2 3.6V2.6h5.2v5.2h-1"/></svg>'
    : '<svg viewBox="0 0 12 12"><rect x="2.2" y="2.2" width="7.6" height="7.6" rx="0.6"/></svg>';
  els.winMaximize.setAttribute('aria-label', maximized ? '还原' : '最大化');
  els.winMaximize.setAttribute('title', maximized ? '还原' : '最大化');
}

function bindStaticActions() {
  els.openFolderBtn.addEventListener('click', () => openWallpapersFolder());
  els.addBtn.addEventListener('click', () => openAddModal());
  els.footAdd.addEventListener('click', () => openAddModal());
  els.refreshBtn.addEventListener('click', () => refreshWallpapers());

  els.addClose.addEventListener('click', () => closeAddModal());
  els.addDone.addEventListener('click', () => closeAddModal());
  els.addOpenFolder.addEventListener('click', () => openWallpapersFolder());
  els.addModal.addEventListener('click', (event) => {
    if (event.target === els.addModal) closeAddModal();
  });
  els.copyPathBtn.addEventListener('click', async () => {
    const result = await api.copyWallpapersPath();
    if (result && result.ok) toast('壁纸目录路径已复制。');
  });

  els.emptyOpenFolder.addEventListener('click', () => {
    if (emptyMode === 'filter') {
      query = '';
      activeTag = '__all__';
      els.searchInput.value = '';
      renderChips();
      renderGrid();
      els.searchInput.focus();
      return;
    }
    openWallpapersFolder();
  });

  els.grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const card = button.closest('.card');
    if (!card) return;
    const id = card.dataset.id;
    const action = button.dataset.action;
    if (action === 'play') openPreview(id);
    if (action === 'apply') applyWallpaper(id);
  });

  els.grid.addEventListener('dblclick', (event) => {
    const thumb = event.target.closest('.thumb');
    if (!thumb) return;
    const card = thumb.closest('.card');
    if (!card) return;
    openPreview(card.dataset.id);
  });

  els.nowActions.addEventListener('click', (event) => {
    const button = event.target.closest('[data-now-action]');
    if (!button) return;
    const action = button.dataset.nowAction;
    if (!state || !state.currentId) return;
    if (action === 'preview') openPreview(state.currentId);
    if (action === 'stop') stopWallpaper();
    if (action === 'retry') applyWallpaper(state.currentId);
  });

  els.searchInput.addEventListener('input', () => {
    query = els.searchInput.value.trim();
    renderGrid();
  });

  els.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      els.searchInput.value = '';
      query = '';
      renderGrid();
      els.searchInput.blur();
    }
  });
}

function bindKeyboard() {
  window.addEventListener('keydown', (event) => {
    const command = event.metaKey || event.ctrlKey;
    if (command && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      els.searchInput.focus();
      els.searchInput.select();
      return;
    }
    if (!command && event.key === '/') {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      event.preventDefault();
      els.searchInput.focus();
      return;
    }
    if (event.key === 'Escape') {
      if (!els.addModal.hidden) {
        closeAddModal();
        return;
      }
    }
  });
}

function openWallpapersFolder() {
  api.openWallpapersFolder().then((result) => {
    if (result && result.ok === false && result.error) {
      toast('无法打开壁纸目录：' + result.error, 'error');
    }
  });
}

async function refreshWallpapers() {
  els.refreshBtn.classList.add('busy');
  els.refreshBtn.disabled = true;
  try {
    const result = await api.refresh();
    if (result && result.state) render(result.state);
    toast('已重新扫描壁纸目录。');
  } catch (error) {
    toast('扫描失败：' + error.message, 'error');
  } finally {
    els.refreshBtn.classList.remove('busy');
    els.refreshBtn.disabled = false;
  }
}

function openAddModal() {
  if (!state) return;
  els.pathLine.textContent = state.wallpapersDir || '';
  els.addModal.hidden = false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => {
    const first = els.addModal.querySelector('.btn.gold');
    if (first) first.focus();
  });
}

function closeAddModal() {
  els.addModal.hidden = true;
  document.body.classList.remove('modal-open');
  els.addBtn.focus();
}

async function openPreview(id) {
  try {
    const result = await api.preview(id);
    if (result && result.ok === false) {
      toast(result.error || '无法打开预览。', 'error');
    }
  } catch (error) {
    toast('无法打开预览：' + error.message, 'error');
  }
}

async function applyWallpaper(id) {
  if (busyId) return;
  const item = state && state.wallpapers.find((entry) => entry.id === id);
  const title = item ? item.title : '壁纸';
  busyId = id;
  renderGrid();

  try {
    const result = await api.apply(id);
    busyId = null;
    if (result && result.state) render(result.state);
    else renderGrid();

    if (result && result.ok) {
      toast(`已应用《${title}》，桌面已切换。`, {
        action: {
          label: '查看桌面',
          onClick: () => api.window.minimize(),
        },
        duration: 5200,
      });
    } else {
      const message = (result && result.error) || '应用失败。';
      const options = { duration: 8000 };
      if (/webview2/i.test(message)) {
        options.action = {
          label: '下载 WebView2',
          onClick: () => api.openWebView2Download(),
        };
      }
      toast(message, 'error', options);
    }
  } catch (error) {
    busyId = null;
    renderGrid();
    toast('应用失败：' + error.message, 'error');
  }
}

async function stopWallpaper() {
  try {
    const result = await api.stop();
    if (result && result.state) render(result.state);
    toast('已停止动态壁纸，桌面已恢复原来的壁纸。');
  } catch (error) {
    toast('停止失败：' + error.message, 'error');
  }
}

function render(nextState) {
  if (!nextState) return;
  state = nextState;
  document.title = state.currentId
    ? (state.wallpapers.find((item) => item.id === state.currentId) || {}).title + ' · 流光壁纸'
    : '流光壁纸 · Lumen';

  els.countLabel.textContent = `${state.wallpapers.length} 幅动态壁纸`;
  els.pathLine.textContent = state.wallpapersDir || '';
  els.platformLabel.textContent = platformName(state.platform);
  if (state.version) {
    const existing = els.footRight.querySelector('.version');
    if (existing) existing.textContent = 'v' + state.version;
    else {
      const version = document.createElement('span');
      version.className = 'version';
      version.textContent = 'v' + state.version;
      els.footRight.appendChild(version);
    }
  }

  renderNow();
  renderChips();
  renderGrid();
  reportProblems();
}

function currentWallpaper() {
  if (!state || !state.currentId) return null;
  return state.wallpapers.find((item) => item.id === state.currentId) || null;
}

function renderNow() {
  const current = currentWallpaper();
  els.nowBg.style.backgroundImage = current && current.previewUrl ? `url("${current.previewUrl}")` : '';
  els.nowCard.classList.toggle('idle', !current);
  els.nowStatus.className = 'now-status' + (!current ? ' idle' : '');

  if (!current) {
    els.nowStatus.innerHTML = '<i></i> 待机';
    els.nowMain.innerHTML = `
      <p class="now-kicker">还没有应用壁纸</p>
      <h2>选一幅，点亮桌面。</h2>
      <p class="now-desc">点击任意壁纸的「应用」，它会替换系统桌面；关闭窗口后仍会在托盘里继续播放。</p>
    `;
    els.nowActions.innerHTML = '';
    return;
  }

  let statusText = '播放中';
  let statusClass = '';
  let kicker = '正在桌面播放';
  let description = current.description;
  const actions = [];

  if (state.hostStatus === 'starting') {
    statusText = '正在连接桌面…';
    statusClass = ' starting';
    kicker = '正在应用';
    description = '正在创建桌面壁纸层，稍等片刻。';
  } else if (state.hostStatus === 'error') {
    statusText = '启动失败';
    statusClass = ' error';
    kicker = '桌面壁纸出错';
    description = state.hostError || '无法连接到桌面壁纸层。';
    actions.push({ id: 'retry', label: '重试', icon: ICONS.retry, style: 'ghost' });
  } else if (state.hostStatus === 'idle') {
    statusText = '已停止';
    statusClass = ' idle';
    kicker = '桌面壁纸';
  }

  els.nowStatus.className = 'now-status' + statusClass;
  els.nowStatus.innerHTML = `<i></i> ${statusText}`;
  els.nowMain.innerHTML = `
    <p class="now-kicker"></p>
    <h2></h2>
    <p class="now-desc"></p>
  `;
  els.nowMain.querySelector('.now-kicker').textContent = kicker;
  els.nowMain.querySelector('h2').textContent = current.title;
  els.nowMain.querySelector('.now-desc').textContent = description;

  actions.unshift(
    { id: 'preview', label: '预览', icon: ICONS.play, style: 'ghost' },
    { id: 'stop', label: '停止', icon: ICONS.stop, style: 'danger-ghost' },
  );

  els.nowActions.innerHTML = '';
  for (const action of actions) {
    const button = document.createElement('button');
    button.className = `btn sm ${action.style}`;
    button.dataset.nowAction = action.id;
    button.innerHTML = action.icon + '<span></span>';
    button.querySelector('span').textContent = action.label;
    els.nowActions.appendChild(button);
  }
}

function allTags() {
  const counts = new Map();
  for (const item of state ? state.wallpapers : []) {
    for (const tag of item.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
    .slice(0, 7);
}

function renderChips() {
  if (!state) return;
  const tags = allTags();
  if (activeTag !== '__all__' && !tags.some(([tag]) => tag === activeTag)) activeTag = '__all__';

  els.tagChips.innerHTML = '';
  const all = document.createElement('button');
  all.className = 'chip' + (activeTag === '__all__' ? ' active' : '');
  all.dataset.tag = '__all__';
  all.innerHTML = `全部<span class="n">${state.wallpapers.length}</span>`;
  els.tagChips.appendChild(all);

  for (const [tag, count] of tags) {
    const chip = document.createElement('button');
    chip.className = 'chip' + (activeTag === tag ? ' active' : '');
    chip.dataset.tag = tag;
    chip.innerHTML = '';
    chip.appendChild(document.createTextNode(tag));
    const countEl = document.createElement('span');
    countEl.className = 'n';
    countEl.textContent = String(count);
    chip.appendChild(countEl);
    els.tagChips.appendChild(chip);
  }

  els.tagChips.onclick = (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    activeTag = chip.dataset.tag;
    renderChips();
    renderGrid();
  };
}

function filteredWallpapers() {
  if (!state) return [];
  const needle = query.toLowerCase();
  return state.wallpapers.filter((item) => {
    if (activeTag !== '__all__' && !(item.tags || []).includes(activeTag)) return false;
    if (!needle) return true;
    const haystack = [item.title, item.subtitle, item.description, ...(item.tags || [])]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function renderGrid() {
  if (!state) return;
  const items = filteredWallpapers();
  els.grid.innerHTML = '';
  els.emptyOpenFolder.hidden = false;

  for (let index = 0; index < items.length; index += 1) {
    els.grid.appendChild(createCard(items[index], index));
  }

  const hasWallpapers = state.wallpapers.length > 0;
  const isFiltering = Boolean(query) || activeTag !== '__all__';

  if (items.length > 0) {
    els.grid.hidden = false;
    els.empty.hidden = true;
    return;
  }

  els.grid.hidden = true;
  els.empty.hidden = false;

  if (!hasWallpapers) {
    emptyMode = 'folder';
    els.emptyTitle.textContent = '还没有壁纸';
    els.emptyText.textContent =
      '把包含 wallpaper.html 与 preview.png 的文件夹放进壁纸目录，列表会自动出现。';
    els.emptyOpenFolder.textContent = '打开壁纸目录';
    return;
  }

  emptyMode = isFiltering ? 'filter' : 'folder';
  els.emptyTitle.textContent = isFiltering ? '没有找到匹配的壁纸' : '壁纸都被隐藏了';
  els.emptyText.textContent = isFiltering
    ? '换一个关键词，或点击下面的按钮清除筛选。'
    : '打开壁纸目录，确认文件夹里有 wallpaper.html 与 preview.png。';
  els.emptyOpenFolder.textContent = isFiltering ? '清除筛选' : '打开壁纸目录';
}

function createCard(item, index) {
  const isApplied = item.id === state.currentId;
  const isBusy = item.id === busyId;
  const card = document.createElement('article');
  card.className = 'card' + (isApplied ? ' applied' : '');
  card.dataset.id = item.id;
  card.style.setProperty('--accent', item.accent || '#e8d2a2');
  card.style.animationDelay = Math.min(index * 45, 360) + 'ms';
  card.title = item.description || item.title;

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  if (item.previewUrl) {
    const image = document.createElement('img');
    image.src = item.previewUrl;
    image.alt = item.title + ' 预览';
    image.loading = 'lazy';
    image.draggable = false;
    image.addEventListener('error', () => {
      image.remove();
      thumb.classList.add('placeholder');
    });
    thumb.appendChild(image);
  } else {
    thumb.classList.add('placeholder');
  }

  if (isApplied || isBusy) {
    const badge = document.createElement('span');
    badge.className = 'badge' + (isBusy ? ' busy' : '');
    badge.innerHTML = '<i></i>' + (isBusy ? '应用中' : '使用中');
    thumb.appendChild(badge);
  }

  if (item.tags && item.tags.length) {
    const tags = document.createElement('div');
    tags.className = 'tags';
    for (const tag of item.tags.slice(0, 3)) {
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = tag;
      tags.appendChild(tagEl);
    }
    thumb.appendChild(tags);
  }

  const playOrb = document.createElement('button');
  playOrb.className = 'play-orb';
  playOrb.dataset.action = 'play';
  playOrb.setAttribute('aria-label', '播放 ' + item.title);
  playOrb.innerHTML = '<svg viewBox="0 0 20 20"><path d="M7.2 5.6v8.8l7.4-4.4z"/></svg>';
  thumb.appendChild(playOrb);

  const body = document.createElement('div');
  body.className = 'card-body';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'card-title';
  const title = document.createElement('h3');
  title.textContent = item.title;
  const subtitle = document.createElement('p');
  subtitle.textContent = item.subtitle || 'Single-file HTML';
  titleWrap.append(title, subtitle);

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const playButton = document.createElement('button');
  playButton.className = 'btn ghost sm';
  playButton.dataset.action = 'play';
  playButton.innerHTML = ICONS.play + '<span>播放</span>';

  const applyButton = document.createElement('button');
  if (isBusy) {
    applyButton.className = 'btn gold sm';
    applyButton.disabled = true;
    applyButton.innerHTML = '<span>应用中…</span>';
  } else if (isApplied) {
    applyButton.className = 'btn ghost sm';
    applyButton.disabled = true;
    applyButton.innerHTML = ICONS.check + '<span>使用中</span>';
  } else {
    applyButton.className = 'btn gold sm';
    applyButton.dataset.action = 'apply';
    applyButton.innerHTML = ICONS.monitor + '<span>应用</span>';
  }

  actions.append(playButton, applyButton);
  body.append(titleWrap, actions);
  card.append(thumb, body);
  return card;
}

function reportProblems() {
  if (!state || !state.problems || state.problems.length === 0) {
    lastProblemsSignature = '';
    return;
  }
  const signature = state.problems.map((problem) => problem.id + ':' + problem.reason).join('|');
  if (signature === lastProblemsSignature) return;
  lastProblemsSignature = signature;
  const count = state.problems.length;
  toast(`${count} 个壁纸文件夹不完整，已跳过。`, {
    type: 'error',
    duration: 6500,
    action: {
      label: '查看目录',
      onClick: () => openWallpapersFolder(),
    },
  });
}

function toast(message, typeOrOptions, maybeOptions) {
  let options = {};
  let type = 'ok';
  if (typeof typeOrOptions === 'string') {
    type = typeOrOptions;
    options = maybeOptions || {};
  } else if (typeOrOptions && typeof typeOrOptions === 'object') {
    options = typeOrOptions;
    if (options.type) type = options.type;
  }

  const element = document.createElement('div');
  element.className = 'toast' + (type === 'error' ? ' error' : '');
  const dot = document.createElement('span');
  dot.className = 'dot';
  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = message;
  element.append(dot, text);

  if (options.action) {
    const action = document.createElement('button');
    action.className = 'toast-action';
    action.textContent = options.action.label;
    action.addEventListener('click', () => {
      try {
        options.action.onClick();
      } finally {
        dismiss();
      }
    });
    element.appendChild(action);
  }

  const id = ++toastCounter;
  element.dataset.toastId = String(id);
  els.toasts.appendChild(element);

  while (els.toasts.children.length > 4) {
    els.toasts.firstElementChild.remove();
  }

  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    element.classList.add('out');
    setTimeout(() => element.remove(), 320);
  }

  setTimeout(dismiss, options.duration || 3800);
  return dismiss;
}

init();
