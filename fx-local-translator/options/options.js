/**
 * LocalLingo — options.js
 */

const DEFAULT_SETTINGS = {
  apiType: "ollama",
  serverUrl: "http://localhost:11434",
  model: "mistral",
  chunkSize: 1500,
  systemPrompt: "You are a professional translator. Translate the given text accurately and naturally. Preserve formatting, line breaks, and punctuation. Return ONLY the translated text with no explanations or comments."
};

const $ = (id) => document.getElementById(id);

async function loadSettings() {
  const settings = await browser.storage.local.get(DEFAULT_SETTINGS);
  $("apiType").value = settings.apiType;
  $("serverUrl").value = settings.serverUrl;
  $("model").value = settings.model;
  $("chunkSize").value = settings.chunkSize;
  $("systemPrompt").value = settings.systemPrompt;
}

function getFormValues() {
  return {
    apiType: $("apiType").value,
    serverUrl: $("serverUrl").value.replace(/\/$/, ""),
    model: $("model").value.trim(),
    chunkSize: parseInt($("chunkSize").value, 10) || 1500,
    systemPrompt: $("systemPrompt").value.trim()
  };
}

function showToast() {
  const t = $("toast");
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

$("saveBtn").addEventListener("click", async () => {
  const settings = getFormValues();
  await browser.storage.local.set(settings);
  showToast();
});

$("resetBtn").addEventListener("click", async () => {
  await browser.storage.local.set(DEFAULT_SETTINGS);
  await loadSettings();
  showToast();
});

$("testBtn").addEventListener("click", async () => {
  const settings = getFormValues();
  const dot = $("testDot");
  const status = $("testStatus");

  dot.className = "dot";
  status.textContent = "Testing…";

  try {
    const url = settings.apiType === "openai"
      ? `${settings.serverUrl}/v1/models`
      : `${settings.serverUrl}/api/tags`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (res.ok) {
      dot.className = "dot ok";
      status.textContent = "Connected ✓";
    } else {
      dot.className = "dot err";
      status.textContent = `HTTP ${res.status}`;
    }
  } catch (err) {
    dot.className = "dot err";
    status.textContent = err.message.includes("NetworkError") || err.message.includes("fetch")
      ? "Server not reachable"
      : err.message.slice(0, 40);
  }
});

loadSettings();
