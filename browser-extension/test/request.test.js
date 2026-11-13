import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  MENU_TITLE,
  buildDownloadHandoff,
  classifyDownload,
  decideAfterPrompt,
  handleContextMenuClick,
  planHandoff,
} from "../request.js";

const manifest = JSON.parse(
  fs.readFileSync(new URL("../manifest.json", import.meta.url), "utf8"),
);

test("manifest is Manifest V3 for SolosGame IDM Integration", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "SolosGame IDM Integration");
  assert.equal(manifest.background.service_worker, "background.js");
  assert.equal(manifest.background.type, "module");
  assert.ok(manifest.permissions.includes("contextMenus"));
  assert.ok(manifest.permissions.includes("downloads"));
  assert.ok(fs.existsSync(new URL("../icons/icon.png", import.meta.url)));
});

test("context menu handler builds POST /add for a link", () => {
  const result = handleContextMenuClick(
    {
      menuItemId: "download-with-solosgame-idm",
      linkUrl: "https://example.com/file.zip",
      srcUrl: "https://cdn.example.com/thumb.png",
      pageUrl: "https://example.com/watch",
      selectionText: "not a url",
    },
    {
      port: 15151,
      apiKey: "",
      cookies: [
        { name: "session", value: "abc" },
        { name: "theme", value: "dark" },
      ],
    },
  );

  assert.equal(result.ok, true);
  assert.equal(MENU_TITLE, "Download with SolosGame IDM");
  assert.equal(result.request.endpoint, "http://127.0.0.1:15151/add");
  assert.equal(result.request.headers["Content-Type"], "application/json");
  assert.equal(result.request.headers["X-Api-Key"], undefined);
  assert.deepEqual(result.request.body, [
    {
      link: "https://example.com/file.zip",
      headers: {
        Referer: "https://example.com/watch",
        Cookie: "session=abc; theme=dark",
      },
      downloadPage: "https://example.com/watch",
    },
  ]);
});

test("image and selection fall back when there is no link", () => {
  const image = handleContextMenuClick(
    {
      srcUrl: "https://cdn.example.com/clip.mp4",
      pageUrl: "https://example.com/gallery",
    },
    { port: 15151, cookies: [] },
  );
  assert.equal(image.request.body[0].link, "https://cdn.example.com/clip.mp4");

  const selection = handleContextMenuClick(
    { selectionText: "  https://files.example.com/a.bin  " },
    { port: 9090 },
  );
  assert.equal(selection.request.endpoint, "http://127.0.0.1:9090/add");
  assert.deepEqual(selection.request.body, [
    { link: "https://files.example.com/a.bin" },
  ]);
});

test("non-urls are rejected and an api key is sent as X-Api-Key", () => {
  const rejected = handleContextMenuClick(
    { selectionText: "hello world" },
    { port: 15151 },
  );
  assert.deepEqual(rejected, { ok: false, reason: "not-a-url" });

  const authed = handleContextMenuClick(
    { linkUrl: "https://example.com/file.zip" },
    { port: 15151, apiKey: "secret-key" },
  );
  assert.equal(authed.request.headers["X-Api-Key"], "secret-key");
});

test("download choice is ask, always IDM, or always Chrome", () => {
  const item = { url: "https://cdn.example.com/file.zip", finalUrl: "https://cdn.example.com/file.zip" };
  assert.deepEqual(classifyDownload(item, { mode: "ask" }), { action: "ask", reason: "ask" });
  assert.deepEqual(classifyDownload(item, { mode: "idm" }), { action: "idm", reason: "always-idm" });
  assert.deepEqual(classifyDownload(item, { mode: "chrome" }), {
    action: "chrome",
    reason: "always-chrome",
  });
});

test("blob, data, and file downloads, and our own downloads, stay in Chrome", () => {
  for (const url of ["blob:https://example.com/id", "data:text/plain,hi", "file:///tmp/a.bin"]) {
    assert.equal(classifyDownload({ url }, { mode: "idm" }).reason, "skipped-scheme");
  }
  assert.equal(
    classifyDownload(
      { url: "https://example.com/a.bin", byExtensionId: "ext" },
      { mode: "ask", ownExtensionId: "ext" },
    ).reason,
    "self-triggered",
  );
});

test("prompt timeout defaults to Chrome and remember stores the choice", () => {
  assert.deepEqual(decideAfterPrompt({ choice: "idm", remember: true, timedOut: true }), {
    action: "chrome",
    saveMode: null,
    timedOut: true,
  });
  assert.deepEqual(decideAfterPrompt({ choice: "idm", remember: true, timedOut: false }), {
    action: "idm",
    saveMode: "idm",
    timedOut: false,
  });
  assert.deepEqual(decideAfterPrompt({ choice: "chrome", remember: true, timedOut: false }), {
    action: "chrome",
    saveMode: "chrome",
    timedOut: false,
  });
  assert.equal(decideAfterPrompt({ choice: "idm", remember: false, timedOut: false }).saveMode, null);
});

test("IDM handoff uses the final URL and falls back when the app is down", () => {
  const request = buildDownloadHandoff(
    {
      url: "https://example.com/start",
      finalUrl: "https://cdn.example.com/final.bin",
      referrer: "https://example.com/page",
    },
    { port: 15151, cookies: [{ name: "sid", value: "1" }] },
  );
  assert.equal(request.body[0].link, "https://cdn.example.com/final.bin");
  assert.equal(request.body[0].downloadPage, "https://example.com/page");
  assert.equal(request.body[0].headers.Cookie, "sid=1");

  assert.deepEqual(planHandoff({ ok: true }), {
    cancelChrome: true,
    resumeChrome: false,
    restartChrome: false,
    notice: null,
  });
  const fallback = planHandoff({ ok: false });
  assert.equal(fallback.cancelChrome, false);
  assert.equal(fallback.resumeChrome, true);
  assert.match(fallback.notice, /continue in Chrome/);
  assert.equal(planHandoff({ ok: false, alreadyCancelled: true }).restartChrome, true);
});
