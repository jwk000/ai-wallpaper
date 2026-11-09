import { createZip } from "./zip.js";
import { publishWallpaper, verifyToken } from "./github.js";

const config = window.LUMEN_CONFIG;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const dom = {
  header: $("#site-header"),
  menuToggle: $("#menu-toggle"),
  siteNav: $("#site-nav"),
  navFavorites: $("#nav-favorites"),
  favoriteCount: $("#favorite-count"),
  gallery: $("#gallery"),
  empty: $("#collection-empty"),
  emptyTitle: $("#collection-empty h3"),
  emptyCopy: $("#collection-empty p"),
  resetFilters: $("#reset-filters"),
  filters: $("#filters"),
  search: $("#search-input"),
  sort: $("#sort-select"),
  count: $("#collection-count"),
  collectionNumber: $("#collection-number"),
  collectionFootCount: $("#collection-foot-count"),
  heroCount: $("#hero-count"),
  statWorks: $("#stat-works"),
  heroArt: $("#hero-art"),
  heroImage: $("#hero-image"),
  heroMini: $("#hero-mini"),
  heroMiniImage: $("#hero-mini-image"),
  heroCaptionTitle: $("#hero-caption-title"),
  heroCaptionSpec: $("#hero-caption-spec"),
  ticker: $("#ticker-track"),
  cardTemplate: $("#wall-card-template"),

  detail: $("#detail-dialog"),
  detailMedia: $("#detail-media"),
  detailImage: $("#detail-image"),
  detailCategory: $("#detail-category"),
  detailNo: $("#detail-no"),
  detailTitle: $("#detail-title"),
  detailSubtitle: $("#detail-subtitle"),
  detailDescription: $("#detail-description"),
  detailAuthor: $("#detail-author"),
  detailSize: $("#detail-size"),
  detailFormat: $("#detail-format"),
  detailLicense: $("#detail-license"),
  detailTags: $("#detail-tags"),
  detailDownload: $("#detail-download"),
  detailDownloadLabel: $("#detail-download-label"),
  detailLiveDownload: $("#detail-live-download"),
  detailLive: $("#detail-live"),
  detailPlay: $("#detail-play"),
  detailPlayLabel: $("#detail-play-label"),
  detailFavorite: $("#detail-favorite"),
  detailShare: $("#detail-share"),
  detailCounter: $("#detail-counter"),
  detailPrev: $("#detail-prev"),
  detailNext: $("#detail-next"),

  upload: $("#upload-dialog"),
  uploadForm: $("#upload-form"),
  dropzone: $("#dropzone"),
  fileInput: $("#file-input"),
  dropEmpty: $("#dropzone-empty"),
  uploadPreview: $("#upload-preview"),
  removeFile: $("#remove-file"),
  fileMeta: $("#file-meta"),
  fileName: $("#file-name"),
  fileDims: $("#file-dims"),
  titleInput: $("#upload-title-input"),
  subtitleInput: $("#upload-subtitle-input"),
  authorInput: $("#upload-author-input"),
  categoryInput: $("#upload-category-input"),
  tagsInput: $("#upload-tags-input"),
  descriptionInput: $("#upload-description-input"),
  descriptionCount: $("#description-count"),
  licenseInput: $("#upload-license-input"),
  rights: $("#upload-rights"),
  uploadStatus: $("#upload-status"),
  uploadSubmit: $("#upload-submit"),
  uploadSubmitLabel: $("#upload-submit-label"),
  issueLink: $("#issue-link"),
  publishDot: $("#publish-dot"),
  publishModeTitle: $("#publish-mode-title"),
  publishModeDetail: $("#publish-mode-detail"),

  settings: $("#settings-dialog"),
  settingsRepo: $("#settings-repo"),
  settingsBranch: $("#settings-branch"),
  tokenInput: $("#token-input"),
  settingsStatus: $("#settings-status"),
  saveToken: $("#save-token"),
  clearToken: $("#clear-token"),

  toast: $("#toast"),
};

const TOKEN_KEY = "lumen.github.token";
const FAVORITES_KEY = "lumen.favorites.v1";

const state = {
  all: [],
  visible: [],
  loaded: false,
  loadError: false,
  category: "全部",
  query: "",
  sort: "curated",
  favorites: loadFavorites(),
  activeId: null,
  activeLive: "",
  livePlaying: false,
  token: loadToken(),
  tokenInfo: null,
  upload: {
    file: null,
    imageUrl: null,
    previewBlob: null,
    previewExt: "webp",
    width: 0,
    height: 0,
    color: "#25251f",
    blur: "",
    processing: false,
    submitting: false,
    published: false,
  },
};

const FORMAT_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

init();

function init() {
  if (!config) {
    showLoadError("站点配置文件缺失，请确认 config.js 已加载。");
    return;
  }

  dom.search.value = "";
  dom.sort.value = state.sort;
  dom.heroCount.textContent = "—";
  updateFavoriteCount(false);
  updatePublishMode();
  updateIssueLink();
  bindGlobalEvents();
  bindCollectionEvents();
  bindDetailEvents();
  bindUploadEvents();
  bindSettingsEvents();
  setupReveal();

  loadWallpapers();
}

/* ==========================================================================
   Loading and rendering
   ========================================================================== */

async function loadWallpapers() {
  state.loadError = false;
  dom.gallery.setAttribute("aria-busy", "true");
  dom.empty.hidden = true;

  try {
    const response = await fetch(config.manifestUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || !Array.isArray(data.wallpapers)) throw new Error("manifest shape");

    state.all = data.wallpapers
      .filter((item) => item && item.id && item.title && item.preview && item.download)
      .map((item, index) => ({
        ...item,
        no: item.no || String(index + 1).padStart(2, "0"),
        tags: Array.isArray(item.tags) ? item.tags : [],
      }));

    state.loaded = true;
    state.loadError = false;
    dom.gallery.setAttribute("aria-busy", "false");

    setupHero();
    setupTicker();
    updateCounts();
    renderGallery();
    updateFavoriteCount(false);
    applyRoute();
  } catch (error) {
    console.error("Could not load wallpaper manifest:", error);
    showLoadError();
  }
}

function showLoadError(message) {
  state.loadError = true;
  state.loaded = false;
  dom.gallery.replaceChildren();
  dom.gallery.setAttribute("aria-busy", "false");
  dom.empty.hidden = false;
  dom.emptyTitle.textContent = "画廊暂时没有打开。";
  dom.emptyCopy.textContent =
    message || "壁纸清单加载失败。请通过本地 HTTP 服务访问，或刷新页面重试。";
  dom.resetFilters.textContent = "重新加载";
  dom.count.textContent = "未能载入作品";
}

function updateCounts() {
  const total = state.all.length;
  const padded = String(total).padStart(3, "0");
  dom.heroCount.textContent = String(total);
  dom.statWorks.textContent = String(total);
  dom.collectionNumber.textContent = `/ ${padded}`;
  dom.collectionFootCount.textContent = String(total);
}

function setupHero() {
  if (!state.all.length) return;
  const featured = state.all.find((item) => item.featured) || state.all[0];
  const mini = state.all.find((item) => item.id !== featured.id) || featured;

  dom.heroArt.href = `#/wallpaper/${encodeURIComponent(featured.id)}`;
  dom.heroArt.setAttribute("aria-label", `查看本期精选：${featured.title}`);
  dom.heroImage.src = featured.preview;
  dom.heroImage.alt = wallpaperAlt(featured);
  if (featured.width && featured.height) {
    dom.heroImage.width = featured.width;
    dom.heroImage.height = featured.height;
  }

  dom.heroCaptionTitle.replaceChildren(
    document.createTextNode(featured.title),
    Object.assign(document.createElement("em"), {
      textContent: featured.subtitle || featured.category || "",
    })
  );
  dom.heroCaptionSpec.textContent = `${featured.width || "—"} × ${featured.height || "—"} · ${featured.format || "JPG"}`;

  dom.heroMini.href = `#/wallpaper/${encodeURIComponent(mini.id)}`;
  dom.heroMini.setAttribute("aria-label", `查看作品：${mini.title}`);
  dom.heroMiniImage.src = mini.preview;
  dom.heroMiniImage.alt = wallpaperAlt(mini);
  const miniLabel = $("span", dom.heroMini);
  if (miniLabel) miniLabel.textContent = `下一幅 / ${mini.title}`;
}

function setupTicker() {
  if (!state.all.length) return;
  const group = document.createElement("div");
  group.className = "ticker-group";
  const tickerItems = [...state.all, ...state.all.slice(0, 4)];
  tickerItems.forEach((item) => {
    const span = document.createElement("span");
    span.className = "ticker-item";
    span.textContent = `${item.title} / ${item.subtitle || item.category || "Wallpaper"}`;
    group.append(span);
  });
  const clone = group.cloneNode(true);
  dom.ticker.replaceChildren(group, clone);
}

function getVisibleWallpapers() {
  let items = [...state.all];

  if (state.category === "收藏") {
    items = items.filter((item) => state.favorites.has(item.id));
  } else if (state.category === "动效") {
    items = items.filter((item) => item.live);
  } else if (state.category !== "全部") {
    items = items.filter((item) => item.category === state.category);
  }

  const query = state.query.trim().toLocaleLowerCase();
  if (query) {
    const terms = query.split(/\s+/).filter(Boolean);
    items = items.filter((item) => {
      const haystack = [
        item.title,
        item.subtitle,
        item.description,
        item.author,
        item.category,
        ...(item.tags || []),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

  if (state.sort === "newest") {
    items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  } else if (state.sort === "name") {
    items.sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));
  }

  return items;
}

function renderGallery() {
  const items = getVisibleWallpapers();
  state.visible = items;

  updateCounts();
  dom.count.textContent =
    items.length === state.all.length && !state.query && state.category === "全部"
      ? `共 ${items.length} 件作品`
      : `找到 ${items.length} 件作品`;
  dom.collectionFootCount.textContent = String(items.length);

  dom.filters.querySelectorAll(".filter").forEach((button) => {
    const active = button.dataset.filter === state.category;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (!items.length) {
    dom.gallery.replaceChildren();
    dom.empty.hidden = false;
    dom.emptyTitle.textContent =
      state.category === "收藏"
        ? "还没有收藏。"
        : state.category === "动效"
          ? "还没有可播放的动效。"
          : "没有找到这幅画面。";
    dom.emptyCopy.textContent =
      state.category === "收藏"
        ? "在喜欢的作品上点一下心形，它会留在这里。"
        : state.category === "动效"
          ? "这类作品暂时只有静图，换一个筛选看看。"
          : "换一个关键词，或者回到全部作品。";
    dom.resetFilters.textContent = "清除筛选";
    syncBodyLock();
    return;
  }

  dom.empty.hidden = true;
  const fragment = document.createDocumentFragment();
  const spans = computeGallerySpans(items.length);

  items.forEach((item, index) => {
    const card = dom.cardTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.wallpaperId = item.id;
    card.classList.add(`span-${spans[index] || 4}`);

    const media = $(".wall-media", card);
    const link = $(".wall-media-link", card);
    const image = $("img", card);
    const fav = $(".wall-fav", card);

    media.style.backgroundColor = item.color || "#25251f";
    if (item.blur) media.style.backgroundImage = `url("${item.blur}")`;

    link.href = `#/wallpaper/${encodeURIComponent(item.id)}`;
    link.setAttribute("aria-label", `查看作品：${item.title}`);

    image.src = item.preview;
    image.alt = wallpaperAlt(item);
    if (item.width && item.height) {
      image.width = item.width;
      image.height = item.height;
    }
    const markLoaded = () => card.classList.add("is-loaded");
    image.addEventListener("load", markLoaded, { once: true });
    image.addEventListener("error", markLoaded, { once: true });
    if (image.complete && image.naturalWidth) markLoaded();

    $(".wall-no", card).textContent = item.no;
    const titleLink = $(".wall-title a", card);
    titleLink.href = link.href;
    titleLink.textContent = item.title;
    $(".wall-subtitle", card).textContent = item.subtitle || "";
    $(".wall-category", card).textContent = item.category || "未分类";
    $(".wall-live", card).hidden = !item.live;
    $(".wall-size", card).textContent =
      item.width && item.height ? `${item.width} × ${item.height}` : item.format || "";

    const download = $(".wall-download", card);
    download.dataset.wallpaperId = item.id;
    download.href = item.download;
    download.download = item.downloadName || "";
    download.setAttribute("aria-label", `下载 ${item.title} 原图`);

    fav.dataset.favId = item.id;
    const isFav = state.favorites.has(item.id);
    fav.setAttribute("aria-pressed", String(isFav));
    fav.setAttribute("aria-label", isFav ? `取消收藏 ${item.title}` : `收藏 ${item.title}`);

    fragment.append(card);
  });

  dom.gallery.replaceChildren(fragment);
  syncBodyLock();
}

function wallpaperAlt(item) {
  return [item.title, item.subtitle, item.description].filter(Boolean).join(" · ");
}

/**
 * Build a 12-column mosaic that always fills complete rows, even after filters
 * leave 1, 2, 4 or 7 results.
 */
function computeGallerySpans(count) {
  if (!count) return [];
  if (count === 1) return [12];
  if (count === 2) return [6, 6];
  if (count === 3) return [4, 4, 4];

  const spans = [];
  let remaining = count;
  let row = 0;

  while (remaining > 0) {
    if (remaining === 1) {
      spans.push(12);
      remaining = 0;
    } else if (remaining === 2) {
      spans.push(6, 6);
      remaining = 0;
    } else if (remaining === 3) {
      spans.push(4, 4, 4);
      remaining = 0;
    } else if (remaining === 4) {
      spans.push(7, 5, 6, 6);
      remaining = 0;
    } else if (row % 2 === 0) {
      spans.push(7, 5);
      remaining -= 2;
    } else {
      spans.push(4, 4, 4);
      remaining -= 3;
    }
    row += 1;
  }

  return spans;
}

/* ==========================================================================
   Collection controls
   ========================================================================== */

function bindCollectionEvents() {
  dom.filters.addEventListener("click", (event) => {
    const button = event.target.closest(".filter");
    if (!button) return;
    setCategory(button.dataset.filter);
  });

  let searchTimer = 0;
  dom.search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.query = dom.search.value;
      renderGallery();
    }, 60);
  });

  dom.search.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dom.search.value) {
      event.preventDefault();
      dom.search.value = "";
      state.query = "";
      renderGallery();
    }
  });

  dom.sort.addEventListener("change", () => {
    state.sort = dom.sort.value;
    renderGallery();
  });

  dom.resetFilters.addEventListener("click", () => {
    if (state.loadError) {
      window.location.reload();
      return;
    }
    state.category = "全部";
    state.query = "";
    state.sort = "curated";
    dom.search.value = "";
    dom.sort.value = "curated";
    renderGallery();
  });

  dom.navFavorites.addEventListener("click", () => {
    closeMenu();
    const next = state.category === "收藏" ? "全部" : "收藏";
    setCategory(next);
    if (next === "收藏" && state.favorites.size === 0) {
      toast("还没有收藏。点一下作品右上角的心形即可收藏。");
    }
  });

  dom.gallery.addEventListener("click", (event) => {
    const fav = event.target.closest(".wall-fav");
    if (fav) {
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(fav.dataset.favId);
      return;
    }

    const download = event.target.closest(".wall-download");
    if (download) {
      const item = state.all.find((entry) => entry.id === download.dataset.wallpaperId);
      toast(item ? `正在下载《${item.title}》原图…` : "正在下载原图…");
    }
  });

  $$("[data-footer-filter]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setCategory(link.dataset.footerFilter);
    });
  });
}

function setCategory(category) {
  state.category = category;
  renderGallery();
  const collection = $("#collection");
  if (collection) {
    collection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setupReveal() {
  const elements = $$(".reveal");
  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -5% 0px" }
  );
  elements.forEach((element) => observer.observe(element));
}

/* ==========================================================================
   Favorites
   ========================================================================== */

function loadFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
  } catch {
    // Private mode or storage disabled: favorites still work for this page view.
  }
}

function toggleFavorite(id) {
  if (!id) return;
  const item = state.all.find((entry) => entry.id === id);
  const wasFavorite = state.favorites.has(id);
  if (wasFavorite) state.favorites.delete(id);
  else state.favorites.add(id);
  saveFavorites();
  updateFavoriteCount(true);

  $$(`[data-fav-id="${cssEscape(id)}"]`).forEach((button) => {
    const active = state.favorites.has(id);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute(
      "aria-label",
      active ? `取消收藏 ${item ? item.title : "这幅作品"}` : `收藏 ${item ? item.title : "这幅作品"}`
    );
  });

  if (state.category === "收藏") renderGallery();
  toast(wasFavorite ? "已取消收藏。" : `已收藏${item ? `《${item.title}》` : ""}。`);
}

function updateFavoriteCount(bump) {
  const count = state.favorites.size;
  dom.favoriteCount.textContent = String(count);
  dom.favoriteCount.setAttribute("aria-label", `${count} 件收藏`);
  if (bump) {
    dom.favoriteCount.classList.remove("is-bump");
    void dom.favoriteCount.offsetWidth;
    dom.favoriteCount.classList.add("is-bump");
    window.setTimeout(() => dom.favoriteCount.classList.remove("is-bump"), 320);
  }
}

/* ==========================================================================
   Detail dialog and hash routing
   ========================================================================== */

function bindDetailEvents() {
  $("[data-close-detail]").addEventListener("click", () => closeDetail());
  dom.detail.addEventListener("click", (event) => {
    if (event.target === dom.detail) closeDetail();
  });
  dom.detail.addEventListener("close", () => {
    stopDetailLive();
    state.activeId = null;
    syncBodyLock();
    if (location.hash.startsWith("#/wallpaper/")) {
      history.replaceState(null, "", cleanUrl());
    }
  });

  dom.detailFavorite.addEventListener("click", () => toggleFavorite(state.activeId));
  dom.detailShare.addEventListener("click", async () => {
    if (!state.activeId) return;
    const url = `${location.origin}${location.pathname}${location.search}#/wallpaper/${encodeURIComponent(state.activeId)}`;
    const ok = await copyText(url);
    toast(ok ? "作品链接已复制。" : "复制失败，请从地址栏复制。");
  });

  dom.detailPrev.addEventListener("click", () => navigateDetail(-1));
  dom.detailNext.addEventListener("click", () => navigateDetail(1));

  dom.detailPlay.addEventListener("click", () => {
    if (state.livePlaying) stopDetailLive();
    else startDetailLive();
  });

  document.addEventListener("keydown", (event) => {
    if (!dom.detail.open) return;
    const tag = (event.target.tagName || "").toLowerCase();
    if (["input", "textarea", "select"].includes(tag)) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateDetail(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateDetail(1);
    }
  });

  window.addEventListener("hashchange", applyRoute);
  window.addEventListener("popstate", applyRoute);
}

function applyRoute() {
  if (!state.loaded) return;
  const match = location.hash.match(/^#\/wallpaper\/([^/?#]+)$/);
  if (!match) {
    if (dom.detail.open) dom.detail.close();
    return;
  }

  let id = match[1];
  try {
    id = decodeURIComponent(id);
  } catch {
    // Keep the raw id if it was not URL encoded.
  }
  const item = state.all.find((entry) => entry.id === id);
  if (!item) {
    toast("这幅作品不存在，或已经下架。");
    history.replaceState(null, "", cleanUrl());
    return;
  }

  renderDetail(item);
  if (!dom.detail.open) {
    dom.detail.showModal();
    syncBodyLock();
  }
  dom.detail.querySelector(".detail-info").scrollTop = 0;
}

function renderDetail(item) {
  stopDetailLive();
  state.activeId = item.id;
  dom.detailCategory.textContent = item.category || "未分类";
  dom.detailNo.textContent = `NO. ${item.no || "—"}`;
  dom.detailTitle.textContent = item.title;
  dom.detailSubtitle.textContent = item.subtitle || "";
  dom.detailDescription.textContent = item.description || "这幅作品还没有留下描述。";
  dom.detailAuthor.textContent = item.author || "匿名";
  dom.detailSize.textContent = `${item.width || "—"} × ${item.height || "—"}`;
  dom.detailFormat.textContent = item.format || "JPG";
  dom.detailLicense.textContent = item.license || "保留所有权利";

  dom.detailTags.replaceChildren(
    ...(item.tags || []).map((tag) => {
      const span = document.createElement("span");
      span.textContent = tag;
      return span;
    })
  );

  state.activeLive = item.live || "";
  dom.detailPlay.hidden = !state.activeLive;
  dom.detailPlay.setAttribute("aria-pressed", "false");
  dom.detailPlayLabel.textContent = "播放动效";
  dom.detailLiveDownload.hidden = !state.activeLive;

  dom.detailDownload.href = item.download;
  dom.detailDownload.download = item.downloadName || "";
  if (state.activeLive) {
    dom.detailDownloadLabel.textContent = "下载静帧";
    dom.detailDownload.setAttribute("aria-label", `下载《${item.title}》静帧图片`);
    dom.detailLiveDownload.href = state.activeLive;
    dom.detailLiveDownload.download = `lumen-${item.id}.html`;
    dom.detailLiveDownload.setAttribute("aria-label", `下载《${item.title}》可播放的 HTML 壁纸`);
  } else {
    dom.detailDownloadLabel.textContent = "下载原图";
    dom.detailDownload.setAttribute("aria-label", `下载《${item.title}》原图`);
    dom.detailLiveDownload.removeAttribute("href");
    dom.detailLiveDownload.removeAttribute("download");
  }

  const isFav = state.favorites.has(item.id);
  dom.detailFavorite.dataset.favId = item.id;
  dom.detailFavorite.setAttribute("aria-pressed", String(isFav));
  dom.detailFavorite.setAttribute(
    "aria-label",
    isFav ? `取消收藏 ${item.title}` : `收藏 ${item.title}`
  );

  dom.detailMedia.style.backgroundColor = item.color || "#25251f";
  dom.detailMedia.style.setProperty("--detail-blur", item.blur ? `url("${item.blur}")` : "none");
  dom.detailMedia.classList.remove("is-ready");
  dom.detailMedia.classList.add("is-loading");

  const image = dom.detailImage;
  image.onload = () => markDetailImageReady();
  image.onerror = () => markDetailImageReady();
  image.alt = wallpaperAlt(item);
  image.src = item.preview;
  if (image.complete && image.naturalWidth) markDetailImageReady();

  const list = state.visible.length ? state.visible : state.all;
  const index = list.findIndex((entry) => entry.id === item.id);
  dom.detailCounter.textContent =
    index >= 0 ? `${String(index + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}` : "— / —";
  dom.detailPrev.disabled = index <= 0;
  dom.detailNext.disabled = index < 0 || index >= list.length - 1;
}

function markDetailImageReady() {
  dom.detailMedia.classList.remove("is-loading");
  dom.detailMedia.classList.add("is-ready");
}

function startDetailLive() {
  if (state.livePlaying || !state.activeLive) return;
  const item = state.all.find((entry) => entry.id === state.activeId);
  if (!item) return;

  const frame = document.createElement("iframe");
  frame.className = "detail-live-frame";
  frame.src = state.activeLive;
  frame.title = `${item.title} · 动效预览`;
  frame.loading = "eager";
  frame.allow = "autoplay; fullscreen";
  frame.setAttribute("allowfullscreen", "");
  frame.setAttribute("sandbox", "allow-scripts allow-pointer-lock");
  frame.addEventListener(
    "load",
    () => {
      if (state.livePlaying) dom.detailMedia.classList.add("is-live-ready");
    },
    { once: true }
  );

  dom.detailLive.replaceChildren(frame);
  dom.detailLive.hidden = false;
  dom.detailMedia.classList.add("is-live");
  dom.detailMedia.classList.remove("is-live-ready");
  state.livePlaying = true;
  dom.detailPlay.setAttribute("aria-pressed", "true");
  dom.detailPlayLabel.textContent = "停止动效";
}

function stopDetailLive() {
  if (!state.livePlaying) return;
  state.livePlaying = false;
  dom.detailLive.replaceChildren();
  dom.detailLive.hidden = true;
  dom.detailMedia.classList.remove("is-live", "is-live-ready");
  dom.detailPlay.setAttribute("aria-pressed", "false");
  dom.detailPlayLabel.textContent = "播放动效";
}

function navigateDetail(direction) {
  if (!state.activeId) return;
  const list = state.visible.length ? state.visible : state.all;
  const index = list.findIndex((entry) => entry.id === state.activeId);
  if (index < 0) return;
  const next = list[index + direction];
  if (!next) return;
  renderDetail(next);
  history.replaceState(
    null,
    "",
    `${location.pathname}${location.search}#/wallpaper/${encodeURIComponent(next.id)}`
  );
}

function closeDetail() {
  if (dom.detail.open) dom.detail.close();
  else if (location.hash.startsWith("#/wallpaper/")) history.replaceState(null, "", cleanUrl());
}

function cleanUrl() {
  return `${location.pathname}${location.search}`;
}

/* ==========================================================================
   Upload
   ========================================================================== */

function bindUploadEvents() {
  $$("[data-open-upload]").forEach((button) => {
    button.addEventListener("click", openUpload);
  });
  $("[data-close-upload]").addEventListener("click", () => dom.upload.close());
  dom.upload.addEventListener("click", (event) => {
    if (event.target === dom.upload) dom.upload.close();
  });
  dom.upload.addEventListener("close", syncBodyLock);

  dom.dropzone.addEventListener("click", (event) => {
    if (event.target.closest(".remove-file")) return;
    dom.fileInput.click();
  });
  dom.dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      dom.fileInput.click();
    }
  });

  let dragDepth = 0;
  dom.dropzone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragDepth += 1;
    dom.dropzone.classList.add("is-dragging");
  });
  dom.dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  });
  dom.dropzone.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) dom.dropzone.classList.remove("is-dragging");
  });
  dom.dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dragDepth = 0;
    dom.dropzone.classList.remove("is-dragging");
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  dom.fileInput.addEventListener("change", () => {
    const file = dom.fileInput.files && dom.fileInput.files[0];
    if (file) handleFile(file);
  });

  dom.removeFile.addEventListener("click", (event) => {
    event.stopPropagation();
    resetFile();
  });

  dom.descriptionInput.addEventListener("input", () => {
    dom.descriptionCount.textContent = String(dom.descriptionInput.value.length);
    clearFieldError("description");
    updateIssueLink();
  });

  [dom.titleInput, dom.subtitleInput, dom.authorInput, dom.tagsInput].forEach((input) => {
    input.addEventListener("input", () => {
      clearFieldError(input.name);
      updateIssueLink();
    });
  });
  dom.categoryInput.addEventListener("change", updateIssueLink);
  dom.licenseInput.addEventListener("change", updateIssueLink);
  dom.rights.addEventListener("change", () => clearFieldError("rights"));

  dom.uploadForm.addEventListener("submit", handleUploadSubmit);
}

function openUpload() {
  closeMenu();
  if (!dom.upload.open) dom.upload.showModal();
  dom.uploadForm.scrollTop = 0;
  syncBodyLock();
}

async function handleFile(file) {
  if (state.upload.processing || state.upload.submitting) return;
  clearUploadStatus();

  if (!FORMAT_EXT[file.type]) {
    setUploadStatus("请选择 JPG、PNG 或 WebP 图片。", { type: "error" });
    dom.fileInput.value = "";
    return;
  }
  if (file.size > (config.maxFileBytes || 15 * 1024 * 1024)) {
    setUploadStatus("图片超过 15MB，请压缩后再上传。", { type: "error" });
    dom.fileInput.value = "";
    return;
  }
  state.upload.processing = true;
  updateSubmitState();
  dom.dropzone.setAttribute("aria-busy", "true");

  let imageUrl = "";
  try {
    const loaded = await loadImage(file);
    imageUrl = loaded.url;

    if (loaded.width < 1600) {
      throw new Error(`图片宽度为 ${loaded.width}px，至少需要 1600px。`);
    }
    if (loaded.width <= loaded.height) {
      throw new Error("请上传横版图片（宽度大于高度）。");
    }

    const preview = await createPreview(loaded.image);
    resetFile({ keepInput: true });
    state.upload.file = file;
    state.upload.imageUrl = imageUrl;
    state.upload.previewBlob = preview.blob;
    state.upload.previewExt = preview.ext;
    state.upload.width = loaded.width;
    state.upload.height = loaded.height;
    state.upload.color = preview.color;
    state.upload.blur = preview.blur;
    state.upload.published = false;

    dom.uploadPreview.src = imageUrl;
    dom.uploadPreview.hidden = false;
    dom.dropEmpty.hidden = true;
    dom.removeFile.hidden = false;
    dom.fileMeta.hidden = false;
    dom.fileName.textContent = file.name;
    dom.fileDims.textContent = `${loaded.width} × ${loaded.height} · ${formatBytes(file.size)}`;
    dom.dropzone.classList.add("has-image");

    if (!dom.titleInput.value.trim()) {
      const fromName = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[._-]?\d{3,4}\s*[x×]\s*\d{3,4}$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/(^|\s)\S/g, (character) => character.toUpperCase())
        .trim()
        .slice(0, 32);
      if (fromName) dom.titleInput.value = fromName;
    }

    updateIssueLink();
    setUploadStatus("图片已就绪。补齐信息后即可生成投稿包或直接发布。", { type: "info" });
    dom.titleInput.focus({ preventScroll: true });
  } catch (error) {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    state.upload.file = null;
    dom.fileInput.value = "";
    setUploadStatus(error.message || "无法读取这张图片。", { type: "error" });
  } finally {
    state.upload.processing = false;
    dom.dropzone.removeAttribute("aria-busy");
    updateSubmitState();
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        URL.revokeObjectURL(url);
        reject(new Error("这张图片没有有效尺寸。"));
        return;
      }
      resolve({
        image,
        url,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("浏览器无法解码这张图片，请换一张重试。"));
    };
    image.src = url;
  });
}

async function createPreview(image) {
  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, "image/webp", 0.84);
  if (!blob) blob = await canvasToBlob(canvas, "image/jpeg", 0.88);
  if (!blob) throw new Error("浏览器无法处理这张图片，请换一张重试。");

  const tiny = document.createElement("canvas");
  tiny.width = 24;
  tiny.height = Math.max(1, Math.round((24 * image.naturalHeight) / image.naturalWidth));
  const tinyContext = tiny.getContext("2d");
  tinyContext.drawImage(image, 0, 0, tiny.width, tiny.height);
  let blur = tiny.toDataURL("image/webp", 0.42);
  if (!blur.startsWith("data:image/webp")) blur = tiny.toDataURL("image/jpeg", 0.5);

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = 1;
  colorCanvas.height = 1;
  const colorContext = colorCanvas.getContext("2d");
  colorContext.fillStyle = "#1b1b18";
  colorContext.fillRect(0, 0, 1, 1);
  colorContext.drawImage(image, 0, 0, 1, 1);
  const pixel = colorContext.getImageData(0, 0, 1, 1).data;

  return {
    blob,
    ext: blob.type === "image/webp" ? "webp" : "jpg",
    blur,
    color: `#${[pixel[0], pixel[1], pixel[2]]
      .map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0"))
      .join("")}`,
  };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function resetFile({ keepInput = false } = {}) {
  if (state.upload.imageUrl) URL.revokeObjectURL(state.upload.imageUrl);
  state.upload.file = null;
  state.upload.imageUrl = null;
  state.upload.previewBlob = null;
  state.upload.width = 0;
  state.upload.height = 0;
  state.upload.color = "#25251f";
  state.upload.blur = "";
  state.upload.published = false;
  dom.uploadPreview.hidden = true;
  dom.uploadPreview.removeAttribute("src");
  dom.dropEmpty.hidden = false;
  dom.removeFile.hidden = true;
  dom.fileMeta.hidden = true;
  dom.dropzone.classList.remove("has-image");
  if (!keepInput) dom.fileInput.value = "";
  clearUploadStatus();
  updateSubmitState();
}

function updateIssueLink() {
  const title = dom.titleInput.value.trim();
  const lines = [
    "## 壁纸投稿",
    "",
    `- 标题：${title || "待填写"}`,
    `- 英文副标题：${dom.subtitleInput.value.trim() || "—"}`,
    `- 作者：${dom.authorInput.value.trim() || "待填写"}`,
    `- 分类：${dom.categoryInput.value}`,
    `- 标签：${dom.tagsInput.value.trim() || "—"}`,
    `- 授权：${dom.licenseInput.value}`,
    `- 尺寸：${state.upload.width ? `${state.upload.width} × ${state.upload.height}` : "见附件"}`,
    "",
    "### 描述",
    dom.descriptionInput.value.trim() || "待填写",
    "",
    "### 附件",
    "请将本站生成的投稿包（ZIP）拖到这里。投稿包中包含原图、预览图和 meta.json。",
  ];
  const params = new URLSearchParams({
    template: config.issueTemplate || "wallpaper-submission.md",
    title: `[投稿] ${title || "壁纸作品"}`,
    body: lines.join("\n"),
  });
  dom.issueLink.href = `${config.issueUrl}?${params.toString()}`;
}

function validateUpload() {
  clearFieldErrors();
  let valid = true;

  if (!dom.titleInput.value.trim()) {
    setFieldError("title", "请填写作品标题。");
    valid = false;
  }
  if (!dom.authorInput.value.trim()) {
    setFieldError("author", "请填写作者署名。");
    valid = false;
  }
  if (!dom.descriptionInput.value.trim()) {
    setFieldError("description", "请写一两句作品描述。");
    valid = false;
  }
  if (!dom.rights.checked) {
    setFieldError("rights", "请先确认你拥有分享这幅作品的权利。");
    valid = false;
  }
  if (!state.upload.file || !state.upload.previewBlob) {
    setUploadStatus("请先选择一张横版图片。", { type: "error" });
    dom.dropzone.focus();
    valid = false;
  }

  if (!valid) {
    const firstError = $(".field.has-error input, .field.has-error textarea, .field.has-error select");
    if (firstError) firstError.focus({ preventScroll: false });
    else if (!dom.rights.checked) dom.rights.focus({ preventScroll: false });
  }
  return valid;
}

function buildEntry() {
  const file = state.upload.file;
  const ext = FORMAT_EXT[file.type] || "jpg";
  const base =
    slugify(dom.subtitleInput.value) ||
    slugify(dom.titleInput.value) ||
    `wallpaper-${Date.now().toString(36)}`;
  const id = uniqueSlug(base);
  const width = state.upload.width;
  const height = state.upload.height;
  const fileName = `${id}-${width}x${height}.${ext}`;
  const previewName = `preview.${state.upload.previewExt}`;
  const tags = [...new Set(
    dom.tagsInput.value
      .split(/[,，、]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
  )].slice(0, 3);

  const maxNo = state.all.reduce((max, item) => {
    const value = Number.parseInt(item.no, 10);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return {
    id,
    title: dom.titleInput.value.trim(),
    subtitle: dom.subtitleInput.value.trim(),
    description: dom.descriptionInput.value.trim(),
    author: dom.authorInput.value.trim(),
    category: dom.categoryInput.value,
    tags,
    license: dom.licenseInput.value,
    no: String(maxNo + 1).padStart(2, "0"),
    featured: false,
    preview: `assets/wallpapers/${id}/${previewName}`,
    download: `assets/wallpapers/${id}/${fileName}`,
    downloadName: `lumen-${fileName}`,
    width,
    height,
    format: ext.toUpperCase(),
    bytes: file.size,
    color: state.upload.color,
    blur: state.upload.blur,
    aspect: Number((width / height).toFixed(4)),
    path: `assets/wallpapers/${id}/${fileName}`,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

async function handleUploadSubmit(event) {
  event.preventDefault();
  if (state.upload.submitting || state.upload.processing || state.upload.published) return;
  if (!validateUpload()) return;

  const entry = buildEntry();
  state.upload.submitting = true;
  updateSubmitState();

  try {
    if (state.token) {
      await publishToGitHub(entry);
    } else {
      await downloadSubmissionBundle(entry);
    }
  } catch (error) {
    console.error("Upload failed:", error);
    setUploadStatus(error.message || "投稿失败，请稍后重试。", { type: "error" });
  } finally {
    state.upload.submitting = false;
    updateSubmitState();
  }
}

async function publishToGitHub(entry) {
  setUploadStatus("准备提交到 GitHub…", { type: "info" });
  const result = await publishWallpaper({
    config,
    token: state.token,
    entry,
    originalFile: state.upload.file,
    previewBlob: state.upload.previewBlob,
    onProgress: (message) => setUploadStatus(message, { type: "info" }),
  });

  state.upload.published = true;
  updateSubmitState();
  setUploadStatus("已提交到仓库。GitHub Pages 通常会在 1 分钟内完成部署。", {
    type: "success",
    link: result.commitUrl,
    linkLabel: "查看这次提交 ↗",
  });
  toast("已提交到 GitHub，等待 Pages 自动部署。");
}

async function downloadSubmissionBundle(entry) {
  setUploadStatus("正在打包原图与元数据…", { type: "info" });
  const original = state.upload.file;
  const preview = state.upload.previewBlob;
  const previewName = entry.preview.split("/").pop();
  const originalName = entry.download.split("/").pop();
  const meta = {
    ...entry,
    submittedAt: new Date().toISOString(),
  };
  const readme = [
    "流光壁纸 · 投稿包",
    "==================",
    "",
    `作品：${entry.title}`,
    `作者：${entry.author}`,
    "",
    "包含文件：",
    `- ${originalName}  原图`,
    `- ${previewName}  网页预览图`,
    "- meta.json  作品元数据",
    "",
    "如何提交：",
    "1. 在 GitHub 仓库新建一个 Issue，选择「壁纸投稿」模板。",
    "2. 把本压缩包拖入 Issue 的正文框。",
    "3. 提交 Issue，等待维护者审核合并。",
    "",
    "由 Lumen Archive 自动生成。",
  ].join("\n");

  const zip = createZip([
    { name: `${entry.id}/${originalName}`, data: await original.arrayBuffer(), mime: original.type },
    { name: `${entry.id}/${previewName}`, data: await preview.arrayBuffer(), mime: preview.type },
    {
      name: `${entry.id}/meta.json`,
      data: `${JSON.stringify(meta, null, 2)}\n`,
      mime: "application/json",
    },
    { name: "README.txt", data: readme, mime: "text/plain" },
  ]);

  triggerDownload(zip, `lumen-${entry.id}-submission.zip`);
  setUploadStatus("投稿包已下载。接着点击「在 GitHub 投稿」，把 ZIP 拖入新建的 Issue 即可。", {
    type: "success",
  });
}

function clearFieldErrors() {
  $$(".field.has-error").forEach((field) => field.classList.remove("has-error"));
  $$(".field-error").forEach((element) => {
    element.textContent = "";
  });
  $(".rights-error").textContent = "";
}

function clearFieldError(name) {
  if (!name) return;
  const error = $(`[data-error-for="${name}"]`);
  if (error) error.textContent = "";
  const field = error && error.closest(".field");
  if (field) field.classList.remove("has-error");
  if (name === "rights") {
    $(".rights-error").textContent = "";
  }
}

function setFieldError(name, message) {
  const error = $(`[data-error-for="${name}"]`);
  if (!error) return;
  error.textContent = message;
  const field = error.closest(".field");
  if (field) field.classList.add("has-error");
}

function setUploadStatus(message, { type = "info", link = "", linkLabel = "" } = {}) {
  dom.uploadStatus.hidden = false;
  dom.uploadStatus.className = `upload-status is-${type}`;
  dom.uploadStatus.replaceChildren(document.createTextNode(message));
  if (link) {
    const anchor = document.createElement("a");
    anchor.href = link;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    anchor.textContent = ` ${linkLabel || "查看详情 ↗"}`;
    dom.uploadStatus.append(anchor);
  }
}

function clearUploadStatus() {
  dom.uploadStatus.hidden = true;
  dom.uploadStatus.textContent = "";
}

function updateSubmitState() {
  const busy = state.upload.processing || state.upload.submitting;
  dom.uploadSubmit.disabled = busy || state.upload.published;

  if (state.upload.published) {
    dom.uploadSubmitLabel.textContent = "已发布";
  } else if (state.upload.submitting) {
    dom.uploadSubmitLabel.textContent = state.token ? "正在发布…" : "正在打包…";
  } else {
    dom.uploadSubmitLabel.textContent = state.token ? "发布到 GitHub" : "下载投稿包";
  }

  const icon = $("svg", dom.uploadSubmit);
  if (icon) {
    icon.innerHTML = state.token
      ? '<path d="M10 17V7M6 11l4-4 4 4M4 3.5h12" stroke="currentColor" stroke-width="1.4"/>'
      : '<path d="M10 3v10M6 9l4 4 4-4M4 16.5h12" stroke="currentColor" stroke-width="1.4"/>';
  }
}

/* ==========================================================================
   GitHub token settings
   ========================================================================== */

function bindSettingsEvents() {
  $$("[data-open-settings]").forEach((button) => {
    button.addEventListener("click", openSettings);
  });
  $("[data-close-settings]").addEventListener("click", () => dom.settings.close());
  dom.settings.addEventListener("click", (event) => {
    if (event.target === dom.settings) dom.settings.close();
  });
  dom.settings.addEventListener("close", syncBodyLock);

  dom.saveToken.addEventListener("click", saveToken);
  dom.clearToken.addEventListener("click", clearToken);
  dom.tokenInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveToken();
    }
  });
}

function openSettings() {
  closeMenu();
  dom.settingsRepo.textContent = config.repo;
  dom.settingsBranch.textContent = `BRANCH / ${config.branch}`;
  dom.tokenInput.value = state.token || "";
  if (!dom.settings.open) dom.settings.showModal();
  syncBodyLock();
}

async function saveToken() {
  const token = dom.tokenInput.value.trim();
  if (!token) {
    showSettingsStatus("请先填入 Token。", "error");
    dom.tokenInput.focus();
    return;
  }

  dom.saveToken.disabled = true;
  dom.saveToken.textContent = "正在验证…";
  showSettingsStatus("正在连接 GitHub 并读取仓库…", "info");

  try {
    const info = await verifyToken(config, token);
    if (!info.canPush) {
      throw new Error("这个 Token 只有读取权限，请为 Contents 打开 Read and write。");
    }
    state.token = token;
    state.tokenInfo = info;
    persistToken(token);
    updatePublishMode();
    showSettingsStatus(
      `连接成功：${info.name} · ${info.wallpapers} 件作品 · 已具备写入权限。`,
      "success"
    );
    toast("发布权限已连接。");
  } catch (error) {
    showSettingsStatus(error.message || "Token 验证失败。", "error");
  } finally {
    dom.saveToken.disabled = false;
    dom.saveToken.textContent = "保存并验证";
  }
}

function clearToken() {
  state.token = "";
  state.tokenInfo = null;
  removeToken();
  dom.tokenInput.value = "";
  updatePublishMode();
  updateSubmitState();
  showSettingsStatus("Token 已从当前会话中清除。", "info");
}

function showSettingsStatus(message, type = "info") {
  dom.settingsStatus.hidden = false;
  dom.settingsStatus.className = `settings-status${type === "error" ? " is-error" : ""}${type === "success" ? " is-success" : ""}`;
  dom.settingsStatus.textContent = message;
}

function updatePublishMode() {
  const connected = Boolean(state.token);
  dom.publishDot.classList.toggle("is-connected", connected);
  dom.publishModeTitle.textContent = connected ? "维护者模式" : "访客模式";
  dom.publishModeDetail.textContent = connected
    ? `已连接 ${config.repo} · 直接提交并部署`
    : "生成投稿包，前往 GitHub 提交";
  updateSubmitState();
}

function loadToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function persistToken(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Session storage can be unavailable in strict privacy modes.
  }
}

function removeToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore.
  }
}

/* ==========================================================================
   Shared UI
   ========================================================================== */

function bindGlobalEvents() {
  window.addEventListener("scroll", () => {
    dom.header.classList.toggle("is-scrolled", window.scrollY > 8);
  }, { passive: true });

  dom.menuToggle.addEventListener("click", () => {
    toggleMenu(!document.body.classList.contains("menu-open"));
  });

  $$("#site-nav a").forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });

  document.addEventListener("click", (event) => {
    if (!document.body.classList.contains("menu-open")) return;
    if (event.target.closest("#site-header")) return;
    closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 960) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    const tag = (event.target.tagName || "").toLowerCase();
    const typing = ["input", "textarea", "select"].includes(tag) || event.target.isContentEditable;
    if (
      event.key === "/" &&
      !typing &&
      !document.querySelector("dialog[open]") &&
      !document.body.classList.contains("menu-open")
    ) {
      event.preventDefault();
      dom.search.focus();
      dom.search.select();
    }
    if (event.key === "Escape" && document.body.classList.contains("menu-open")) {
      closeMenu();
      dom.menuToggle.focus();
    }
  });
}

function toggleMenu(open) {
  document.body.classList.toggle("menu-open", open);
  dom.menuToggle.setAttribute("aria-expanded", String(open));
  dom.menuToggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
}

function closeMenu() {
  toggleMenu(false);
}

function syncBodyLock() {
  document.body.classList.toggle("dialog-open", Boolean(document.querySelector("dialog[open]")));
}

let toastTimer = 0;
let toastHideTimer = 0;

function toast(message) {
  window.clearTimeout(toastTimer);
  window.clearTimeout(toastHideTimer);
  dom.toast.textContent = message;

  if (typeof dom.toast.showPopover === "function") {
    try {
      if (!dom.toast.matches(":popover-open")) dom.toast.showPopover();
    } catch {
      // Popover support can be disabled by policy; the toast still works visually.
    }
  }

  // Force a frame so a repeat toast re-runs the entrance transition.
  dom.toast.classList.remove("is-visible");
  void dom.toast.offsetWidth;
  dom.toast.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove("is-visible");
    toastHideTimer = window.setTimeout(() => {
      try {
        if (dom.toast.matches(":popover-open")) dom.toast.hidePopover();
      } catch {
        // Ignore.
      }
    }, 380);
  }, 3300);
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 15000);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the selection fallback.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function uniqueSlug(base) {
  const existing = new Set(state.all.map((item) => item.id));
  let candidate = base;
  let suffix = 2;
  while (existing.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}
