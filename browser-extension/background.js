import {
  DEFAULT_PORT,
  MENU_ID,
  MENU_TITLE,
  handleContextMenuClick,
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
  const request = result.request;
  try {
    const response = await fetch(request.endpoint, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
    });
    const text = (await response.text()).trim();
    if (!response.ok || text !== "OK") {
      throw new Error(text || `SolosGame IDM returned HTTP ${response.status}`);
    }
    await clearFailure();
  } catch (error) {
    await showFailure(
      error?.message || "Could not reach SolosGame IDM. Is the app running?",
    );
  }
});
