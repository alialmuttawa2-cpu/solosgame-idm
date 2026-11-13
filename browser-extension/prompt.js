const params = new URLSearchParams(location.search);
const id = Number(params.get("id"));

chrome.runtime.connect({ name: "download-prompt" });

chrome.runtime.sendMessage({ type: "prompt-info", id }, (info) => {
  const url = info?.filename || info?.url || "";
  document.getElementById("url").textContent = url;
});

function choose(choice) {
  const remember = document.getElementById("remember").checked;
  chrome.runtime.sendMessage({ type: "download-choice", id, choice, remember }, () => {
    window.close();
  });
}

document.getElementById("idm").addEventListener("click", () => choose("idm"));
document.getElementById("chrome").addEventListener("click", () => choose("chrome"));
