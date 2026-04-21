/**
 * LocalLingo — popup.js
 */

const $ = (id) => document.getElementById(id);

async function sendBg(msg) {
  return browser.runtime.sendMessage(msg);
}

async function init() {
  // Load settings to show model info
  const settings = await sendBg({ type: "GET_SETTINGS" });
  $("modelName").textContent = settings.model || "—";
  $("apiTypeBadge").textContent = settings.apiType === "openai" ? "OpenAI compat" : "Ollama";

  // Restore last selected language
  const stored = await browser.storage.local.get({ lastLang: "English" });
  $("targetLang").value = stored.lastLang;

  // Check server connectivity
  checkServer();
}

async function checkServer() {
  const dot = $("statusDot");
  const txt = $("statusText");
  const btn = $("translateBtn");

  dot.className = "dot checking";
  txt.textContent = "Checking server…";
  btn.disabled = true;

  const result = await sendBg({ type: "CHECK_SERVER" });

  if (result?.ok) {
    dot.className = "dot ok";
    txt.textContent = "Server online";
    btn.disabled = false;
  } else {
    dot.className = "dot err";
    txt.textContent = result?.error?.includes("NetworkError") || result?.error?.includes("Failed to fetch")
      ? "Server offline — is Ollama running?"
      : `Error: ${result?.error || result?.status}`;
    btn.disabled = true;
  }
}

$("translateBtn").addEventListener("click", async () => {
  const targetLang = $("targetLang").value;
  const btn = $("translateBtn");
  const label = $("btnLabel");

  // Save selected language
  browser.storage.local.set({ lastLang: targetLang });

  btn.classList.add("loading");
  btn.disabled = true;
  label.textContent = "Translating…";

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  // Ensure content script is injected (for pages loaded before extension)
  try {
    await browser.tabs.executeScript(tab.id, { file: "../content.js" });
  } catch {}

  await browser.tabs.sendMessage(tab.id, {
    type: "START_TRANSLATION",
    targetLang
  });

  // Close popup — translation runs in content script
  window.close();
});

function openOptions() {
  browser.runtime.openOptionsPage();
  window.close();
}

$("openSettings").addEventListener("click", openOptions);
$("openSettingsFooter").addEventListener("click", (e) => { e.preventDefault(); openOptions(); });

init();
