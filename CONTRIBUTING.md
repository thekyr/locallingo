# Contributing to LocalLingo

Thanks for your interest in improving LocalLingo. This document covers building
the extension, packaging/signing a release, the project layout, and how the
translation pipeline works.

For installation and end-user docs, see [README.md](README.md). To report a
security vulnerability, see [SECURITY.md](SECURITY.md).

---

## Running from source

1. Go to `about:debugging` in Firefox
2. Click **"This Firefox"** → **"Load Temporary Add-on…"**
3. Navigate to `fx-local-translator/` and select `manifest.json`

Temporary add-ons are removed when Firefox restarts. For a longer-lived unsigned
install, use [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer/)
or [Firefox Nightly](https://www.mozilla.org/en-US/firefox/channel/desktop/) with
`xpinstall.signatures.required` set to `false` in `about:config`.

---

## Building & packaging

`build.sh` packages the contents of `fx-local-translator/` into an installable
archive (`manifest.json` at the zip root, as Firefox requires).

```bash
./build.sh           # → dist/locallingo-<version>.xpi
./build.sh --lint    # lint with web-ext before building
./build.sh --sign    # build + submit to AMO (listed channel — public review queue)
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

   The `listed` channel submits the package to addons.mozilla.org and enters the
   public review queue; once approved it gets a public listing page. The listing
   metadata (summary, description, screenshots) must still be filled in on the AMO
   website — see [`STORE_LISTING.md`](STORE_LISTING.md). To instead get a signed
   `.xpi` for self-hosting with no review, change `--channel listed` to
   `--channel unlisted` in `build.sh`. (The extension ID is set via
   `browser_specific_settings.gecko.id` in `manifest.json`.)

---

## Project structure

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

## How it works

1. **Selection:** The background script receives the selected text via the context menu API, splits it into ≤800 character chunks at natural paragraph/sentence boundaries, sends each chunk to the local model sequentially, then reassembles and displays the result in a floating bubble.

2. **Full page:** The content script walks the DOM with a `TreeWalker`, collects text nodes grouped by block element, sends all chunks to the background script, and replaces each text node in place as translations come back.

3. **All API calls** happen in `background.js` — never in the content script — so they are not subject to page Content Security Policies.
