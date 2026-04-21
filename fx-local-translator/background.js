/**
 * LocalLingo — background.js
 * Handles communication with the local model server.
 * Supports Ollama and OpenAI-compatible APIs (LM Studio, Jan.ai, etc.)
 */

const DEFAULT_SETTINGS = {
  apiType: "ollama",            // "ollama" | "openai"
  serverUrl: "http://localhost:11434",
  model: "mistral",
  chunkSize: 1500,              // characters per translation chunk
  systemPrompt: "You are a professional translator. Translate the given text accurately and naturally. Preserve formatting, line breaks, and punctuation. Return ONLY the translated text with no explanations or comments."
};

// ── Fetch settings from storage ──────────────────────────────────────────────
async function getSettings() {
  return new Promise((resolve) => {
    browser.storage.local.get(DEFAULT_SETTINGS, (result) => {
      resolve(result);
    });
  });
}

// ── Ollama API call ───────────────────────────────────────────────────────────
async function callOllama(text, targetLang, settings) {
  const url = `${settings.serverUrl}/api/generate`;
  const prompt = `${settings.systemPrompt}\n\nTranslate to ${targetLang}:\n\n${text}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.model,
      prompt,
      stream: false,
      options: { temperature: 0.1 }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return (data.response || "").trim();
}

// ── OpenAI-compatible API call ────────────────────────────────────────────────
async function callOpenAI(text, targetLang, settings) {
  const url = `${settings.serverUrl}/v1/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: "system", content: settings.systemPrompt },
        { role: "user", content: `Translate to ${targetLang}:\n\n${text}` }
      ],
      temperature: 0.1,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

// ── Main translation dispatcher ───────────────────────────────────────────────
async function translateChunk(text, targetLang, settings) {
  if (settings.apiType === "openai") {
    return await callOpenAI(text, targetLang, settings);
  }
  return await callOllama(text, targetLang, settings);
}

// ── Split text into chunks without breaking sentences ─────────────────────────
function splitIntoChunks(text, maxChars) {
  if (text.length <= maxChars) return [text];

  const chunks = [];
  const sentences = text.split(/(?<=[.!?。！？\n])\s*/);
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ── Message handler ───────────────────────────────────────────────────────────
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === "TRANSLATE_CHUNKS") {
    const { chunks, targetLang } = message;

    (async () => {
      const settings = await getSettings();
      const results = [];
      let failed = 0;

      for (let i = 0; i < chunks.length; i++) {
        try {
          const translated = await translateChunk(chunks[i], targetLang, settings);
          results.push({ index: i, text: translated, ok: true });
        } catch (err) {
          results.push({ index: i, text: chunks[i], ok: false, error: err.message });
          failed++;
        }

        // Report progress back to the tab
        if (sender.tab) {
          browser.tabs.sendMessage(sender.tab.id, {
            type: "PROGRESS",
            done: i + 1,
            total: chunks.length
          }).catch(() => {});
        }
      }

      sendResponse({ results, failed });
    })();

    return true; // keep channel open for async response
  }

  if (message.type === "CHECK_SERVER") {
    (async () => {
      const settings = await getSettings();
      try {
        let url = settings.apiType === "openai"
          ? `${settings.serverUrl}/v1/models`
          : `${settings.serverUrl}/api/tags`;

        const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(4000) });
        sendResponse({ ok: res.ok, status: res.status });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.type === "GET_SETTINGS") {
    getSettings().then(sendResponse);
    return true;
  }

  if (message.type === "SAVE_SETTINGS") {
    browser.storage.local.set(message.settings, () => sendResponse({ ok: true }));
    return true;
  }
});
