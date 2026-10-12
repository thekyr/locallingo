# AMO Store Listing — LocalLingo

Copy each section into the matching field at
addons.mozilla.org → Developer Hub → Submit/Edit → "Listed" listing.

---

## Add-on name
LocalLingo — Local AI Translator

## Summary
*(max 250 characters — shown in search results)*

Translate selected text and web pages with your own AI model via Ollama or any OpenAI-compatible server, on your machine or your network. No cloud, no API keys: your text goes only to the server you run.

## Categories
- Primary: **Language support / Translate**
- Secondary: **Privacy & Security** (optional)

## Tags
`translation`, `translate`, `ollama`, `local-ai`, `privacy`, `llm`, `offline`

## Support email
tkyriakidis@gmail.com

## Support site / homepage
https://github.com/thekyr/locallingo

---

## Screenshots
*(Developer Hub → Edit Product Page → Screenshots. PNG/JPG; AMO recommends ~1280×800, max 4MB each. First screenshot is the thumbnail shown in search.)*

Capture these on **Firefox Desktop** (the add-on is Desktop-only since 1.1.3):

1. **Selection translation bubble** — select a paragraph of foreign-language text, right-click → "Translate selection", and capture the floating translation bubble (with the Copy button visible).
2. **Full-page translation in progress** — click the toolbar icon → choose a target language → "Translate Page", and capture the page with the live progress overlay mid-translation.
3. **Toolbar popup** — the popup open, showing "Server online", the target-language picker, and the Translate Page button.
4. **Options / settings page** — the model server configuration (API type, server URL, model name, chunk size, system prompt).

Notes:
- Use a real page (e.g. a news article or docs page) so the before/after translation is obvious.
- Make sure the new LocalLingo icon is visible in the toolbar for the popup shot.
- Crop out unrelated browser chrome, bookmarks, and personal tabs/URLs.
- Keep it to 3–4 clean screenshots; the first one is the most important since it's the listing thumbnail.

---

## Description
*(shown on the listing page — supports basic formatting)*

**LocalLingo uses your own AI model — run with Ollama (or any OpenAI-compatible
server) — to translate pages and selected text.** It bundles no AI model and
contacts no service of its own: translation requests go only to the server you
configure, by default `http://localhost:11434` on your machine, or a host you
run on your network. Nothing is sent to a cloud service, there are no API keys to
manage, and the text you read stays private.

It connects to a local model server — **Ollama**, LM Studio, Jan.ai, llama.cpp, or
any OpenAI-compatible endpoint — and uses it to translate pages and selections on
demand.

**Features**

• Translate selected text — right-click any selection for an instant floating
  translation bubble with a one-click Copy button.
• Translate whole pages — one click replaces the page text in place, with a live
  progress overlay.
• Fully local & private — your text is only ever sent to the model server you run,
  never to the extension author or a third party.
• Your own server, anywhere on your network — point it at Ollama on a LAN box,
  container, or VM. Access to that host is requested only when you save it.
• Works with any local backend — Ollama out of the box, or switch to an
  OpenAI-compatible server (LM Studio, Jan.ai, llama.cpp).
• Pick any model and any target language; your last language is remembered.
• Customizable system prompt and chunk size for tuning quality vs. speed.

**Requirements**

A local model server must be running. The quickest path is Ollama
(https://ollama.com):

1. Install Ollama and pull a model, e.g. `ollama pull qwen2.5:3b`.
2. Allow the extension to reach it by setting `OLLAMA_ORIGINS="*"` and restarting
   Ollama (on Windows: `setx OLLAMA_ORIGINS "*"`, then quit and relaunch the tray
   app). Without this, Ollama returns 403 and translations fail.
3. Open the LocalLingo toolbar popup, confirm "Server online", and translate.

Running Ollama on another machine? Set the Server URL in Settings (e.g.
`http://192.168.1.50:11434`) and accept Firefox's prompt to allow that host. On
the server, set `OLLAMA_HOST=0.0.0.0` and `OLLAMA_ORIGINS`, and pull the model
there.

Full setup and troubleshooting instructions are in the project README.

**Privacy**

LocalLingo is granted `http://localhost` / `http://127.0.0.1` at install, for a
model server on your machine. If you point it at another machine, it asks for
access to that one host only, at the moment you save the setting; it never
requests access to all sites, and you can revoke it in Add-ons → Permissions.
It collects no analytics and transmits no data to any third party.

---

## Privacy policy text (if AMO requests one)

LocalLingo does not collect, store, or transmit any personal data. All text to be
translated is sent only to the model server configured by the user (default:
http://localhost:11434, or another host the user runs and explicitly grants
access to) and is never sent to the extension author or any
third-party service. The extension stores its settings (server URL, model name,
target language, system prompt) locally in the browser via the storage API.

---

## Reviewer notes (private — "Notes for reviewer" field)

This extension has no bundled or remote AI; it is a client for a user-run local
model server. To test:

1. Install Ollama (https://ollama.com) and run `ollama pull mistral`.
2. Start it with the browser origin allowed: `OLLAMA_ORIGINS="*" ollama serve`.
3. Default server URL is http://localhost:11434 (configurable in the options page).
4. Toolbar popup → "Translate Page" translates the active tab; right-click a text
   selection → "Translate selection" shows a translation bubble.

About `optional_permissions` (`http://*/*`, `https://*/*`, added in 1.1.4): they
exist so the user can run the model server on another machine on their network.
They are never granted at install. When the user saves a non-localhost Server URL,
the options page calls `permissions.request` for that single origin
(`<scheme>://<host>/*`) only; the background script checks the grant with
`permissions.contains` before each request. Localhost needs no prompt.

No source build step is required — the package is plain JS/HTML/CSS with no
minification or bundler.
