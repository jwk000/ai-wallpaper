const config = window.LUMEN_CONFIG || {};
const REPO = config.repo || "jwk000/ai-wallpaper";
const REPO_URL = `https://github.com/${REPO}`;
const RELEASES_URL = `${REPO_URL}/releases`;

const versionTargets = Array.from(document.querySelectorAll("[data-version]"));
const starTargets = Array.from(document.querySelectorAll("[data-stars]"));
const starCaption = document.getElementById("starCaption");
const releaseState = document.getElementById("releaseState");
const releaseDate = document.querySelector("[data-release-date]");
const downloadNote = document.getElementById("downloadNote");
const windowsLinks = Array.from(document.querySelectorAll("[data-windows-download]"));
const windowsLabels = Array.from(document.querySelectorAll("[data-windows-label]"));
const macDownload = document.getElementById("macDownload");

const state = {
  release: null,
  repo: null,
  windowsAsset: null,
  macAsset: null,
};

init();

function init() {
  for (const link of document.querySelectorAll("[data-repo-link]")) {
    link.href = REPO_URL;
  }
  for (const link of document.querySelectorAll("[data-releases-link]")) {
    link.href = RELEASES_URL;
  }
  for (const link of windowsLinks) {
    link.href = RELEASES_URL;
  }
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  bindCopyCommand();
  setupReveal();
  loadGitHub();
}

async function loadGitHub() {
  const headers = { Accept: "application/vnd.github+json" };

  const repoPromise = fetchJson(`https://api.github.com/repos/${REPO}`, headers)
    .then((repo) => {
      state.repo = repo;
      applyRepo(repo);
    })
    .catch(() => {
      for (const star of starTargets) star.textContent = "—";
    });

  const releasePromise = fetchJson(`https://api.github.com/repos/${REPO}/releases?per_page=5`, headers)
    .then((releases) => {
      const release = Array.isArray(releases)
        ? releases.find((entry) => entry && !entry.draft && !entry.prerelease)
        : null;
      if (!release) {
        applyNoRelease();
        return;
      }
      state.release = release;
      applyRelease(release);
    })
    .catch(() => {
      applyNoRelease();
    });

  await Promise.allSettled([repoPromise, releasePromise]);
}

async function fetchJson(url, headers) {
  const response = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  return response.json();
}

function applyRepo(repo) {
  const stars = Number(repo.stargazers_count) || 0;
  for (const target of starTargets) {
    target.textContent = stars === 0 ? "0" : formatCount(stars);
    target.setAttribute("aria-label", `${stars} 个 GitHub Star`);
  }
  if (starCaption) {
    starCaption.textContent = stars === 0 ? "STARS · 成为第一个" : "STARS ON GITHUB";
  }
}

function applyRelease(release) {
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const windowsAsset =
    assets.find((asset) => /setup.*\.exe$/i.test(asset.name)) ||
    assets.find((asset) => /\.exe$/i.test(asset.name) && !/\.blockmap$/i.test(asset.name));
  const macAsset =
    assets.find((asset) => /\.dmg$/i.test(asset.name)) ||
    assets.find((asset) => /mac.*\.zip$/i.test(asset.name));

  state.windowsAsset = windowsAsset || null;
  state.macAsset = macAsset || null;

  const tag = release.tag_name || "最新版本";
  for (const target of versionTargets) target.textContent = tag;

  if (releaseDate) {
    const published = release.published_at ? formatDate(release.published_at) : "";
    releaseDate.textContent = published ? `发布于 ${published}` : "GitHub Release";
  }

  if (releaseState) {
    releaseState.className = "release-state is-ready";
    releaseState.innerHTML = "<i></i> 已发布";
  }

  if (windowsAsset) {
    for (const link of windowsLinks) {
      link.href = windowsAsset.browser_download_url;
      link.setAttribute("aria-label", `下载 ${tag} Windows 安装包`);
    }
    for (const label of windowsLabels) label.textContent = "下载 Windows 版";
    if (downloadNote) {
      downloadNote.textContent = `${windowsAsset.name} · ${formatBytes(windowsAsset.size)} · 来自 GitHub Releases`;
    }
  } else {
    for (const label of windowsLabels) label.textContent = "查看发布页面";
    if (downloadNote) {
      downloadNote.textContent = "这个版本还没有可下载的 Windows 安装包，请前往 Releases 查看。";
    }
  }

  if (macDownload) {
    if (macAsset) {
      macDownload.hidden = false;
      macDownload.href = macAsset.browser_download_url;
      macDownload.setAttribute("aria-label", `下载 ${tag} macOS 版本`);
    } else {
      macDownload.hidden = true;
    }
  }
}

function applyNoRelease() {
  if (releaseState) {
    releaseState.className = "release-state";
    releaseState.innerHTML = "<i></i> 等待首个构建";
  }
  for (const label of windowsLabels) label.textContent = "查看 GitHub Releases";
  if (downloadNote) {
    downloadNote.textContent = "首个构建产物尚未发布；可以先从源码运行，或在 GitHub Releases 关注后续版本。";
  }
  if (macDownload) macDownload.hidden = true;
}

function formatCount(value) {
  return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function bindCopyCommand() {
  const button = document.getElementById("copyCommand");
  const status = document.getElementById("copyStatus");
  if (!button) return;

  button.addEventListener("click", async () => {
    const command = "npm install && npm start";
    let copied = false;
    try {
      await navigator.clipboard.writeText(command);
      copied = true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = command;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
      textarea.remove();
    }
    if (status) {
      status.textContent = copied ? "已复制" : "复制失败";
      window.setTimeout(() => {
        status.textContent = "";
      }, 2200);
    }
    toast(copied ? "启动命令已复制。" : "复制失败，请手动选择命令。");
  });
}

let toastTimer = 0;
let hideTimer = 0;

function toast(message) {
  const element = document.getElementById("toast");
  if (!element) return;
  window.clearTimeout(toastTimer);
  window.clearTimeout(hideTimer);
  element.textContent = message;
  if (typeof element.showPopover === "function") {
    try {
      if (!element.matches(":popover-open")) element.showPopover();
    } catch {}
  }
  element.classList.remove("is-visible");
  void element.offsetWidth;
  element.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    element.classList.remove("is-visible");
    hideTimer = window.setTimeout(() => {
      try {
        if (element.matches(":popover-open")) element.hidePopover();
      } catch {}
    }, 380);
  }, 2800);
}

function setupReveal() {
  const elements = Array.from(document.querySelectorAll(".reveal"));
  if (!("IntersectionObserver" in window)) {
    for (const element of elements) element.classList.add("is-visible");
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.08, rootMargin: "0px 0px -5% 0px" }
  );
  for (const element of elements) observer.observe(element);
}
