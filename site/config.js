/**
 * Public site configuration.
 *
 * This file is safe to commit. Never put a GitHub token here.
 * Tokens entered in the publishing panel live only in sessionStorage.
 */
window.LUMEN_CONFIG = Object.freeze({
  // GitHub repository that stores both the site and the wallpaper manifest.
  repo: "jwk000/ai-wallpaper",

  // Branch that GitHub Pages deploys from.
  branch: "main",

  // Folder inside the repository that is uploaded to Pages.
  repoSiteRoot: "site",

  // Paths are relative to the repository root.
  manifestPath: "site/data/wallpapers.json",

  // Paths used by the browser, relative to this site root.
  manifestUrl: "data/wallpapers.json",

  // Where public submissions are opened.
  issueUrl: "https://github.com/jwk000/ai-wallpaper/issues/new",
  issueTemplate: "wallpaper-submission.md",

  // Soft client-side limit. GitHub accepts larger files, but 15MB keeps the
  // publishing flow reliable on slower connections.
  maxFileBytes: 15 * 1024 * 1024,
});
