/**
 * GitHub publishing adapter for the static site.
 *
 * The site has no server. When a maintainer supplies a fine-grained token,
 * assets and the manifest are committed atomically through the GitHub Git Data
 * API. GitHub Pages then redeploys from the `site/` folder.
 */

const API_ROOT = "https://api.github.com";

class GitHubError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.detail = detail;
  }
}

function encodePath(path) {
  return String(path)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToUtf8(base64) {
  const binary = atob(String(base64).replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("无法读取图片文件。"));
    reader.readAsDataURL(blob);
  });
}

function friendlyError(status, payload) {
  const detail = payload && (payload.message || payload.error);
  if (status === 401) return "Token 无效或已过期，请重新生成。";
  if (status === 403) {
    return "GitHub 拒绝了这次操作。请确认 Token 拥有此仓库的 Contents 读写权限，或稍后重试。";
  }
  if (status === 404) return "找不到仓库或文件。请检查仓库名称、分支和 Token 权限。";
  if (status === 409 || status === 422) return `仓库状态已变化，请刷新页面后重试。${detail ? `（${detail}）` : ""}`;
  if (status === 429) return "请求过于频繁，请稍后再试。";
  return detail ? `GitHub 返回错误：${detail}` : `GitHub 请求失败（HTTP ${status}）。`;
}

async function request(path, { token, method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new GitHubError("无法连接 GitHub。请检查网络或浏览器扩展是否拦截了 api.github.com。", 0);
  }

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // Non-JSON error body.
    }
    throw new GitHubError(friendlyError(response.status, payload), response.status, payload);
  }

  if (response.status === 204) return null;
  return response.json();
}

function repoBase(config) {
  return `/repos/${encodePath(config.repo)}`;
}

async function readRemoteManifest(config, token) {
  const data = await request(
    `${repoBase(config)}/contents/${encodePath(config.manifestPath)}?ref=${encodeURIComponent(config.branch)}`,
    { token }
  );
  if (!data || data.type !== "file" || !data.content) {
    throw new GitHubError("仓库里的壁纸清单格式不正确。", 0);
  }
  let parsed;
  try {
    parsed = JSON.parse(base64ToUtf8(data.content));
  } catch {
    throw new GitHubError("无法解析仓库里的壁纸清单。", 0);
  }
  if (!parsed || !Array.isArray(parsed.wallpapers)) {
    throw new GitHubError("壁纸清单里缺少 wallpapers 数组。", 0);
  }
  return { manifest: parsed, sha: data.sha };
}

async function createBlob(config, token, content) {
  let base64;
  if (content instanceof Blob) {
    base64 = await blobToBase64(content);
  } else {
    base64 = utf8ToBase64(content);
  }
  const blob = await request(`${repoBase(config)}/git/blobs`, {
    token,
    method: "POST",
    body: { content: base64, encoding: "base64" },
  });
  return blob.sha;
}

export async function verifyToken(config, token) {
  if (!token || token.trim().length < 20) {
    throw new GitHubError("请填入有效的 GitHub Token。", 0);
  }
  const repo = await request(repoBase(config), { token });
  const manifest = await readRemoteManifest(config, token);
  return {
    name: repo.full_name || config.repo,
    private: Boolean(repo.private),
    canPush: repo.permissions ? Boolean(repo.permissions.push) : true,
    wallpapers: manifest.manifest.wallpapers.length,
  };
}

/**
 * Commit the uploaded image, generated preview and manifest in one commit.
 *
 * @param {object} options
 * @param {object} options.config
 * @param {string} options.token
 * @param {object} options.entry          Manifest entry for the new wallpaper.
 * @param {File}   options.originalFile
 * @param {Blob}   options.previewBlob
 * @param {(message: string) => void} [options.onProgress]
 */
export async function publishWallpaper({ config, token, entry, originalFile, previewBlob, onProgress = () => {} }) {
  if (!token) throw new GitHubError("请先配置 GitHub Token。", 0);

  onProgress("读取远端清单…");
  const remote = await readRemoteManifest(config, token);
  const existingIds = new Set(remote.manifest.wallpapers.map((item) => item.id));
  if (existingIds.has(entry.id)) {
    throw new GitHubError(`标识 “${entry.id}” 已经被使用，请修改英文副标题后重试。`, 0);
  }

  const ref = await request(
    `${repoBase(config)}/git/ref/heads/${encodePath(config.branch)}`,
    { token }
  );
  const parentSha = ref.object.sha;

  onProgress("创建提交，上传图片…");
  const [imageSha, previewSha] = await Promise.all([
    createBlob(config, token, originalFile),
    createBlob(config, token, previewBlob),
  ]);

  const maxNo = remote.manifest.wallpapers.reduce((max, item) => {
    const value = Number.parseInt(item.no, 10);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  const nextEntry = {
    ...entry,
    no: String(maxNo + 1).padStart(2, "0"),
    createdAt: new Date().toISOString().slice(0, 10),
  };

  remote.manifest.wallpapers.unshift(nextEntry);
  remote.manifest.updatedAt = new Date().toISOString().slice(0, 10);
  const manifestText = `${JSON.stringify(remote.manifest, null, 2)}\n`;

  onProgress("更新壁纸清单…");
  const manifestSha = await createBlob(config, token, manifestText);

  const imagePath = `${config.repoSiteRoot}/${nextEntry.download}`.replace(/^\/+/, "");
  const previewPath = `${config.repoSiteRoot}/${nextEntry.preview}`.replace(/^\/+/, "");
  const manifestPath = config.manifestPath.replace(/^\/+/, "");

  const tree = await request(`${repoBase(config)}/git/trees`, {
    token,
    method: "POST",
    body: {
      base_tree: (await request(`${repoBase(config)}/git/commits/${parentSha}`, { token })).tree.sha,
      tree: [
        { path: imagePath, mode: "100644", type: "blob", sha: imageSha },
        { path: previewPath, mode: "100644", type: "blob", sha: previewSha },
        { path: manifestPath, mode: "100644", type: "blob", sha: manifestSha },
      ],
    },
  });

  onProgress("写入仓库…");
  const commit = await request(`${repoBase(config)}/git/commits`, {
    token,
    method: "POST",
    body: {
      message: `feat(site): add wallpaper “${nextEntry.title}”`,
      tree: tree.sha,
      parents: [parentSha],
    },
  });

  await request(`${repoBase(config)}/git/refs/heads/${encodePath(config.branch)}`, {
    token,
    method: "PATCH",
    body: { sha: commit.sha, force: false },
  });

  return {
    commitSha: commit.sha,
    commitUrl: `https://github.com/${config.repo}/commit/${commit.sha}`,
    entry: nextEntry,
    manifest: remote.manifest,
  };
}

export { GitHubError };
