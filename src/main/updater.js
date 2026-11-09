'use strict';

const { app, net, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

const GITHUB_OWNER = 'jwk000';
const GITHUB_REPO = 'ai-wallpaper';
const GITHUB_PROJECT = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
const RELEASES_URL = `${GITHUB_PROJECT}/releases`;
const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

const API_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'Lumen-Wallpaper-Updater',
};

function normalizeVersion(value) {
  return String(value || '')
    .trim()
    .replace(/^v/i, '');
}

function parseVersion(value) {
  const match = normalizeVersion(value).match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
  if (!match) return null;
  return {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] || '',
  };
}

function isNewerVersion(latest, current) {
  const next = parseVersion(latest);
  const installed = parseVersion(current);
  if (!next || !installed) return false;
  for (let index = 0; index < 3; index += 1) {
    if (next.numbers[index] !== installed.numbers[index]) {
      return next.numbers[index] > installed.numbers[index];
    }
  }
  if (next.prerelease === installed.prerelease) return false;
  if (!next.prerelease) return true;
  if (!installed.prerelease) return false;
  return next.prerelease.localeCompare(installed.prerelease, 'en') > 0;
}

function releaseUrlFor(version) {
  const normalized = normalizeVersion(version);
  return normalized ? `${RELEASES_URL}/tag/v${normalized}` : RELEASES_URL;
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(parseInt(number, 16)));
}

// GitHub's Atom feed fallback hands electron-updater HTML instead of Markdown.
// Convert the few tags release notes actually use so the renderer can stay text-only.
function htmlToMarkdown(html) {
  let text = String(html);
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<h([1-6])[^>]*>/gi, (_, level) => `\n${'#'.repeat(Math.min(Number(level), 3))} `);
  text = text.replace(/<li[^>]*>/gi, '\n- ');
  text = text.replace(/<\/(p|div|h[1-6]|ul|ol|li|blockquote)>/gi, '\n\n');
  text = text.replace(
    /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, label) => `[${String(label).replace(/<[^>]+>/g, '')}](${href})`,
  );
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  text = text.replace(/<[^>]+>/g, '');
  return decodeEntities(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeReleaseNotes(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry) return '';
        const heading = entry.version ? `## v${normalizeVersion(entry.version)}\n\n` : '';
        return heading + normalizeReleaseNotes(entry.note);
      })
      .filter(Boolean)
      .join('\n\n');
  }
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/<(p|ul|ol|li|div|h[1-6]|br|a|code|pre|strong|em)\b/i.test(trimmed)) {
    return htmlToMarkdown(trimmed);
  }
  return trimmed;
}

function friendlyError(error) {
  const message = String((error && error.message) || error || '');
  if (/ERR_UPDATER_LATEST_VERSION_NOT_FOUND|Unable to find latest version|No published versions|404/i.test(message)) {
    return 'GitHub 上还没有发布可用的版本。';
  }
  if (
    /ENOTFOUND|EAI_AGAIN|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|net::/i.test(
      message,
    )
  ) {
    return '无法连接更新服务器，请检查网络后重试。';
  }
  if (/ERR_UPDATER_CHANNEL_FILE_NOT_FOUND|latest\.yml/i.test(message)) {
    return '更新清单缺失（latest.yml），请确认发布流程完整上传了构建产物。';
  }
  if (/GitHub API 返回 403|rate limit/i.test(message)) {
    return 'GitHub 请求过于频繁，请稍后再试。';
  }
  if (/code signature|signature check|签名/i.test(message)) {
    return '安装包签名校验未通过，已停止更新。';
  }
  if (/EACCES|EPERM|permission/i.test(message)) {
    return '没有权限写入更新缓存，请尝试以管理员身份运行或手动下载安装。';
  }
  return message || '检查更新时发生未知错误。';
}

function isPortableBuild() {
  return Boolean(process.env.PORTABLE_EXECUTABLE_FILE || process.env.PORTABLE_EXECUTABLE_DIR);
}

function supportMessage({ supported, portable }) {
  if (supported) return '';
  if (portable) return '免安装版不支持自动覆盖安装，请下载安装版后手动更新。';
  if (!app.isPackaged) return '开发模式下只检查版本信息，不会下载或安装更新。';
  if (process.platform === 'linux') return '当前平台暂不支持自动更新。';
  return '当前版本不支持自动更新，请前往 GitHub 下载最新安装包。';
}

function createUpdater({ config, onState, onBeforeInstall }) {
  const portable = isPortableBuild();
  const supported = app.isPackaged && !portable && process.platform !== 'linux';

  const state = {
    currentVersion: app.getVersion(),
    supported,
    portable,
    isDev: !app.isPackaged,
    platform: process.platform,
    supportMessage: '',
    status: 'idle', // idle | checking | available | downloading | downloaded | up-to-date | no-release | error | installing
    autoCheck: config.get('autoCheckUpdates') !== false,
    latestVersion: '',
    releaseName: '',
    releaseNotes: '',
    releaseDate: '',
    releaseUrl: '',
    progress: null,
    error: '',
    errorDetail: '',
    checkedAt: 0,
    installing: false,
  };
  state.supportMessage = supportMessage({ supported, portable });

  let disposed = false;
  let lastProgressUpdate = 0;

  function snapshot() {
    return JSON.parse(JSON.stringify(state));
  }

  function publish(patch) {
    if (disposed) return;
    Object.assign(state, patch);
    try {
      onState(snapshot());
    } catch (error) {
      console.warn('[流光] 广播更新状态失败：', error.message);
    }
  }

  function fail(error) {
    if (state.installing) return;
    const raw = String((error && error.message) || error || '');
    const noRelease = /No published versions|ERR_UPDATER_LATEST_VERSION_NOT_FOUND|Unable to find latest version/i.test(
      raw,
    );
    publish({
      status: noRelease ? 'no-release' : 'error',
      error: noRelease ? '' : friendlyError(error),
      errorDetail: raw,
      releaseUrl: noRelease ? RELEASES_URL : state.releaseUrl,
      progress: null,
      checkedAt: Date.now(),
    });
  }

  if (supported) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.autoRunAppAfterInstall = true;
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;
    autoUpdater.fullChangelog = false;
    autoUpdater.disableWebInstaller = true;
    autoUpdater.logger = {
      info: (...args) => console.log('[更新]', ...args),
      warn: (...args) => console.warn('[更新]', ...args),
      error: (...args) => console.error('[更新]', ...args),
      debug: () => {},
    };

    autoUpdater.on('checking-for-update', () => {
      publish({ status: 'checking', error: '', errorDetail: '', progress: null });
    });

    autoUpdater.on('update-available', (info) => {
      const version = normalizeVersion(info.version);
      publish({
        status: 'available',
        latestVersion: version,
        releaseName: info.releaseName || '',
        releaseNotes: normalizeReleaseNotes(info.releaseNotes),
        releaseDate: info.releaseDate || '',
        releaseUrl: releaseUrlFor(version),
        progress: { percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 },
        error: '',
        errorDetail: '',
        checkedAt: Date.now(),
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      publish({
        status: 'up-to-date',
        latestVersion: normalizeVersion(info && info.version) || state.currentVersion,
        releaseName: '',
        releaseNotes: '',
        releaseDate: '',
        releaseUrl: '',
        progress: null,
        error: '',
        errorDetail: '',
        checkedAt: Date.now(),
      });
    });

    autoUpdater.on('download-progress', (info) => {
      const now = Date.now();
      if (info.percent < 100 && now - lastProgressUpdate < 320) return;
      lastProgressUpdate = now;
      publish({
        status: 'downloading',
        progress: {
          percent: Math.max(0, Math.min(100, Math.round(info.percent * 10) / 10)),
          transferred: Number(info.transferred) || 0,
          total: Number(info.total) || 0,
          bytesPerSecond: Number(info.bytesPerSecond) || 0,
        },
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      const version = normalizeVersion(info && info.version) || state.latestVersion;
      publish({
        status: 'downloaded',
        latestVersion: version,
        releaseNotes: state.releaseNotes || normalizeReleaseNotes(info && info.releaseNotes),
        releaseUrl: state.releaseUrl || releaseUrlFor(version),
        progress: state.progress
          ? { ...state.progress, percent: 100 }
          : { percent: 100, transferred: 0, total: 0, bytesPerSecond: 0 },
        error: '',
        errorDetail: '',
        checkedAt: Date.now(),
      });
    });

    autoUpdater.on('error', (error) => fail(error));
  }

  async function checkViaGithub() {
    publish({ status: 'checking', error: '', errorDetail: '', progress: null });
    try {
      const response = await net.fetch(LATEST_RELEASE_API, {
        headers: API_HEADERS,
        signal: AbortSignal.timeout(12000),
      });
      if (response.status === 404) {
        publish({
          status: 'no-release',
          latestVersion: '',
          releaseNotes: '',
          releaseUrl: RELEASES_URL,
          progress: null,
          error: '',
          errorDetail: '',
          checkedAt: Date.now(),
        });
        return snapshot();
      }
      if (!response.ok) throw new Error(`GitHub API 返回 ${response.status}`);
      const release = await response.json();
      const version = normalizeVersion(release.tag_name);
      const releaseUrl = release.html_url || releaseUrlFor(version);
      if (version && isNewerVersion(version, state.currentVersion)) {
        publish({
          status: 'available',
          latestVersion: version,
          releaseName: typeof release.name === 'string' ? release.name : '',
          releaseNotes: normalizeReleaseNotes(release.body),
          releaseDate: release.published_at || '',
          releaseUrl,
          progress: null,
          error: '',
          errorDetail: '',
          checkedAt: Date.now(),
        });
      } else {
        publish({
          status: 'up-to-date',
          latestVersion: version || state.currentVersion,
          releaseName: '',
          releaseNotes: '',
          releaseUrl: '',
          progress: null,
          error: '',
          errorDetail: '',
          checkedAt: Date.now(),
        });
      }
    } catch (error) {
      fail(error);
    }
    return snapshot();
  }

  async function check({ manual = false } = {}) {
    if (disposed || state.installing) return snapshot();
    if (state.status === 'checking' || state.status === 'downloading') return snapshot();
    if (state.status === 'downloaded') {
      if (manual) publish({ status: 'downloaded' });
      return snapshot();
    }

    if (supported) {
      publish({
        status: 'checking',
        error: '',
        errorDetail: '',
        progress: null,
        checkedAt: Date.now(),
      });
      try {
        await autoUpdater.checkForUpdates();
      } catch (error) {
        if (state.status !== 'error') fail(error);
      }
      return snapshot();
    }

    // Development builds and the portable exe can still read the public release feed.
    if (!manual) return snapshot();
    return checkViaGithub();
  }

  async function install() {
    if (!supported) {
      return { ok: false, error: state.supportMessage, state: snapshot() };
    }
    if (state.status !== 'downloaded') {
      return { ok: false, error: '更新包还没有下载完成。', state: snapshot() };
    }
    if (state.installing) return { ok: true, state: snapshot() };

    state.installing = true;
    publish({ status: 'installing', error: '' });
    try {
      if (onBeforeInstall) await onBeforeInstall();
    } catch (error) {
      state.installing = false;
      fail(error);
      return { ok: false, error: friendlyError(error), state: snapshot() };
    }

    // Give the renderer a moment to paint "正在重启" before the process goes away.
    setTimeout(() => {
      try {
        autoUpdater.quitAndInstall(true, true);
      } catch (error) {
        state.installing = false;
        fail(error);
      }
    }, 450);
    return { ok: true, state: snapshot() };
  }

  function setAutoCheck(enabled) {
    state.autoCheck = Boolean(enabled);
    config.set('autoCheckUpdates', state.autoCheck);
    publish({ autoCheck: state.autoCheck });
    return snapshot();
  }

  async function openReleasePage(target) {
    const url =
      typeof target === 'string' && /^https?:\/\//i.test(target)
        ? target
        : state.releaseUrl || RELEASES_URL;
    try {
      await shell.openExternal(url);
      return { ok: true, url };
    } catch (error) {
      return { ok: false, error: error.message, url };
    }
  }

  function dispose() {
    disposed = true;
  }

  return {
    check,
    install,
    setAutoCheck,
    openReleasePage,
    snapshot,
    dispose,
    supported,
    portable,
  };
}

module.exports = {
  createUpdater,
  isNewerVersion,
  normalizeReleaseNotes,
  releaseUrlFor,
  RELEASES_URL,
  GITHUB_PROJECT,
};
