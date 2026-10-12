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

// ── Host permission for non-local servers ───────────────────────────────────
// The manifest only grants localhost and 127.0.0.1. Any other server (a LAN box,
// a container, a VM) needs an optional host permission, or every fetch to it is
// blocked and the popup reports "Server offline".
// Returns null for a local URL (already granted), the match pattern otherwise.
function hostPermissionPattern(serverUrl) {
  let u;
  try {
    u = new URL(serverUrl);
  } catch {
    throw new Error("Invalid server URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Server URL must start with http:// or https://");
  }
  if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
    return null;
  }
  // Match patterns carry no port; the host covers every port on it.
  return `${u.protocol}//${u.hostname}/*`;
}

// Must be called synchronously from a click handler, before any await:
// Firefox only shows the permission prompt while handling user input.
function requestHostPermission(serverUrl) {
  const pattern = hostPermissionPattern(serverUrl);
  if (!pattern) return Promise.resolve(true);
  return browser.permissions.request({ origins: [pattern] });
}

function setTestResult(cls, text) {
  $("testDot").className = cls;
  $("testStatus").textContent = text;
}

$("saveBtn").addEventListener("click", async () => {
  const settings = getFormValues();
  let granted;
  try {
    granted = await requestHostPermission(settings.serverUrl);
  } catch (err) {
    setTestResult("dot err", err.message);
    return;
  }
  if (!granted) {
    setTestResult("dot err", "Permission denied for this server; not saved");
    return;
  }
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

  // Request before anything awaits, so the prompt is still allowed to show.
  let permission;
  try {
    permission = requestHostPermission(settings.serverUrl);
  } catch (err) {
    setTestResult("dot err", err.message);
    return;
  }

  dot.className = "dot";
  status.textContent = "Testing…";

  try {
    if (!(await permission)) {
      setTestResult("dot err", "Permission denied for this server");
      return;
    }

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
