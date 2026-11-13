// Builds the POST /add body documented in REST-API.yml and accepted by
// integration/server (legacy JSON array of { link, headers, downloadPage }).

export const DEFAULT_PORT = 15151;
export const MENU_ID = "download-with-solosgame-idm";
export const MENU_TITLE = "Download with SolosGame IDM";

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
