# 🌐 LocalLingo — AI Page Translator for Firefox

A Firefox extension that translates web pages and selected text using a **locally running AI model** — no cloud APIs, no data leaving your machine, no API keys.

Built for developers, sysadmins, and anyone who reads technical content in foreign languages.

---

## Features

- **Translate selected text** — right-click any selection → instant floating translation bubble
- **Translate full pages** — one click to replace all text on the page in place
- **Fully local** — works with [Ollama](https://ollama.com), LM Studio, Jan.ai, or any OpenAI-compatible local server
- **Preserves technical terms** — DevOps, sysadmin, and programming terms are never translated (docker, kubectl, nginx, etc.)
- **Smart chunking** — long texts are split at paragraph/sentence boundaries and reassembled
- **Progress indicator** — live overlay shows translation progress for both selections and full pages
- **Copy button** — one click to copy translated text from the bubble

---

## Requirements

- Firefox (any recent version)
- [Ollama](https://ollama.com) running locally — or any OpenAI-compatible server (LM Studio, Jan.ai, llama.cpp)

---

## Installation

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

### 3. Start Ollama with CORS enabled

```bash
OLLAMA_ORIGINS="*" ollama serve
```

To make this permanent on macOS, add to `~/.zshrc`:

```bash
export OLLAMA_ORIGINS="*"
```

### 4. Load the extension in Firefox

1. Go to `about:debugging` in Firefox
2. Click **"This Firefox"** → **"Load Temporary Add-on…"**
3. Navigate to the extension folder and select `manifest.json`

> For a permanent install without signing, use [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer/) or [Firefox Nightly](https://www.mozilla.org/en-US/firefox/channel/desktop/) with `xpinstall.signatures.required` set to `false` in `about:config`.

---

## Building & packaging

The repo ships with `build.sh`, which packages the contents of `fx-local-translator/`
into an installable archive (`manifest.json` at the zip root, as Firefox requires).

```bash
./build.sh           # → dist/locallingo-<version>.xpi
./build.sh --lint    # lint with web-ext before building
./build.sh --sign    # build + submit to AMO for signing (unlisted channel)
```

`--lint` and `--sign` require [`web-ext`](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/):

```bash
npm install -g web-ext
```

### Signing for permanent install

A regular Firefox install only accepts add-ons signed by Mozilla. To sign:

1. Create a free account at [addons.mozilla.org](https://addons.mozilla.org) and generate an [API key](https://addons.mozilla.org/developers/addon/api/key/).
2. Export the credentials and run the signed build:

   ```bash
   export AMO_JWT_ISSUER="user:xxxxx:xxx"
   export AMO_JWT_SECRET="your-secret"
   ./build.sh --sign
   ```

   The `unlisted` channel returns a signed `.xpi` you can self-host and install
   directly — no public review queue. (The extension ID is set via
   `browser_specific_settings.gecko.id` in `manifest.json`.)

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
| Server URL | `http://localhost:11434` | URL of your local model server |
| Model Name | `mistral` | Any model you have installed |
| Chunk size | `1500` chars | How much text is sent per request — larger = more context, slower |
| System Prompt | (see below) | Instructions sent to the model before each translation |

### Recommended models by use case

| Model | Size | Best for |
| --- | --- | --- |
| `qwen2.5:3b` | 1.9 GB | Speed, Asian languages |
| `qwen2.5:7b` | 4.7 GB | Quality + speed balance |
| `mistral` | 4.1 GB | European languages |
| `aya-expanse` | 4.0 GB | Best multilingual quality, 23 languages |
| `llama3.1:8b` | 4.7 GB | Strong general translator |

---

## Project Structure

```
fx-local-translator/
├── manifest.json          # Extension manifest (MV2)
├── background.js          # API calls to local model, context menu
├── content.js             # DOM text extraction, bubble UI, page overlay
├── popup/
│   ├── popup.html         # Toolbar popup
│   └── popup.js
├── options/
│   ├── options.html       # Settings page
│   └── options.js
└── icons/
    ├── icon48.png
    └── icon96.png
```

---

## How It Works

1. **Selection:** The background script receives the selected text via the context menu API, splits it into ≤800 character chunks at natural paragraph/sentence boundaries, sends each chunk to the local model sequentially, then reassembles and displays the result in a floating bubble.
  
2. **Full page:** The content script walks the DOM with a `TreeWalker`, collects text nodes grouped by block element, sends all chunks to the background script, and replaces each text node in place as translations come back.
  
3. **All API calls** happen in `background.js` — never in the content script — so they are not subject to page Content Security Policies.
  

---

## Troubleshooting

**"Server offline" in the popup**

- Make sure Ollama is running: `ollama serve`
- Check it's reachable: open `http://localhost:11434` in a browser tab

**403 Forbidden errors**

- Ollama is blocking requests from the browser extension
- Restart with: `OLLAMA_ORIGINS="*" ollama serve`

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

All text is processed locally on your machine. Nothing is sent to external servers. The extension requires `http://localhost/*` permission only to communicate with your local model server.

---

## License

MIT
