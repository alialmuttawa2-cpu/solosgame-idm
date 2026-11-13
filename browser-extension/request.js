// Builds the POST /add body documented in REST-API.yml and accepted by
// integration/server (legacy JSON array of { link, headers, downloadPage }).

export const DEFAULT_PORT = 15151;
export const MENU_ID = "download-with-solosgame-idm";
export const MENU_TITLE = "Download with SolosGame IDM";
export const PROMPT_TIMEOUT_MS = 30_000;
export const DOWNLOAD_CHOICE = {
  ASK: "ask",
  IDM: "idm",
  CHROME: "chrome",
};

const SKIPPED_SCHEMES = new Set(["blob", "data", "file"]);

export function downloadUrlOf(item) {
  const raw = item?.finalUrl || item?.url || "";
  return typeof raw === "string" ? raw.trim() : "";
}

function schemeOf(url) {
  const index = url.indexOf(":");
  if (index <= 0) return "";
  return url.slice(0, index).toLowerCase();
}

export function skipDownloadReason(item, ownExtensionId) {
  if (ownExtensionId && item?.byExtensionId === ownExtensionId) {
    return "self-triggered";
  }
  const url = downloadUrlOf(item);
  if (!url) return "skipped-scheme";
  const scheme = schemeOf(url);
  if (SKIPPED_SCHEMES.has(scheme) || (scheme !== "http" && scheme !== "https")) {
    return "skipped-scheme";
  }
  return null;
}

export function classifyDownload(item, { mode = DOWNLOAD_CHOICE.ASK, ownExtensionId } = {}) {
  const skipped = skipDownloadReason(item, ownExtensionId);
  if (skipped) return { action: "chrome", reason: skipped };
  if (mode === DOWNLOAD_CHOICE.CHROME) {
    return { action: "chrome", reason: "always-chrome" };
  }
  if (mode === DOWNLOAD_CHOICE.IDM) {
    return { action: "idm", reason: "always-idm" };
  }
  return { action: "ask", reason: "ask" };
}

export function decideAfterPrompt({ choice, remember, timedOut }) {
  if (timedOut || choice !== "idm") {
    return {
      action: "chrome",
      saveMode: !timedOut && remember ? DOWNLOAD_CHOICE.CHROME : null,
      timedOut: Boolean(timedOut),
    };
  }
  return {
    action: "idm",
    saveMode: remember ? DOWNLOAD_CHOICE.IDM : null,
    timedOut: false,
  };
}

export function planHandoff({ ok, alreadyCancelled = false }) {
  if (ok) {
    return {
      cancelChrome: true,
      resumeChrome: false,
      restartChrome: false,
      notice: null,
    };
  }
  return {
    cancelChrome: false,
    resumeChrome: !alreadyCancelled,
    restartChrome: Boolean(alreadyCancelled),
    notice: "SolosGame IDM is not running. The download will continue in Chrome.",
  };
}

export function buildDownloadHandoff(item, settings) {
  const downloadUrl = normalizeHttpUrl(downloadUrlOf(item));
  if (!downloadUrl) return null;
  return buildAddRequest({
    downloadUrl,
    pageUrl: item?.referrer,
    cookies: settings?.cookies,
    port: settings?.port,
    apiKey: settings?.apiKey,
  });
}

export function normalizeHttpUrl(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function pickDownloadUrl(info) {
  const candidates = [info?.linkUrl, info?.srcUrl, info?.selectionText];
  for (const candidate of candidates) {
    const url = normalizeHttpUrl(candidate);
    if (url) return url;
  }
  return null;
}

export function cookieHeader(cookies) {
  if (!Array.isArray(cookies) || cookies.length === 0) return null;
  const parts = cookies
    .filter((cookie) => cookie && cookie.name)
    .map((cookie) => `${cookie.name}=${cookie.value ?? ""}`);
  return parts.length ? parts.join("; ") : null;
}

export function buildAddRequest({ downloadUrl, pageUrl, cookies, port, apiKey }) {
  const headers = {};
  const referrer = normalizeHttpUrl(pageUrl);
  if (referrer) headers.Referer = referrer;
  const cookie = cookieHeader(cookies);
  if (cookie) headers.Cookie = cookie;

  const item = { link: downloadUrl };
  if (Object.keys(headers).length > 0) item.headers = headers;
  if (referrer) item.downloadPage = referrer;

  const resolvedPort = Number(port) || DEFAULT_PORT;
  const requestHeaders = { "Content-Type": "application/json" };
  if (apiKey) requestHeaders["X-Api-Key"] = apiKey;

  return {
    endpoint: `http://127.0.0.1:${resolvedPort}/add`,
    headers: requestHeaders,
    body: [item],
  };
}

export function handleContextMenuClick(info, settings) {
  if (info?.menuItemId && info.menuItemId !== MENU_ID) {
    return { ok: false, reason: "ignored" };
  }
  const downloadUrl = pickDownloadUrl(info);
  if (!downloadUrl) {
    return { ok: false, reason: "not-a-url" };
  }
  return {
    ok: true,
    request: buildAddRequest({
      downloadUrl,
      pageUrl: info.pageUrl,
      cookies: settings?.cookies,
      port: settings?.port,
      apiKey: settings?.apiKey,
    }),
  };
}
