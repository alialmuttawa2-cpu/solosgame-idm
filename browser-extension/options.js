const DEFAULT_PORT = 15151;
const portInput = document.getElementById("port");
const apiKeyInput = document.getElementById("apiKey");
const status = document.getElementById("status");

chrome.storage.sync.get(
  { port: DEFAULT_PORT, apiKey: "", downloadChoice: "ask" },
  (items) => {
    portInput.value = String(items.port ?? DEFAULT_PORT);
    apiKeyInput.value = items.apiKey || "";
    const choice = items.downloadChoice || "ask";
    const radio = document.querySelector(`input[name="downloadChoice"][value="${choice}"]`);
    if (radio) radio.checked = true;
  },
);

document.getElementById("save").addEventListener("click", () => {
  const port = Number(portInput.value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    status.textContent = "Port must be an integer from 1 to 65535.";
    return;
  }
  const selected = document.querySelector('input[name="downloadChoice"]:checked');
  chrome.storage.sync.set(
    {
      port,
      apiKey: apiKeyInput.value.trim(),
      downloadChoice: selected ? selected.value : "ask",
    },
    () => {
      status.textContent = "Saved.";
    },
  );
});
