import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { MENU_TITLE, handleContextMenuClick } from "../request.js";

const manifest = JSON.parse(
  fs.readFileSync(new URL("../manifest.json", import.meta.url), "utf8"),
);

test("manifest is Manifest V3 for SolosGame IDM Integration", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "SolosGame IDM Integration");
  assert.equal(manifest.background.service_worker, "background.js");
  assert.equal(manifest.background.type, "module");
  assert.ok(manifest.permissions.includes("contextMenus"));
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
