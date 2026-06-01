# AMO Store Listing — LocalLingo

Copy each section into the matching field at
addons.mozilla.org → Developer Hub → Submit/Edit → "Listed" listing.

---

## Add-on name
LocalLingo — AI Page Translator

## Summary
*(max 250 characters — shown in search results)*

Translate web pages and selected text with a local AI model. Runs entirely on your machine via Ollama or any OpenAI-compatible server — no cloud APIs, no API keys, and your text never leaves your computer.

## Categories
- Primary: **Language support / Translate**
- Secondary: **Privacy & Security** (optional)

## Tags
`translation`, `translate`, `ollama`, `local-ai`, `privacy`, `llm`, `offline`

## Support email
tkyriakidis@gmail.com

## Support site / homepage
https://github.com/<your-org>/locallingo  *(update to the real repo URL)*

---

## Description
*(shown on the listing page — supports basic formatting)*

**LocalLingo translates the web using an AI model running on your own machine.**
Nothing is sent to a cloud service, there are no API keys to manage, and the text
you read stays completely private.

It connects to a local model server — **Ollama**, LM Studio, Jan.ai, llama.cpp, or
any OpenAI-compatible endpoint — and uses it to translate pages and selections on
demand.

**Features**

• Translate selected text — right-click any selection for an instant floating
  translation bubble with a one-click Copy button.
• Translate whole pages — one click replaces the page text in place, with a live
  progress overlay.
• Fully local & private — your text is only ever sent to the model server you run;
  it never leaves your device.
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

Full setup and troubleshooting instructions are in the project README.

**Privacy**

LocalLingo requires permission to talk to `http://localhost` / `http://127.0.0.1`
only — that is your local model server. It collects no analytics and transmits no
data to any third party.

---

## Privacy policy text (if AMO requests one)

LocalLingo does not collect, store, or transmit any personal data. All text to be
translated is sent only to the local model server configured by the user
(default: http://localhost:11434) and is never sent to the extension author or any
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

No source build step is required — the package is plain JS/HTML/CSS with no
minification or bundler.
