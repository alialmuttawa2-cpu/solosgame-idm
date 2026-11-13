import {
  DEFAULT_PORT,
  DOWNLOAD_CHOICE,
  MENU_ID,
  MENU_TITLE,
  PROMPT_TIMEOUT_MS,
  buildDownloadHandoff,
  classifyDownload,
  decideAfterPrompt,
  handleContextMenuClick,
  planHandoff,
  skipDownloadReason,
} from "./request.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: MENU_TITLE,
    contexts: ["link", "image", "video", "audio", "selection"],
  });
});

async function showFailure(message) {
  const text = message || "SolosGame IDM is not running.";
  await chrome.action.setBadgeBackgroundColor({ color: "#b00020" });
  await chrome.action.setBadgeText({ text: "!" });
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon.png",
      title: "SolosGame IDM",
      message: text,
    });
  } catch {
    // The badge still shows when notifications are blocked.
  }
}

async function clearFailure() {
  await chrome.action.setBadgeText({ text: "" });
}

async function postAdd(request) {
  const response = await fetch(request.endpoint, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(request.body),
  });
  const text = (await response.text()).trim();
  if (!response.ok || text !== "OK") {
    throw new Error(text || `SolosGame IDM returned HTTP ${response.status}`);
  }
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  const stored = await chrome.storage.sync.get({
    port: DEFAULT_PORT,
    apiKey: "",
  });
  const preliminary = handleContextMenuClick(info, {
    port: stored.port,
    apiKey: stored.apiKey,
    cookies: [],
  });
  if (!preliminary.ok) {
    if (preliminary.reason === "not-a-url") {
      await showFailure("That item is not an http(s) URL.");
    }
    return;
  }

  let cookies = [];
  try {
    cookies = await chrome.cookies.getAll({ url: preliminary.request.body[0].link });
  } catch {
    cookies = [];
  }

  const result = handleContextMenuClick(info, {
    port: stored.port,
    apiKey: stored.apiKey,
    cookies,
  });
  try {
    await postAdd(result.request);
    await clearFailure();
  } catch (error) {
    await showFailure(
      error?.message || "Could not reach SolosGame IDM. Is the app running?",
    );
  }
});

const downloads = new Map();

function callSuggests(entry) {
  const suggests = entry.suggests || [];
  entry.suggests = [];
  for (const suggest of suggests) {
    try {
      suggest();
    } catch {
      // The filename callback may already be settled.
    }
  }
}

function releaseToChrome(entry) {
  if (entry.released) return;
  entry.released = true;
  callSuggests(entry);
  if (entry.paused) {
    chrome.downloads.resume(entry.item.id, () => chrome.runtime.lastError);
  }
}

function cancelChromeDownload(entry) {
  if (entry.released) return;
  entry.released = true;
  chrome.downloads.cancel(entry.item.id, () => {
    chrome.downloads.erase({ id: entry.item.id });
    callSuggests(entry);
  });
}

async function handoffToIdm(entry) {
  const stored = await chrome.storage.sync.get({
    port: DEFAULT_PORT,
    apiKey: "",
  });
  const url = entry.item.finalUrl || entry.item.url;
  let cookies = [];
  try {
    cookies = await chrome.cookies.getAll({ url });
  } catch {
    cookies = [];
  }
  const request = buildDownloadHandoff(entry.item, {
    port: stored.port,
    apiKey: stored.apiKey,
    cookies,
  });
  let ok = false;
  if (request) {
    try {
      await postAdd(request);
      ok = true;
    } catch {
      ok = false;
    }
  }
  const plan = planHandoff({ ok, alreadyCancelled: entry.cancelled });
  if (plan.cancelChrome) {
    await clearFailure();
    cancelChromeDownload(entry);
    return;
  }
  if (plan.resumeChrome) releaseToChrome(entry);
  if (plan.restartChrome) {
    chrome.downloads.download({ url, conflictAction: "uniquify" });
  }
  if (plan.notice) await showFailure(plan.notice);
}

function closePrompt(entry) {
  if (!entry.windowId) return;
  chrome.windows.remove(entry.windowId, () => chrome.runtime.lastError);
  entry.windowId = null;
}

async function finishPrompt(entry, choice, remember, timedOut) {
  if (entry.settled) return;
  entry.settled = true;
  clearTimeout(entry.timer);
  closePrompt(entry);
  const decision = decideAfterPrompt({ choice, remember, timedOut });
  if (decision.saveMode) {
    await chrome.storage.sync.set({ downloadChoice: decision.saveMode });
  }
  if (decision.action === "idm") {
    await handoffToIdm(entry);
  } else {
    releaseToChrome(entry);
  }
}

function askUser(entry) {
  entry.timer = setTimeout(() => {
    void finishPrompt(entry, "chrome", false, true);
  }, PROMPT_TIMEOUT_MS);
  chrome.windows.create(
    {
      url: chrome.runtime.getURL(`prompt.html?id=${entry.item.id}`),
      type: "popup",
      width: 420,
      height: 280,
      focused: true,
    },
    (win) => {
      if (chrome.runtime.lastError || !win) {
        void finishPrompt(entry, "chrome", false, true);
        return;
      }
      entry.windowId = win.id;
    },
  );
}

async function considerDownload(entry) {
  if (skipDownloadReason(entry.item, chrome.runtime.id)) {
    releaseToChrome(entry);
    return;
  }
  const stored = await chrome.storage.sync.get({
    downloadChoice: DOWNLOAD_CHOICE.ASK,
  });
  const decision = classifyDownload(entry.item, {
    mode: stored.downloadChoice,
    ownExtensionId: chrome.runtime.id,
  });
  if (decision.action === "chrome") {
    releaseToChrome(entry);
    return;
  }
  if (!entry.suggests?.length) {
    chrome.downloads.pause(entry.item.id, () => {
      entry.paused = !chrome.runtime.lastError;
    });
  }
  if (decision.action === "idm") {
    await handoffToIdm(entry);
    return;
  }
  askUser(entry);
}

function trackDownload(item, suggest) {
  let entry = downloads.get(item.id);
  if (!entry) {
    entry = {
      item,
      suggests: suggest ? [suggest] : [],
      paused: false,
      released: false,
      settled: false,
    };
    downloads.set(item.id, entry);
    void considerDownload(entry);
    return;
  }
  entry.item = { ...entry.item, ...item };
  if (suggest) {
    if (entry.released) {
      try {
        suggest();
      } catch {
        // Already released.
      }
    } else {
      entry.suggests.push(suggest);
    }
  }
}

chrome.downloads.onCreated.addListener((item) => {
  trackDownload(item, null);
});

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  trackDownload(item, suggest);
  if (downloads.get(item.id)?.released) return;
  return true;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "prompt-info") {
    const entry = downloads.get(Number(message.id));
    sendResponse({
      url: entry?.item?.finalUrl || entry?.item?.url || "",
      filename: entry?.item?.filename || "",
    });
    return true;
  }
  if (message?.type === "download-choice") {
    const entry = downloads.get(Number(message.id));
    if (entry) void finishPrompt(entry, message.choice, Boolean(message.remember), false);
    sendResponse({ ok: Boolean(entry) });
    return true;
  }
  return false;
});
