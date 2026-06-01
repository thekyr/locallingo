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
    // Keep errors on screen longer so they can actually be read.
    setTimeout(() => overlay?.remove(), success ? 2500 : 8000);
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

      let msg;
      if (response.failed === 0) {
        msg = `Translated ${chunks.length} blocks ✓`;
      } else if (response.failed === chunks.length) {
        // Everything failed — show the underlying cause, not just a count.
        msg = `Failed: ${response.error || "all blocks failed"}`;
      } else {
        msg = `Done — ${response.failed}/${chunks.length} failed (${response.error || "see console"})`;
      }
      closeOverlay(msg, response.failed === 0);

    } catch (err) {
      closeOverlay(`Error: ${err.message}`, false);
    }
  }

  // ── Selection translation bubble ──────────────────────────────────────────────
  function removeBubble() {
    document.getElementById("__locallingo_bubble")?.remove();
  }

  function showBubble(rect, targetLang) {
    removeBubble();

    const bubble = document.createElement("div");
    bubble.id = "__locallingo_bubble";
    bubble.style.cssText = `
      position: absolute; z-index: 2147483647;
      max-width: 360px; min-width: 180px;
      background: #0f1117; color: #e2e8f0;
      font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5;
      border-radius: 10px; padding: 12px 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,.5); border: 1px solid #2d3748;
      animation: llFadeIn .15s ease;
    `;
    // Position just below the selection, clamped to the viewport.
    const top = window.scrollY + rect.bottom + 8;
    const left = Math.min(
      window.scrollX + rect.left,
      window.scrollX + document.documentElement.clientWidth - 376
    );
    bubble.style.top = `${top}px`;
    bubble.style.left = `${Math.max(window.scrollX + 8, left)}px`;

    bubble.innerHTML = `
      <style>
        @keyframes llFadeIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        #__locallingo_bubble .ll-head { display:flex; align-items:center; gap:8px; margin-bottom:6px }
        #__locallingo_bubble .ll-actions { display:flex; gap:8px; margin-top:10px }
        #__locallingo_bubble button {
          font:inherit; cursor:pointer; border:1px solid #2d3748; background:#1a202c;
          color:#cbd5e1; border-radius:6px; padding:4px 10px; font-size:12px;
        }
        #__locallingo_bubble button:hover { background:#2d3748 }
      </style>
      <div class="ll-head">
        <span style="font-size:15px">🌐</span>
        <strong style="color:#a78bfa">LocalLingo</strong>
        <span id="__ll_lang" style="margin-left:auto;color:#64748b;font-size:11px"></span>
        <button id="__ll_close" title="Close" style="padding:2px 8px">✕</button>
      </div>
      <div id="__ll_body" style="color:#94a3b8">Translating…</div>
    `;
    document.body.appendChild(bubble);

    // Set dynamic values via textContent (never interpolate into innerHTML).
    bubble.querySelector("#__ll_lang").textContent = `→ ${targetLang}`;
    bubble.querySelector("#__ll_close").addEventListener("click", removeBubble);
    return bubble;
  }

  async function translateSelection(targetLang) {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (!text || selection.rangeCount === 0) return;

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    const bubble = showBubble(rect, targetLang);
    const body = bubble.querySelector("#__ll_body");

    try {
      const response = await browser.runtime.sendMessage({
        type: "TRANSLATE_TEXT",
        text,
        targetLang
      });

      if (!response || typeof response.text !== "string") {
        throw new Error("No response from background.");
      }

      // If every piece failed the text is just the original — show the cause instead.
      if (response.failed > 0 && response.error) {
        body.style.color = "#f87171";
        body.textContent = `Failed: ${response.error}`;
        return;
      }

      body.style.color = "#e2e8f0";
      body.textContent = response.text;

      const actions = document.createElement("div");
      actions.className = "ll-actions";
      const copyBtn = document.createElement("button");
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(response.text);
          copyBtn.textContent = "Copied ✓";
          setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
        } catch {
          copyBtn.textContent = "Copy failed";
        }
      });
      actions.appendChild(copyBtn);
      body.after(actions);

    } catch (err) {
      body.style.color = "#f87171";
      body.textContent = `Error: ${err.message}`;
    }
  }

  // Dismiss the bubble when clicking elsewhere or pressing Escape.
  document.addEventListener("mousedown", (e) => {
    const bubble = document.getElementById("__locallingo_bubble");
    if (bubble && !bubble.contains(e.target)) removeBubble();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") removeBubble();
  });

  // ── Listen for messages from popup / background ───────────────────────────────
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === "START_TRANSLATION") {
      translatePage(message.targetLang);
    }
    if (message.type === "TRANSLATE_SELECTION") {
      translateSelection(message.targetLang);
    }
    if (message.type === "PROGRESS") {
      updateOverlay(message.done, message.total);
    }
  });

})();
