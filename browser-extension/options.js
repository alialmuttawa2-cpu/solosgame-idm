const DEFAULT_PORT = 15151;
const portInput = document.getElementById("port");
const apiKeyInput = document.getElementById("apiKey");
const status = document.getElementById("status");

chrome.storage.sync.get({ port: DEFAULT_PORT, apiKey: "" }, (items) => {
  portInput.value = String(items.port ?? DEFAULT_PORT);
  apiKeyInput.value = items.apiKey || "";
});

document.getElementById("save").addEventListener("click", () => {
  const port = Number(portInput.value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    status.textContent = "Port must be an integer from 1 to 65535.";
    return;
  }
  chrome.storage.sync.set({ port, apiKey: apiKeyInput.value.trim() }, () => {
    status.textContent = "Saved.";
  });
});
