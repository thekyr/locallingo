# 🌐 LocalLingo — AI Page Translator for Firefox

A Firefox extension that translates web pages and selected text using a **locally running AI model** — no cloud APIs, no data leaving your machine, no API keys.

Built for developers, sysadmins, and anyone who reads technical content in foreign languages.

---

## Features

- **Translate selected text** — right-click any selection → instant floating translation bubble
- **Translate full pages** — one click to replace all text on the page in place
- **Fully local** — works with [Ollama](https://ollama.com), LM Studio, Jan.ai, or any OpenAI-compatible local server
- **Your own server, anywhere on your network** — point it at Ollama on a LAN box, container, or VM; access is granted per host, only when you ask for it
- **Preserves technical terms** — DevOps, sysadmin, and programming terms are never translated (docker, kubectl, nginx, etc.)
- **Smart chunking** — long texts are split at paragraph/sentence boundaries and reassembled
- **Progress indicator** — live overlay shows translation progress for both selections and full pages
- **Copy button** — one click to copy translated text from the bubble

---

## Requirements

- Firefox 142 or later (Desktop)
- [Ollama](https://ollama.com) running locally or on a machine you control on your network — or any OpenAI-compatible server (LM Studio, Jan.ai, llama.cpp)

---

## Installation

There are two parts: a **local model** (steps 1–3) and the **extension** (step 4).

### 1. Install Ollama

**macOS (recommended — uses Metal GPU)**

```bash
brew install ollama
```

Or download from [ollama.com](https://ollama.com).

> **Apple Silicon users:** Run Ollama natively, not in Docker. Native Ollama uses the Neural Engine and is ~10x faster than CPU-only Docker.

**Linux / Docker**

```bash
docker run -d \
  --name ollama \
  -e OLLAMA_ORIGINS="*" \
  -p 11434:11434 \
  -v ollama:/root/.ollama \
  ollama/ollama
```

### 2. Pull a model

```bash
ollama pull qwen2.5:3b     # recommended — fast, good quality (~1.9GB)
ollama pull mistral        # alternative — strong European language support (~4GB)
ollama pull aya-expanse    # best multilingual quality, 23 languages (~4GB)
```

### 3. Allow the extension to reach Ollama (`OLLAMA_ORIGINS`)

Ollama blocks requests coming from a browser origin by default, so the extension
**must** be allow-listed or every translation fails with `403 Forbidden`. Set
`OLLAMA_ORIGINS` to `*` (or your `moz-extension://…` origin) and restart Ollama.

**macOS / Linux (manual run)**

```bash
OLLAMA_ORIGINS="*" ollama serve
```

To make it permanent, add `export OLLAMA_ORIGINS="*"` to `~/.zshrc` (macOS) or use
`systemctl edit ollama` and add `Environment="OLLAMA_ORIGINS=*"` (Linux systemd),
then `systemctl restart ollama`.

**Windows**

Ollama runs as a tray app and reads a *user* environment variable. In PowerShell:

```powershell
setx OLLAMA_ORIGINS "*"
```

Then **fully quit Ollama** (right-click the tray icon → *Quit Ollama*) and relaunch
it from the Start menu — `setx` only applies to processes started afterwards.

> Verify it worked from a terminal (this bypasses the browser origin check):
> ```bash
> curl http://localhost:11434/api/generate -d '{"model":"mistral","prompt":"hi","stream":false}'
> ```
> A JSON response (not `403`) means Ollama is reachable and the model exists.

### 4. Install the extension

**Recommended — from Firefox Add-ons:**

[**➜ Install LocalLingo**](https://addons.mozilla.org/firefox/addon/3b257f3a6bd84707bad7/) from addons.mozilla.org. Signed and auto-updating.

**From source (development):**

1. Go to `about:debugging` in Firefox
2. Click **"This Firefox"** → **"Load Temporary Add-on…"**
3. Navigate to `fx-local-translator/` and select `manifest.json`

See [CONTRIBUTING.md](CONTRIBUTING.md) for building, packaging, and signing your own `.xpi`.

---

## Usage

### Translate selected text

1. Select any text on a page
2. Right-click → **"Translate selection"**
3. A floating bubble appears with the translation
4. Click **copy** to copy, **×** or press `Escape` to dismiss

### Translate a full page

1. Click the 🌐 **LocalLingo** toolbar icon
2. Choose your target language
3. Click **Translate Page**
4. A progress overlay appears — text is replaced in place as it translates

### Change the model or language

- Click ⚙️ in the popup or **"Configure model server"** at the bottom
- The last selected language is remembered between sessions

---

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| API Type | Ollama | Switch to "OpenAI-compatible" for LM Studio, Jan.ai, llama.cpp |
| Server URL | `http://localhost:11434` | URL of your model server: local, or another host (see below) |
| Model Name | `mistral` | Any model you have installed |
| Chunk size | `1500` chars | How much text is sent per request — larger = more context, slower |
| System Prompt | (see below) | Instructions sent to the model before each translation |

### Using a server on another machine

The Server URL can point at Ollama on another host (a LAN box, a Proxmox
container, a VM), for example `http://192.168.1.50:11434`. Four things must be
in place:

1. **Extension permission.** When you click **Save** or **Test connection** with a
   non-localhost URL, Firefox asks to let LocalLingo access that host. Allow it.
   If you decline, the settings are not saved; if the permission is missing later,
   the popup says `No permission for <host>` instead of translating. You can
   revoke it any time in `about:addons` → LocalLingo → *Permissions*.
2. **Ollama listens on the network.** By default it binds to `127.0.0.1` only. Set
   `OLLAMA_HOST=0.0.0.0` on the server (e.g. `systemctl edit ollama` →
   `Environment="OLLAMA_HOST=0.0.0.0"`) and restart it.
3. **`OLLAMA_ORIGINS`** is set as in step 3, on the server.
4. **The model is pulled on that server.** Models live on the machine running
   Ollama, so `ollama pull qwen2.5:3b` there, not on your PC.

**Test connection** only lists models, and that request passes Ollama's origin
check even when translation requests do not. So it can show *Connected* while
translating still fails with `403`. Check what a translation request will get,
from your machine:

```bash
curl -i -H "Origin: moz-extension://test" http://<server-ip>:11434/api/generate -d '{"model":"qwen2.5:3b","prompt":"hi","stream":false}'
```

`200` means it works; `403` means `OLLAMA_ORIGINS` is not set on the server; `404`
means the model is not pulled there.

### Recommended models by use case

| Model | Size | Best for |
| --- | --- | --- |
| `qwen2.5:3b` | 1.9 GB | Speed, Asian languages |
| `qwen2.5:7b` | 4.7 GB | Quality + speed balance |
| `mistral` | 4.1 GB | European languages |
| `aya-expanse` | 4.0 GB | Best multilingual quality, 23 languages |
| `llama3.1:8b` | 4.7 GB | Strong general translator |

---

## Troubleshooting

**"Server offline" in the popup**

- Make sure Ollama is running: `ollama serve`
- Check it's reachable: open `http://localhost:11434` in a browser tab

**403 Forbidden errors**

- Ollama is blocking requests from the browser extension
- macOS/Linux: restart with `OLLAMA_ORIGINS="*" ollama serve`
- Windows: run `setx OLLAMA_ORIGINS "*"`, then quit Ollama from the system tray and relaunch it
- See [step 3](#3-allow-the-extension-to-reach-ollama-ollama_origins) for permanent setup
- Remote server: set `OLLAMA_ORIGINS` on **the server**, not your PC (see [Using a server on another machine](#using-a-server-on-another-machine))

**`No permission for <host>`**

- The Server URL points at another machine and LocalLingo has not been granted access to it
- Open Settings and click **Save** (or **Test connection**), then accept Firefox's prompt

**`Ollama 404` with a remote server**

- The model is not on that server: run `ollama list` there and `ollama pull <model>` if it is missing

**Translation fails on all blocks**

- Open `about:debugging` → your extension → Inspect → Console for the real error
- Verify the model name in Settings matches exactly what `ollama list` shows

**Slow translation**

- Use a smaller model (`qwen2.5:3b` instead of `mistral`)
- On Apple Silicon, make sure you're running Ollama natively (not in Docker)
- Reduce the chunk size in Settings for faster but less context-aware chunks

**Model name shows "mistral" after changing it**

- Close and reopen the popup — it reads fresh settings on every open

---

## Privacy

Text is sent only to the model server you configure, and nowhere else: by default the one on your own machine. Nothing goes to the extension author or any third-party service.

The extension requires `http://localhost/*` and `http://127.0.0.1/*` to talk to a local server. If you point it at another machine, it asks for access to **that one host only**, at the moment you save the setting. It never requests access to all sites.

---

## Changelog

### 1.1.4

- **Use an Ollama server on another machine.** The Server URL can now point at a LAN host, container, or VM (e.g. `http://192.168.1.50:11434`). Previously the extension could only reach `localhost`, so a remote server was reported as offline.
- Access to a remote server is an **optional permission, requested per host** when you click Save or Test connection. Nothing new is granted at install, and localhost works as before with no prompt.
- Clearer errors: a missing permission shows `No permission for <host>` instead of "Server offline", and the settings page rejects malformed or non-http(s) URLs.
- README: setup guide and troubleshooting for remote servers (`OLLAMA_HOST`, `OLLAMA_ORIGINS`, pulling the model on the server).

### 1.1.3

- New **LocalLingo logo** across the toolbar icon, popup, and settings page (replaces the previous placeholder icon and globe emoji).
- Now **Firefox Desktop only**; requires Firefox 142+. Android support was removed because the add-on connects to a local model server on `localhost`, which is not reachable from Firefox for Android.
- Raised `strict_min_version` to 142 so `data_collection_permissions` is supported (resolves an AMO validation warning).
- No changes to translation behavior or privacy — your text still never leaves your machine.

---

## Contributing

Build instructions, packaging/signing, project layout, and an architecture
overview live in [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: see
[SECURITY.md](SECURITY.md).

---

## License

Apache-2.0
