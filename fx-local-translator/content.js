/**
 * LocalLingo — content.js
 * Extracts text from the page, sends to background for translation,
 * then replaces text nodes in place.
 */

(function () {
  // Avoid double-injection
  if (window.__localLingoActive) return;
  window.__localLingoActive = true;

  // ── Tags to skip entirely ────────────────────────────────────────────────────
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "OBJECT", "EMBED",
    "CODE", "PRE", "KBD", "SAMP", "VAR", "MATH", "SVG",
    "INPUT", "TEXTAREA", "SELECT", "BUTTON"
  ]);

  // ── Collect translatable text nodes grouped by block element ─────────────────
  function collectBlocks(root) {
    const blocks = [];   // [{ el, nodes: [textNode, ...] }]
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (SKIP_TAGS.has(node.tagName)) return NodeFilter.FILTER_REJECT;
            // skip invisible elements
            const style = getComputedStyle(node);
            if (style.display === "none" || style.visibility === "hidden") return NodeFilter.FILTER_REJECT;
          }
          if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent.trim().length > 0
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    const BLOCK_TAGS = new Set([
      "P", "DIV", "SECTION", "ARTICLE", "HEADER", "FOOTER",
      "LI", "TD", "TH", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6",
      "FIGCAPTION", "CAPTION", "LABEL", "DT", "DD"
    ]);

    let currentBlock = null;
    let currentNodes = [];

    function flush() {
      if (currentBlock && currentNodes.length > 0) {
        blocks.push({ el: currentBlock, nodes: [...currentNodes] });
      }
      currentNodes = [];
    }

    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (BLOCK_TAGS.has(node.tagName)) {
          flush();
          currentBlock = node;
        }
      } else {
        // text node
        if (!currentBlock) currentBlock = node.parentElement;
        currentNodes.push(node);
      }
    }
    flush();

    return blocks;
  }

  // ── Build a flat list of translation units ────────────────────────────────────
  function buildChunkMap(blocks) {
    // Returns { chunks: string[], map: [{ blockIdx, nodeIdx }] }
    const chunks = [];
    const map = [];

    blocks.forEach((block, bi) => {
      block.nodes.forEach((node, ni) => {
        const text = node.textContent.trim();
        if (text.length > 0) {
          chunks.push(text);
          map.push({ blockIdx: bi, nodeIdx: ni });
        }
      });
    });

    return { chunks, map };
  }

  // ── Apply translated results back to the DOM ──────────────────────────────────
  function applyResults(results, blocks, map) {
    results.forEach(({ index, text, ok }) => {
      if (!ok || !text) return;
      const { blockIdx, nodeIdx } = map[index];
      const node = blocks[blockIdx]?.nodes[nodeIdx];
      if (node) {
        node.textContent = text;
      }
    });
  }

  // ── Overlay / progress UI ─────────────────────────────────────────────────────
  let overlay = null;

  function showOverlay() {
    overlay = document.createElement("div");
    overlay.id = "__locallingo_overlay";
    overlay.style.cssText = `
      position: fixed; top: 16px; right: 16px; z-index: 2147483647;
      background: #0f1117; color: #e2e8f0; font-family: monospace;
      font-size: 13px; border-radius: 10px; padding: 14px 18px;
      box-shadow: 0 8px 32px rgba(0,0,0,.5); border: 1px solid #2d3748;
      min-width: 220px; line-height: 1.6;
      animation: llFadeIn .2s ease;
    `;
    overlay.innerHTML = `
      <style>
        @keyframes llFadeIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
        #__locallingo_bar { height:4px; background:#1a202c; border-radius:4px; margin-top:10px; overflow:hidden }
        #__locallingo_fill { height:100%; width:0%; background: linear-gradient(90deg,#6366f1,#8b5cf6); transition:width .3s ease; border-radius:4px }
      </style>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:16px">🌐</span>
        <strong style="color:#a78bfa">LocalLingo</strong>
      </div>
      <div id="__locallingo_status" style="color:#94a3b8;margin-top:4px">Starting…</div>
      <div id="__locallingo_bar"><div id="__locallingo_fill"></div></div>
    `;
    document.body.appendChild(overlay);
  }

  function updateOverlay(done, total) {
    const status = document.getElementById("__locallingo_status");
    const fill = document.getElementById("__locallingo_fill");
    if (status) status.textContent = `Translating… ${done}/${total} blocks`;
    if (fill) fill.style.width = `${Math.round((done / total) * 100)}%`;
  }

  function closeOverlay(msg, success = true) {
    const status = document.getElementById("__locallingo_status");
    const fill = document.getElementById("__locallingo_fill");
    if (status) status.textContent = msg;
    if (fill) fill.style.width = "100%";
    if (fill) fill.style.background = success ? "#10b981" : "#ef4444";
    setTimeout(() => overlay?.remove(), 2500);
  }

  // ── Main translation entry point ──────────────────────────────────────────────
  async function translatePage(targetLang) {
    if (document.getElementById("__locallingo_overlay")) return; // already running
    showOverlay();

    const blocks = collectBlocks(document.body);
    const { chunks, map } = buildChunkMap(blocks);

    if (chunks.length === 0) {
      closeOverlay("No text found on page.", false);
      return;
    }

    try {
      const response = await browser.runtime.sendMessage({
        type: "TRANSLATE_CHUNKS",
        chunks,
        targetLang
      });

      if (!response) throw new Error("No response from background.");
      applyResults(response.results, blocks, map);

      const msg = response.failed > 0
        ? `Done — ${response.failed} block(s) failed.`
        : `Translated ${chunks.length} blocks ✓`;
      closeOverlay(msg, response.failed === 0);

    } catch (err) {
      closeOverlay(`Error: ${err.message}`, false);
    }
  }

  // ── Listen for messages from popup / background ───────────────────────────────
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === "START_TRANSLATION") {
      translatePage(message.targetLang);
    }
    if (message.type === "PROGRESS") {
      updateOverlay(message.done, message.total);
    }
  });

})();
