'use strict';

const { ipcRenderer } = require('electron');

const TITLE_PREFIX = '--lumen-preview-title=';
const titleArgument = process.argv.find((argument) => argument.startsWith(TITLE_PREFIX));
let previewTitle = '';
if (titleArgument) {
  try {
    previewTitle = decodeURIComponent(titleArgument.slice(TITLE_PREFIX.length));
  } catch {
    previewTitle = '';
  }
}

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "PingFang SC", "Microsoft YaHei", sans-serif';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function boot() {
  if (document.querySelector('lumen-preview-chrome')) return;

  const host = document.createElement('lumen-preview-chrome');
  host.style.cssText =
    'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;';
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .capsule {
      position: absolute;
      top: clamp(18px, 2.4vh, 32px);
      left: 50%;
      transform: translateX(-50%) translateY(0);
      display: flex;
      align-items: center;
      gap: 16px;
      max-width: calc(100vw - 48px);
      padding: 10px 12px 10px 20px;
      border-radius: 999px;
      color: #f1ece1;
      font-family: ${FONT_STACK};
      background: rgba(10, 11, 13, 0.74);
      border: 1px solid rgba(255, 255, 255, 0.14);
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.07);
      backdrop-filter: blur(22px) saturate(1.2);
      -webkit-backdrop-filter: blur(22px) saturate(1.2);
      pointer-events: auto;
      transition: opacity 0.32s ease, transform 0.32s ease;
      user-select: none;
      -webkit-user-select: none;
    }
    .capsule.hidden {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px);
      pointer-events: none;
    }
    .mark {
      width: 21px;
      height: 21px;
      border-radius: 50%;
      border: 1.5px solid #f2e3c2;
      position: relative;
      flex: 0 0 auto;
      box-shadow: 0 0 16px rgba(242, 227, 194, 0.35);
    }
    .mark::after {
      content: "";
      position: absolute;
      top: -2.5px;
      left: 50%;
      width: 6px;
      height: 6px;
      margin-left: -3px;
      border-radius: 50%;
      background: #f2e3c2;
    }
    .label {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      padding-right: 8px;
    }
    .eyebrow {
      font-size: 9.5px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: rgba(242, 227, 194, 0.62);
      line-height: 1.2;
    }
    .title {
      font-size: 15px;
      font-weight: 550;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 40vw;
      line-height: 1.35;
      color: #f4efe4;
    }
    button {
      all: unset;
      cursor: pointer;
      font-family: ${FONT_STACK};
      font-size: 13px;
      line-height: 1;
      border-radius: 999px;
      padding: 12px 18px;
      transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
      white-space: nowrap;
    }
    button:active { transform: scale(0.97); }
    .ghost {
      color: rgba(241, 236, 225, 0.76);
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.04);
    }
    .ghost:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
    .primary {
      color: #16120a;
      background: #e9d2a2;
      font-weight: 600;
      box-shadow: 0 6px 18px rgba(233, 210, 162, 0.22);
    }
    .primary:hover { background: #f3dfb4; }
    .primary:disabled { opacity: 0.6; cursor: default; }
    .kbd {
      font-size: 9.5px;
      letter-spacing: 0.08em;
      opacity: 0.5;
      margin-left: 7px;
    }
    .error {
      font-size: 12px;
      color: #ffb3a1;
      max-width: 260px;
      line-height: 1.4;
    }
    @media (max-width: 760px) {
      .title { max-width: 30vw; }
      .kbd { display: none; }
    }
  `;

  const capsule = document.createElement('div');
  capsule.className = 'capsule';
  capsule.innerHTML = `
    <span class="mark" aria-hidden="true"></span>
    <span class="label">
      <span class="eyebrow">LIVE PREVIEW</span>
      <span class="title">${escapeHtml(previewTitle || document.title || '动态壁纸')}</span>
    </span>
    <button class="primary" type="button">应用壁纸</button>
    <button class="ghost" type="button">退出<span class="kbd">ESC</span></button>
  `;

  shadow.appendChild(style);
  shadow.appendChild(capsule);
  document.documentElement.appendChild(host);

  const primary = capsule.querySelector('.primary');
  const ghost = capsule.querySelector('.ghost');
  const title = capsule.querySelector('.title');
  let hideTimer = null;
  let applied = false;

  if (!previewTitle) {
    const updateTitle = () => {
      if (!previewTitle && document.title) title.textContent = document.title;
    };
    if (document.readyState === 'complete') updateTitle();
    else window.addEventListener('load', updateTitle, { once: true });
  }

  function setCursorHidden(hidden) {
    try {
      if (hidden) {
        if (!document.documentElement.dataset.lumenCursor) {
          document.documentElement.dataset.lumenCursor = document.documentElement.style.cursor || 'default';
        }
        document.documentElement.style.cursor = 'none';
      } else {
        document.documentElement.style.cursor = document.documentElement.dataset.lumenCursor || '';
        delete document.documentElement.dataset.lumenCursor;
      }
    } catch {}
  }

  let cursorHidden = false;
  function showChrome() {
    capsule.classList.remove('hidden');
    if (cursorHidden) {
      cursorHidden = false;
      setCursorHidden(false);
    }
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (primary.disabled) return;
      capsule.classList.add('hidden');
      cursorHidden = true;
      setCursorHidden(true);
    }, 4200);
  }

  window.addEventListener('mousemove', showChrome, { passive: true });
  window.addEventListener('keydown', showChrome, true);
  window.addEventListener('wheel', showChrome, { passive: true });
  window.addEventListener('focus', showChrome);

  primary.addEventListener('click', () => {
    if (primary.disabled) return;
    applied = true;
    primary.disabled = true;
    primary.textContent = '正在应用…';
    ipcRenderer
      .invoke('preview:apply')
      .then((result) => {
        if (!result || !result.ok) {
          primary.disabled = false;
          primary.textContent = '重试应用';
          applied = false;
          let error = capsule.querySelector('.error');
          if (!error) {
            error = document.createElement('span');
            error.className = 'error';
            capsule.insertBefore(error, primary);
          }
          error.textContent = (result && result.error) || '应用失败';
          showChrome();
        }
      })
      .catch(() => {
        primary.disabled = false;
        primary.textContent = '重试应用';
        applied = false;
        showChrome();
      });
  });

  ghost.addEventListener('click', () => {
    ipcRenderer.invoke('preview:close');
  });

  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        ipcRenderer.invoke('preview:close');
      }
    },
    true,
  );

  showChrome();
  hideTimer = setTimeout(() => {
    if (!applied && !primary.disabled) {
      capsule.classList.add('hidden');
      cursorHidden = true;
      setCursorHidden(true);
    }
  }, 5200);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

