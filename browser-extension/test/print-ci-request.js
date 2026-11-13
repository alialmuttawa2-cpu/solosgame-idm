import { handleContextMenuClick } from "../request.js";

const result = handleContextMenuClick(
  {
    menuItemId: "download-with-solosgame-idm",
    linkUrl: "https://example.com/solosgame-idm-ci-test.bin",
    pageUrl: "https://example.com/page",
  },
  { port: 15151, apiKey: "", cookies: [{ name: "ci", value: "1" }] },
);

if (!result.ok) {
  throw new Error("sample request was not built");
}

process.stdout.write(JSON.stringify({
  endpoint: result.request.endpoint,
  body: JSON.stringify(result.request.body),
}));
