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
  sourceLocalBtn: document.getElementById('sourceLocalBtn'),
  sourceOnlineBtn: document.getElementById('sourceOnlineBtn'),
  localCount: document.getElementById('localCount'),
  onlineCount: document.getElementById('onlineCount'),
  sourceStatus: document.getElementById('sourceStatus'),
  sourceStatusText: document.getElementById('sourceStatusText'),
  onlineSiteBtn: document.getElementById('onlineSiteBtn'),
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
  versionLabel: document.getElementById('versionLabel'),
  updateBtn: document.getElementById('updateBtn'),
  updateDot: document.getElementById('updateDot'),
  updateBtnLabel: document.getElementById('updateBtnLabel'),
  updateModal: document.getElementById('updateModal'),
  updateClose: document.getElementById('updateClose'),
  updateTitle: document.getElementById('updateTitle'),
  updateMeta: document.getElementById('updateMeta'),
  releaseNotes: document.getElementById('releaseNotes'),
  updateProgress: document.getElementById('updateProgress'),
  updateBar: document.getElementById('updateBar'),
  updateProgressLabel: document.getElementById('updateProgressLabel'),
  updateStatus: document.getElementById('updateStatus'),
  autoCheckUpdates: document.getElementById('autoCheckUpdates'),
  updateReleaseLink: document.getElementById('updateReleaseLink'),
  updateLater: document.getElementById('updateLater'),
  updatePrimary: document.getElementById('updatePrimary'),
  deleteModal: document.getElementById('deleteModal'),
  deleteClose: document.getElementById('deleteClose'),
  deleteCancel: document.getElementById('deleteCancel'),
  deleteConfirm: document.getElementById('deleteConfirm'),
  deleteTitleName: document.getElementById('deleteTitleName'),
  deleteFolderName: document.getElementById('deleteFolderName'),
  deleteNote: document.getElementById('deleteNote'),
  onlineModal: document.getElementById('onlineModal'),
  onlinePreviewTitle: document.getElementById('onlinePreviewTitle'),
  onlinePreviewSubtitle: document.getElementById('onlinePreviewSubtitle'),
  onlinePreviewFrame: document.getElementById('onlinePreviewFrame'),
  onlinePreviewImage: document.getElementById('onlinePreviewImage'),
  onlinePreviewLoading: document.getElementById('onlinePreviewLoading'),
  onlinePreviewDesc: document.getElementById('onlinePreviewDesc'),
  onlinePreviewMeta: document.getElementById('onlinePreviewMeta'),
  onlinePreviewClose: document.getElementById('onlinePreviewClose'),
  onlinePreviewDismiss: document.getElementById('onlinePreviewDismiss'),
  onlinePreviewSite: document.getElementById('onlinePreviewSite'),
  onlinePreviewAction: document.getElementById('onlinePreviewAction'),
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
  trash:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 5.6h13M8 5.6V3.9h4v1.7M5.4 5.6l.7 10.1h7.8l.7-10.1M8.4 8.5v4.4M11.6 8.5v4.4"/></svg>',
  eye:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.6 10s2.7-4.4 7.4-4.4 7.4 4.4 7.4 4.4-2.7 4.4-7.4 4.4S2.6 10 2.6 10Z"/><circle cx="10" cy="10" r="2"/></svg>',
  download:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v10M6 9l4 4 4-4M4 16.5h12"/></svg>',
  cloud:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.3 14.6h8a3.4 3.4 0 0 0 .3-6.8A4.8 4.8 0 0 0 5.4 9a3 3 0 0 0 .9 5.6Z"/><path d="M10 12.8V16M7.8 14.2 10 16l2.2-1.8"/></svg>',
};

let state = null;
let activeTag = '__all__';
let query = '';
let busyId = null;
let emptyMode = 'folder';
let lastProblemsSignature = '';
let toastCounter = 0;
let updateState = null;
let updateModalOpen = false;
let manualUpdateCheck = false;
let announcedUpdateVersion = '';
let deleteTargetId = null;
let deletingId = null;
let sourceMode = 'local';
let online = {
  status: 'idle', // idle | loading | ready | error
  items: [],
  updatedAt: '',
  fetchedAt: 0,
  siteUrl: '',
  cached: false,
  stale: false,
  error: '',
};
let downloadingOnlineId = null;
let onlinePreviewId = null;

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
      api.onUpdate(applyUpdateState);
      api
        .getUpdateState()
        .then(applyUpdateState)
        .catch(() => {});
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
  els.refreshBtn.addEventListener('click', () => refreshActiveSource());

  els.sourceLocalBtn.addEventListener('click', () => switchSource('local'));
  els.sourceOnlineBtn.addEventListener('click', () => switchSource('online'));
  els.onlineSiteBtn.addEventListener('click', () => {
    if (online.siteUrl) api.openExternal(online.siteUrl);
  });

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

  els.onlinePreviewClose.addEventListener('click', () => closeOnlinePreview());
  els.onlinePreviewDismiss.addEventListener('click', () => closeOnlinePreview());
  els.onlineModal.addEventListener('click', (event) => {
    if (event.target === els.onlineModal) closeOnlinePreview();
  });
  els.onlinePreviewSite.addEventListener('click', () => {
    const item = online.items.find((entry) => entry.id === onlinePreviewId);
    const target = item ? item.pageUrl : online.siteUrl;
    if (target) api.openExternal(target);
  });
  els.onlinePreviewAction.addEventListener('click', () => {
    if (!onlinePreviewId) return;
    const item = online.items.find((entry) => entry.id === onlinePreviewId);
    if (!item) return;
    const localItem = localItemForOnline(item);
    if (localItem) {
      closeOnlinePreview();
      applyWallpaper(localItem.id);
      return;
    }
    downloadOnlineWallpaper(item);
  });
  els.onlinePreviewImage.addEventListener('load', () => {
    els.onlinePreviewFrame.classList.add('ready');
  });
  els.onlinePreviewImage.addEventListener('error', () => {
    els.onlinePreviewLoading.textContent = '原图加载失败，请检查网络。';
  });

  els.updateBtn.addEventListener('click', () => {
    if (updateState && updateState.status === 'downloaded') {
      openUpdateModal();
      return;
    }
    openUpdateModal();
    if (!updateState || ['idle', 'error', 'up-to-date', 'no-release'].includes(updateState.status)) {
      checkForUpdates();
    }
  });
  els.updateClose.addEventListener('click', () => closeUpdateModal());
  els.updateLater.addEventListener('click', () => closeUpdateModal());
  els.updateModal.addEventListener('click', (event) => {
    if (event.target === els.updateModal) closeUpdateModal();
  });
  els.updatePrimary.addEventListener('click', handleUpdatePrimary);
  els.updateReleaseLink.addEventListener('click', () => openReleasePage());
  els.autoCheckUpdates.addEventListener('change', async () => {
    try {
      const result = await api.setAutoCheckUpdates(els.autoCheckUpdates.checked);
      if (result && result.state) applyUpdateState(result.state);
      toast(els.autoCheckUpdates.checked ? '已开启启动时自动检查更新。' : '已关闭启动时自动检查更新。');
    } catch (error) {
      toast('保存更新设置失败：' + error.message, 'error');
    }
  });
  els.releaseNotes.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-external]');
    if (!link) return;
    event.preventDefault();
    api.openExternal(link.getAttribute('href'));
  });

  els.deleteClose.addEventListener('click', () => closeDeleteModal());
  els.deleteCancel.addEventListener('click', () => closeDeleteModal());
  els.deleteModal.addEventListener('click', (event) => {
    if (event.target === els.deleteModal) closeDeleteModal();
  });
  els.deleteConfirm.addEventListener('click', confirmDelete);

  els.emptyOpenFolder.addEventListener('click', () => {
    if (emptyMode === 'filter' || emptyMode === 'online-filter') {
      query = '';
      activeTag = '__all__';
      els.searchInput.value = '';
      renderActiveList();
      els.searchInput.focus();
      return;
    }
    if (emptyMode === 'online-retry') {
      loadOnlineCatalog(true);
      return;
    }
    if (emptyMode === 'online-empty') {
      refreshActiveSource();
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

    if (card.dataset.mode === 'online') {
      const item = online.items.find((entry) => entry.id === id);
      if (!item) return;
      const localItem = localItemForOnline(item);
      if (action === 'view') openOnlinePreview(id);
      if (action === 'download') downloadOnlineWallpaper(item);
      if (action === 'play' && localItem) openPreview(localItem.id);
      if (action === 'apply' && localItem) applyWallpaper(localItem.id);
      return;
    }

    if (action === 'play') openPreview(id);
    if (action === 'apply') applyWallpaper(id);
    if (action === 'delete' && !deletingId) askDeleteWallpaper(id);
  });

  els.grid.addEventListener('dblclick', (event) => {
    if (event.target.closest('.card-delete')) return;
    const thumb = event.target.closest('.thumb');
    if (!thumb) return;
    const card = thumb.closest('.card');
    if (!card) return;
    if (card.dataset.mode === 'online') {
      openOnlinePreview(card.dataset.id);
      return;
    }
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
    renderActiveList();
  });

  els.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      els.searchInput.value = '';
      query = '';
      renderActiveList();
      els.searchInput.blur();
    }
  });
}

function bindKeyboard() {
  window.addEventListener('keydown', (event) => {
    const modalOpen =
      !els.addModal.hidden ||
      !els.updateModal.hidden ||
      !els.deleteModal.hidden ||
      !els.onlineModal.hidden;
    const command = event.metaKey || event.ctrlKey;
    if (command && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      els.searchInput.focus();
      els.searchInput.select();
      return;
    }
    if (!command && event.key === '/' && !modalOpen) {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      event.preventDefault();
      els.searchInput.focus();
      return;
    }
    if (event.key === 'Escape') {
      if (!els.onlineModal.hidden) {
        closeOnlinePreview();
        return;
      }
      if (!els.deleteModal.hidden) {
        closeDeleteModal();
        return;
      }
      if (!els.updateModal.hidden) {
        closeUpdateModal();
        return;
      }
      if (!els.addModal.hidden) {
        closeAddModal();
        return;
      }
    }
  });
}

function syncModalOpen() {
  const open =
    !els.addModal.hidden ||
    !els.updateModal.hidden ||
    !els.deleteModal.hidden ||
    !els.onlineModal.hidden;
  document.body.classList.toggle('modal-open', open);
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

async function refreshActiveSource() {
  if (sourceMode === 'online') {
    await loadOnlineCatalog(true);
    return;
  }
  await refreshWallpapers();
}

function switchSource(mode) {
  if (mode !== 'local' && mode !== 'online') return;
  if (sourceMode === mode) {
    if (mode === 'online' && (online.status === 'idle' || online.status === 'error')) {
      loadOnlineCatalog(online.status === 'error');
    }
    return;
  }
  sourceMode = mode;
  activeTag = '__all__';
  query = '';
  els.searchInput.value = '';
  renderSourceControls();
  renderActiveList();
  if (sourceMode === 'online' && online.status === 'idle') loadOnlineCatalog(false);
}

async function loadOnlineCatalog(force = false) {
  if (online.status === 'loading') return;
  online.status = 'loading';
  online.error = '';
  renderSourceControls();
  if (sourceMode === 'online') renderOnlineGrid();

  els.refreshBtn.classList.add('busy');
  els.refreshBtn.disabled = true;
  try {
    const result = await api.getOnlineCatalog(force);
    if (!result || result.ok === false) {
      if (result && result.siteUrl) online.siteUrl = result.siteUrl;
      throw new Error((result && result.error) || '无法读取在线壁纸目录。');
    }
    online.items = Array.isArray(result.items) ? result.items : [];
    online.updatedAt = result.updatedAt || '';
    online.fetchedAt = result.fetchedAt || Date.now();
    online.siteUrl = result.siteUrl || '';
    online.cached = Boolean(result.cached);
    online.stale = Boolean(result.stale);
    online.error = result.warning || '';
    online.status = 'ready';
    if (sourceMode === 'online') renderOnlineChips();
    if (online.error) {
      toast('在线壁纸目录刷新失败，正在显示上次的结果。', 'error');
    } else if (force) {
      toast(`在线壁纸馆已更新，共 ${online.items.length} 幅作品。`);
    }
  } catch (error) {
    online.status = 'error';
    online.error = error.message || String(error);
    if (sourceMode === 'online') {
      renderOnlineGrid();
    }
    toast('在线壁纸馆连接失败：' + online.error, { type: 'error', duration: 8000 });
  } finally {
    els.refreshBtn.classList.remove('busy');
    els.refreshBtn.disabled = false;
    renderSourceControls();
    renderCountLabel();
    if (sourceMode === 'online') renderOnlineGrid();
  }
}

function openAddModal() {
  if (!state) return;
  els.pathLine.textContent = state.wallpapersDir || '';
  els.addModal.hidden = false;
  syncModalOpen();
  requestAnimationFrame(() => {
    const first = els.addModal.querySelector('.btn.gold');
    if (first) first.focus();
  });
}

function closeAddModal() {
  els.addModal.hidden = true;
  syncModalOpen();
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
  renderActiveList();

  try {
    const result = await api.apply(id);
    busyId = null;
    if (result && result.state) render(result.state);
    else renderActiveList();

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
    renderActiveList();
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

/* ---------- update center ---------- */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInlineMarkdown(value) {
  let text = String(value);
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" data-external target="_blank" rel="noreferrer">$1</a>',
  );
  text = text.replace(
    /(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    '$1<a href="$2" data-external target="_blank" rel="noreferrer">$2</a>',
  );
  return text;
}

function renderMarkdown(markdown) {
  const source = String(markdown || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!source) return '';

  const lines = escapeHtml(source).split('\n');
  const html = [];
  let listType = '';
  let inCode = false;
  let codeLines = [];

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = '';
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (/^```/.test(line)) {
      if (inCode) {
        html.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(raw);
      continue;
    }
    if (!line.trim()) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 4);
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (/^([-*_])\1{2,}\s*$/.test(line)) {
      closeList();
      html.push('<hr>');
      continue;
    }
    const unordered = line.match(/^\s*[-*+]\s+(.*)$/);
    if (unordered) {
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        html.push('<ul>');
      }
      const item = unordered[1]
        .replace(/^\[x\]\s*/i, '☑ ')
        .replace(/^\[ \]\s*/, '☐ ');
      html.push(`<li>${renderInlineMarkdown(item)}</li>`);
      continue;
    }
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ordered) {
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        html.push('<ol>');
      }
      html.push(`<li>${renderInlineMarkdown(ordered[1])}</li>`);
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      closeList();
      html.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    closeList();
    html.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  if (inCode) html.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
  closeList();
  return html.join('');
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function updateFooter() {
  if (!els.updateBtn) return;
  const status = updateState ? updateState.status : 'idle';
  const percent = updateState && updateState.progress ? updateState.progress.percent : 0;
  let label = '检查更新';
  if (status === 'checking') label = '检查中…';
  else if (status === 'available') {
    label = updateState.latestVersion ? `新版本 v${updateState.latestVersion}` : '发现新版本';
  } else if (status === 'downloading') {
    label = `下载 ${Math.round(percent)}%`;
  } else if (status === 'downloaded') {
    label = '重启更新';
  } else if (status === 'installing') {
    label = '正在安装…';
  } else if (status === 'error') {
    label = '更新检查失败';
  }
  els.updateBtn.dataset.status = status;
  els.updateBtnLabel.textContent = label;
  const currentVersion =
    (updateState && updateState.currentVersion) || (state && state.version) || '';
  els.updateBtn.title =
    updateState && updateState.error
      ? updateState.error
      : `检查更新${currentVersion ? ' · 当前 v' + currentVersion : ''}`;
}

function applyUpdateState(next) {
  if (!next) return;
  const previous = updateState;
  updateState = next;
  updateFooter();
  if (updateModalOpen) renderUpdateModal();
  if (!previous) return;

  const changed =
    previous.status !== next.status || previous.latestVersion !== next.latestVersion;
  if (!changed) return;

  if (next.status === 'available' && next.latestVersion) {
    const manual = manualUpdateCheck;
    manualUpdateCheck = false;
    if (manual) {
      openUpdateModal();
    } else if (announcedUpdateVersion !== next.latestVersion) {
      announcedUpdateVersion = next.latestVersion;
      toast(`发现新版本 v${next.latestVersion}，正在后台自动下载。`, {
        duration: 8000,
        action: {
          label: '查看更新',
          onClick: () => openUpdateModal(),
        },
      });
    }
  } else if (next.status === 'downloaded' && next.latestVersion) {
    announcedUpdateVersion = next.latestVersion;
    toast(`新版本 v${next.latestVersion} 已下载完成，重启后自动完成覆盖安装。`, {
      duration: 12000,
      action: {
        label: '立即重启',
        onClick: () => installUpdate(),
      },
    });
  } else if (next.status === 'error') {
    if (manualUpdateCheck) {
      manualUpdateCheck = false;
      openUpdateModal();
    } else if (previous.status === 'available' || previous.status === 'downloading') {
      toast('更新下载失败：' + (next.error || '请稍后重试。'), 'error', {
        duration: 10000,
        action: {
          label: '查看',
          onClick: () => openUpdateModal(),
        },
      });
    }
  } else if (next.status === 'up-to-date' || next.status === 'no-release') {
    if (manualUpdateCheck) {
      manualUpdateCheck = false;
      openUpdateModal();
    }
  }
}

function openUpdateModal() {
  els.updateModal.hidden = false;
  updateModalOpen = true;
  syncModalOpen();
  renderUpdateModal();
  requestAnimationFrame(() => {
    if (!els.updatePrimary.disabled) els.updatePrimary.focus();
    else els.updateLater.focus();
  });
}

function closeUpdateModal() {
  els.updateModal.hidden = true;
  updateModalOpen = false;
  syncModalOpen();
  if (els.updateBtn) els.updateBtn.focus();
}

function renderUpdateModal() {
  const fallbackVersion = (state && state.version) || '';
  const info = updateState || {
    currentVersion: fallbackVersion,
    status: 'idle',
    supported: false,
    autoCheck: true,
    releaseNotes: '',
    releaseUrl: '',
    latestVersion: '',
    progress: null,
    error: '',
    supportMessage: '',
  };
  const status = info.status || 'idle';
  const progress = info.progress || null;
  const percent = progress ? Math.max(0, Math.min(100, Number(progress.percent) || 0)) : 0;

  let title = '检查更新';
  let meta = `当前版本 v${info.currentVersion || fallbackVersion}`;
  let statusText = '';
  let notesHtml = '';
  let showProgress = false;
  let primaryLabel = '检查更新';
  let primaryDisabled = false;
  let primaryAction = 'check';
  let statusIsError = false;

  if (info.latestVersion && info.latestVersion !== info.currentVersion) {
    meta += ` · 最新版本 v${info.latestVersion}`;
  }
  if (info.releaseDate) meta += ` · 发布于 ${formatDate(info.releaseDate)}`;

  const noNotes = '<p class="muted">本次更新没有附带更新日志。</p>';

  switch (status) {
    case 'checking':
      title = '正在检查更新…';
      statusText = '正在连接 GitHub Releases 获取版本信息。';
      notesHtml = '<p class="muted">请稍候…</p>';
      primaryLabel = '正在检查…';
      primaryDisabled = true;
      break;

    case 'available':
      title = `发现新版本 v${info.latestVersion}`;
      notesHtml = info.releaseNotes ? renderMarkdown(info.releaseNotes) : noNotes;
      showProgress = Boolean(info.supported);
      if (info.supported) {
        statusText = progress && progress.total
          ? `正在后台下载：${formatBytes(progress.transferred)} / ${formatBytes(progress.total)}`
          : '正在后台自动下载，完成后即可重启安装。';
        primaryLabel = '准备下载…';
        primaryDisabled = true;
      } else {
        statusText = info.supportMessage || '请前往 GitHub 下载最新安装包。';
        primaryLabel = '下载安装版';
        primaryAction = 'release';
      }
      break;

    case 'downloading':
      title = `正在下载 v${info.latestVersion}`;
      notesHtml = info.releaseNotes ? renderMarkdown(info.releaseNotes) : noNotes;
      showProgress = true;
      statusText = progress && progress.total
        ? `已下载 ${formatBytes(progress.transferred)} / ${formatBytes(progress.total)}`
        : '正在下载更新包…';
      if (progress && progress.bytesPerSecond) {
        statusText += ` · ${formatBytes(progress.bytesPerSecond)}/s`;
      }
      primaryLabel = `正在下载 ${Math.round(percent)}%`;
      primaryDisabled = true;
      break;

    case 'downloaded':
      title = `v${info.latestVersion} 已准备好`;
      notesHtml = info.releaseNotes ? renderMarkdown(info.releaseNotes) : noNotes;
      showProgress = true;
      statusText = '重启应用后会静默覆盖安装，并自动重新打开壁纸库。';
      primaryLabel = '重启并安装';
      primaryAction = 'install';
      break;

    case 'installing':
      title = '正在重启并安装…';
      statusText = '安装完成后应用会自动重新启动。';
      showProgress = true;
      primaryLabel = '正在重启…';
      primaryDisabled = true;
      break;

    case 'up-to-date':
      title = '已是最新版本';
      statusText = `当前 v${info.currentVersion} 已是最新版本。`;
      notesHtml = '<p class="muted">暂时没有新的更新说明。</p>';
      primaryLabel = '重新检查';
      break;

    case 'no-release':
      title = '还没有可用的发布版本';
      statusText = 'GitHub 上还没有发布 Release，稍后再来看看。';
      notesHtml = '<p class="muted">发布第一个版本后，这里会显示更新说明。</p>';
      primaryLabel = '打开 GitHub';
      primaryAction = 'release';
      break;

    case 'error':
      title = '检查更新失败';
      statusText = info.error || '无法获取更新信息，请稍后重试。';
      statusIsError = true;
      primaryLabel = '重试';
      break;

    default:
      statusText = info.supportMessage || '从 GitHub Releases 获取最新版本与更新日志。';
      notesHtml = '<p class="muted">点击「检查更新」查看新版本内容。</p>';
      if (!info.supported && info.supportMessage) {
        primaryLabel = '在 GitHub 查看';
        primaryAction = 'release';
      }
      break;
  }

  els.updateTitle.textContent = title;
  els.updateMeta.textContent = meta;
  els.updateStatus.textContent = statusText;
  els.updateStatus.classList.toggle('error', statusIsError);
  els.releaseNotes.innerHTML = notesHtml;
  els.releaseNotes.hidden = !notesHtml;
  els.updateProgress.hidden = !showProgress;
  if (showProgress) {
    els.updateBar.style.width = percent + '%';
    els.updateProgressLabel.textContent = Math.round(percent) + '%';
  }
  els.updatePrimary.textContent = primaryLabel;
  els.updatePrimary.disabled = primaryDisabled;
  els.updatePrimary.dataset.action = primaryAction;
  els.updateReleaseLink.hidden = !info.releaseUrl;
  els.autoCheckUpdates.checked = info.autoCheck !== false;
}

async function checkForUpdates() {
  if (!api) return;
  manualUpdateCheck = true;
  updateState = {
    ...(updateState || {
      currentVersion: (state && state.version) || '',
      supported: false,
      autoCheck: true,
      latestVersion: '',
      releaseNotes: '',
      releaseUrl: '',
      progress: null,
      error: '',
    }),
    status: 'checking',
    error: '',
  };
  updateFooter();
  if (updateModalOpen) renderUpdateModal();
  try {
    const next = await api.checkForUpdates();
    if (next) {
      applyUpdateState(next);
    } else {
      manualUpdateCheck = false;
      toast('更新器尚未就绪。', 'error');
    }
  } catch (error) {
    manualUpdateCheck = false;
    updateState = {
      ...updateState,
      status: 'error',
      error: '检查更新失败：' + error.message,
      progress: null,
    };
    updateFooter();
    if (updateModalOpen) renderUpdateModal();
    toast('检查更新失败：' + error.message, 'error');
  }
}

async function installUpdate() {
  if (!updateState || updateState.status !== 'downloaded') return;
  try {
    const result = await api.installUpdate();
    if (!result || result.ok !== true) {
      toast((result && result.error) || '无法启动安装程序。', 'error');
      return;
    }
    closeUpdateModal();
    toast('正在重启并安装更新，请稍候…', { duration: 6000 });
  } catch (error) {
    toast('无法启动更新安装：' + error.message, 'error');
  }
}

function openReleasePage() {
  const url = updateState && updateState.releaseUrl;
  api.openReleasePage(url).then((result) => {
    if (result && result.ok === false && result.error) {
      toast('无法打开 Release 页面：' + result.error, 'error');
    }
  });
}

function handleUpdatePrimary() {
  const action = els.updatePrimary.dataset.action || 'check';
  if (action === 'install') {
    installUpdate();
    return;
  }
  if (action === 'release') {
    openReleasePage();
    return;
  }
  checkForUpdates();
}

/* ---------- delete wallpaper ---------- */

function askDeleteWallpaper(id) {
  if (!state) return;
  const item = state.wallpapers.find((entry) => entry.id === id);
  if (!item) {
    toast('没有找到这幅壁纸，可能已经被删除。', 'error');
    return;
  }
  deleteTargetId = id;
  els.deleteTitleName.textContent = `《${item.title}》`;
  els.deleteFolderName.textContent = item.id;
  els.deleteNote.hidden = state.currentId !== id;
  els.deleteModal.hidden = false;
  syncModalOpen();
  requestAnimationFrame(() => els.deleteCancel.focus());
}

function closeDeleteModal() {
  els.deleteModal.hidden = true;
  deleteTargetId = null;
  syncModalOpen();
}

async function confirmDelete() {
  const id = deleteTargetId;
  if (!id || !state || deletingId) return;
  const item = state.wallpapers.find((entry) => entry.id === id);
  const title = item ? item.title : '壁纸';
  closeDeleteModal();
  deletingId = id;
  renderActiveList();

  try {
    const result = await api.remove(id);
    deletingId = null;
    if (result && result.state) render(result.state);
    else renderActiveList();
    if (result && result.ok) {
      toast(`已删除《${title}》，壁纸文件夹已移到系统回收站。`, { duration: 7000 });
    } else {
      toast((result && result.error) || '删除失败。', 'error', { duration: 9000 });
    }
  } catch (error) {
    deletingId = null;
    renderActiveList();
    toast('删除失败：' + error.message, 'error');
  }
}

function render(nextState) {
  if (!nextState) return;
  state = nextState;
  document.title = state.currentId
    ? (state.wallpapers.find((item) => item.id === state.currentId) || {}).title + ' · 流光壁纸'
    : '流光壁纸 · Lumen';

  els.pathLine.textContent = state.wallpapersDir || '';
  els.platformLabel.textContent = platformName(state.platform);
  if (state.version && els.versionLabel) {
    els.versionLabel.textContent = 'v' + state.version;
  }

  renderNow();
  renderSourceControls();
  renderCountLabel();
  renderActiveList();
  if (!els.onlineModal.hidden && onlinePreviewId) renderOnlinePreview();
  reportProblems();
}

function renderCountLabel() {
  const localCount = state ? state.wallpapers.length : 0;
  let label = `${localCount} 幅动态壁纸`;
  if (online.status === 'ready') label += ` · ${online.items.length} 幅在线`;
  els.countLabel.textContent = label;
}

function renderSourceControls() {
  if (!state) return;
  const onlineMode = sourceMode === 'online';

  els.sourceLocalBtn.classList.toggle('active', !onlineMode);
  els.sourceOnlineBtn.classList.toggle('active', onlineMode);
  els.sourceLocalBtn.setAttribute('aria-pressed', String(!onlineMode));
  els.sourceOnlineBtn.setAttribute('aria-pressed', String(onlineMode));

  els.localCount.textContent = String(state.wallpapers.length);
  if (online.status === 'ready') els.onlineCount.textContent = String(online.items.length);
  else if (online.status === 'loading') els.onlineCount.textContent = '…';
  else els.onlineCount.textContent = '—';

  els.openFolderBtn.hidden = onlineMode;
  els.addBtn.hidden = onlineMode;
  els.refreshBtn.title = onlineMode ? '刷新在线壁纸目录' : '重新扫描壁纸目录';
  els.refreshBtn.setAttribute('aria-label', onlineMode ? '刷新在线壁纸目录' : '重新扫描壁纸目录');
  els.searchInput.placeholder = onlineMode ? '搜索在线壁纸或标签' : '搜索壁纸或标签';
  els.onlineSiteBtn.hidden = !online.siteUrl;

  let statusClass = 'source-status';
  let statusText = '全部保存在本机 · 无需网络';
  if (onlineMode) {
    if (online.status === 'loading') {
      statusClass += ' is-loading';
      statusText = '正在读取在线壁纸馆…';
    } else if (online.status === 'ready') {
      statusClass += online.stale ? ' is-error' : ' is-online';
      const date = online.updatedAt ? formatDate(online.updatedAt) : '';
      statusText = online.stale
        ? `网络异常 · 显示缓存目录 · ${online.items.length} 幅`
        : `在线目录已同步 · ${online.items.length} 幅${date ? ' · ' + date : ''}`;
    } else if (online.status === 'error') {
      statusClass += ' is-error';
      statusText = '无法连接壁纸馆 · 点击右上角刷新重试';
    } else {
      statusText = '来自 GitHub Pages · 按需连接';
    }
  }
  els.sourceStatus.className = statusClass;
  els.sourceStatusText.textContent = statusText;
}

function renderActiveList() {
  if (!state) return;
  if (sourceMode === 'online') {
    renderOnlineChips();
    renderOnlineGrid();
  } else {
    renderChips();
    renderGrid();
  }
}

function showListEmpty(mode, title, text, actionLabel, { hideAction = false } = {}) {
  emptyMode = mode;
  els.grid.hidden = true;
  els.empty.hidden = false;
  els.emptyTitle.textContent = title;
  els.emptyText.textContent = text;
  els.emptyOpenFolder.textContent = actionLabel;
  els.emptyOpenFolder.hidden = hideAction;
}

function onlineTags() {
  const counts = new Map();
  for (const item of online.items) {
    const tags = new Set([...(item.tags || []), item.category].filter(Boolean));
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
    .slice(0, 7);
}

function renderOnlineChips() {
  if (!state) return;
  if (online.status !== 'ready' && online.items.length === 0) {
    els.tagChips.innerHTML = '';
    return;
  }
  const tags = onlineTags();
  if (activeTag !== '__all__' && !tags.some(([tag]) => tag === activeTag)) activeTag = '__all__';

  els.tagChips.innerHTML = '';
  const all = document.createElement('button');
  all.className = 'chip' + (activeTag === '__all__' ? ' active' : '');
  all.dataset.tag = '__all__';
  all.innerHTML = `全部<span class="n">${online.items.length}</span>`;
  els.tagChips.appendChild(all);

  for (const [tag, count] of tags) {
    const chip = document.createElement('button');
    chip.className = 'chip' + (activeTag === tag ? ' active' : '');
    chip.dataset.tag = tag;
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
    renderOnlineChips();
    renderOnlineGrid();
  };
}

function filteredOnlineWallpapers() {
  const needle = query.toLowerCase();
  return online.items.filter((item) => {
    const tags = [...(item.tags || []), item.category].filter(Boolean);
    if (activeTag !== '__all__' && !tags.includes(activeTag)) return false;
    if (!needle) return true;
    const haystack = [item.title, item.subtitle, item.description, item.author, ...tags]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function renderOnlineGrid() {
  if (!state) return;
  els.grid.innerHTML = '';
  els.emptyOpenFolder.hidden = false;

  if ((online.status === 'loading' || online.status === 'idle') && online.items.length === 0) {
    showListEmpty(
      'online-loading',
      '正在连接壁纸馆…',
      '从 GitHub Pages 读取最新作品。首次加载可能需要几秒钟。',
      '',
      { hideAction: true },
    );
    return;
  }

  if (online.status === 'error') {
    showListEmpty(
      'online-retry',
      '在线壁纸馆暂时不可用',
      online.error || '无法连接 GitHub Pages。请检查网络后重试。',
      '重试',
    );
    return;
  }

  if (!online.items.length) {
    showListEmpty('online-empty', '壁纸馆还没有作品', '在线目录是空的，稍后再来看看。', '重新加载');
    return;
  }

  const items = filteredOnlineWallpapers();
  if (!items.length) {
    showListEmpty(
      'online-filter',
      '没有找到匹配的在线壁纸',
      '换一个关键词，或清空筛选后再看看。',
      '清除筛选',
    );
    return;
  }

  els.empty.hidden = true;
  els.grid.hidden = false;
  for (let index = 0; index < items.length; index += 1) {
    els.grid.appendChild(createOnlineCard(items[index], index));
  }
}

function localItemForOnline(item) {
  if (!state || !item) return null;
  return state.wallpapers.find((entry) => entry.id === item.localId) || null;
}

function createOnlineCard(item, index) {
  const localItem = localItemForOnline(item);
  const isApplied = Boolean(localItem && localItem.id === state.currentId);
  const isApplying = Boolean(localItem && localItem.id === busyId);
  const isBusy = downloadingOnlineId === item.id;
  const card = document.createElement('article');
  card.className = 'card online' + (isApplied ? ' applied' : '');
  card.dataset.id = item.id;
  card.dataset.mode = 'online';
  card.dataset.localId = item.localId;
  card.style.setProperty('--accent', item.accent || '#9fc7b5');
  card.style.animationDelay = Math.min(index * 45, 360) + 'ms';
  card.title = item.description || item.title;

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  const image = document.createElement('img');
  image.src = item.previewUrl;
  image.alt = item.title + ' 在线预览';
  image.loading = 'lazy';
  image.draggable = false;
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => {
    image.remove();
    thumb.classList.add('placeholder');
  });
  thumb.appendChild(image);

  const mark = document.createElement('span');
  mark.className = 'online-mark' + (localItem ? ' downloaded' : '');
  mark.innerHTML = ICONS.cloud + `<span>${localItem ? '已下载' : 'ONLINE'}</span>`;
  thumb.appendChild(mark);

  if (isApplied || isBusy || isApplying) {
    const badge = document.createElement('span');
    badge.className = 'badge' + (isBusy || isApplying ? ' busy' : '');
    badge.innerHTML = '<i></i>' + (isBusy ? '下载中' : isApplying ? '应用中' : '使用中');
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

  const viewOrb = document.createElement('button');
  viewOrb.className = 'play-orb';
  viewOrb.dataset.action = localItem ? 'play' : 'view';
  viewOrb.setAttribute('aria-label', (localItem ? '播放 ' : '查看 ') + item.title);
  viewOrb.innerHTML = localItem
    ? '<svg viewBox="0 0 20 20"><path d="M7.2 5.6v8.8l7.4-4.4z"/></svg>'
    : ICONS.eye;
  thumb.appendChild(viewOrb);

  const body = document.createElement('div');
  body.className = 'card-body';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'card-title';
  const title = document.createElement('h3');
  title.textContent = item.title;
  const subtitle = document.createElement('p');
  subtitle.textContent =
    item.subtitle ||
    (item.width && item.height ? `${item.width} × ${item.height}` : item.category || 'Lumen Archive');
  titleWrap.append(title, subtitle);

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const playButton = document.createElement('button');
  playButton.className = 'btn ghost sm';
  playButton.dataset.action = localItem ? 'play' : 'view';
  playButton.innerHTML = (localItem ? ICONS.play : ICONS.eye) + `<span>${localItem ? '播放' : '查看'}</span>`;
  playButton.disabled = isBusy || isApplying;

  const primaryButton = document.createElement('button');
  if (isBusy) {
    primaryButton.className = 'btn gold sm';
    primaryButton.disabled = true;
    primaryButton.innerHTML = '<span>下载中…</span>';
  } else if (isApplying) {
    primaryButton.className = 'btn gold sm';
    primaryButton.disabled = true;
    primaryButton.innerHTML = '<span>应用中…</span>';
  } else if (localItem && isApplied) {
    primaryButton.className = 'btn ghost sm';
    primaryButton.disabled = true;
    primaryButton.innerHTML = ICONS.check + '<span>使用中</span>';
  } else if (localItem) {
    primaryButton.className = 'btn gold sm';
    primaryButton.dataset.action = 'apply';
    primaryButton.innerHTML = ICONS.monitor + '<span>应用</span>';
  } else {
    primaryButton.className = 'btn gold sm';
    primaryButton.dataset.action = 'download';
    primaryButton.innerHTML = ICONS.cloud + '<span>下载</span>';
  }

  actions.append(playButton, primaryButton);
  body.append(titleWrap, actions);
  card.append(thumb, body);
  return card;
}

async function downloadOnlineWallpaper(item) {
  if (!item || downloadingOnlineId) return;
  downloadingOnlineId = item.id;
  if (sourceMode === 'online') renderOnlineGrid();
  if (onlinePreviewId === item.id) renderOnlinePreview();

  try {
    const result = await api.downloadOnline(item.id);
    if (result && result.state) render(result.state);
    if (result && result.ok) {
      const localId = result.localId;
      toast(result.already ? `《${item.title}》已经在本机。` : `《${item.title}》已下载到本机壁纸库。`, {
        action: {
          label: '立即应用',
          onClick: () => applyWallpaper(localId),
        },
        duration: 6500,
      });
    } else {
      toast((result && result.error) || '下载在线壁纸失败。', { type: 'error', duration: 9000 });
    }
  } catch (error) {
    toast('下载在线壁纸失败：' + error.message, { type: 'error', duration: 9000 });
  } finally {
    downloadingOnlineId = null;
    if (sourceMode === 'online') renderOnlineGrid();
    if (onlinePreviewId === item.id) renderOnlinePreview();
  }
}

function openOnlinePreview(id) {
  const item = online.items.find((entry) => entry.id === id);
  if (!item) return;
  onlinePreviewId = id;
  renderOnlinePreview();
  els.onlineModal.hidden = false;
  syncModalOpen();
  requestAnimationFrame(() => els.onlinePreviewClose.focus());
}

function renderOnlinePreview() {
  const item = online.items.find((entry) => entry.id === onlinePreviewId);
  if (!item) {
    closeOnlinePreview();
    return;
  }
  const localItem = localItemForOnline(item);
  const isApplied = Boolean(localItem && localItem.id === state.currentId);
  const isBusy = downloadingOnlineId === item.id;

  els.onlinePreviewTitle.textContent = item.title;
  els.onlinePreviewSubtitle.textContent = item.subtitle || item.category || 'LUMEN ARCHIVE';
  els.onlinePreviewDesc.textContent = item.description || '来自流光壁纸馆的在线作品。';

  const meta = [];
  if (item.category) meta.push(item.category);
  if (item.width && item.height) meta.push(`${item.width} × ${item.height}`);
  if (item.format) meta.push(item.format);
  if (item.bytes) meta.push(formatBytes(item.bytes));
  if (item.license) meta.push(item.license);
  if (item.author) meta.push(item.author);
  els.onlinePreviewMeta.innerHTML = '';
  for (const text of meta) {
    const span = document.createElement('span');
    span.textContent = text;
    els.onlinePreviewMeta.appendChild(span);
  }

  if (els.onlinePreviewImage.dataset.itemId !== item.id) {
    els.onlinePreviewImage.dataset.itemId = item.id;
    els.onlinePreviewFrame.classList.remove('ready');
    els.onlinePreviewLoading.textContent = '正在加载原图…';
    els.onlinePreviewImage.src = item.downloadUrl;
    els.onlinePreviewImage.alt = item.title + ' 原图';
    if (els.onlinePreviewImage.complete && els.onlinePreviewImage.naturalWidth) {
      requestAnimationFrame(() => els.onlinePreviewFrame.classList.add('ready'));
    }
  }

  if (isBusy) {
    els.onlinePreviewAction.textContent = '下载中…';
    els.onlinePreviewAction.disabled = true;
  } else if (localItem && isApplied) {
    els.onlinePreviewAction.textContent = '已在桌面';
    els.onlinePreviewAction.disabled = true;
  } else if (localItem) {
    els.onlinePreviewAction.textContent = '应用壁纸';
    els.onlinePreviewAction.disabled = false;
  } else {
    els.onlinePreviewAction.textContent = '下载到本机';
    els.onlinePreviewAction.disabled = false;
  }
}

function closeOnlinePreview() {
  if (els.onlineModal.hidden) return;
  els.onlineModal.hidden = true;
  onlinePreviewId = null;
  els.onlinePreviewImage.removeAttribute('src');
  delete els.onlinePreviewImage.dataset.itemId;
  els.onlinePreviewFrame.classList.remove('ready');
  syncModalOpen();
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
  const isDeleting = item.id === deletingId;
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

  if (isApplied || isBusy || isDeleting) {
    const badge = document.createElement('span');
    badge.className = 'badge' + (isBusy || isDeleting ? ' busy' : '');
    badge.innerHTML =
      '<i></i>' + (isDeleting ? '删除中' : isBusy ? '应用中' : '使用中');
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

  const deleteButton = document.createElement('button');
  deleteButton.className = 'card-delete';
  deleteButton.dataset.action = 'delete';
  deleteButton.title = '删除壁纸';
  deleteButton.setAttribute('aria-label', '删除 ' + item.title);
  deleteButton.innerHTML = ICONS.trash;
  thumb.appendChild(deleteButton);

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
  playButton.disabled = isDeleting;
  playButton.innerHTML = ICONS.play + '<span>播放</span>';

  const applyButton = document.createElement('button');
  if (isDeleting) {
    applyButton.className = 'btn ghost sm';
    applyButton.disabled = true;
    applyButton.innerHTML = '<span>删除中…</span>';
  } else if (isBusy) {
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
