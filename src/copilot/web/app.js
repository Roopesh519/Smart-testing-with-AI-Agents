const promptField = document.getElementById("prompt");
const previewOnlyField = document.getElementById("previewOnly");
const autoListenField = document.getElementById("autoListen");
const runButton = document.getElementById("runButton");
const voiceButton = document.getElementById("voiceButton");
const responseText = document.getElementById("responseText");
const statusPill = document.getElementById("statusPill");
const voiceStatus = document.getElementById("voiceStatus");
const voiceTranscript = document.getElementById("voiceTranscript");
const toggleDebug = document.getElementById("toggleDebug");
const debugPanel = document.getElementById("debugPanel");
const routeText = document.getElementById("routeText");
const filesList = document.getElementById("filesList");
const stepsList = document.getElementById("stepsList");
const jsonOutput = document.getElementById("jsonOutput");
const channel = new BroadcastChannel("smart-testing-copilot");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let voiceReady = false;
let listening = false;
let voiceAllowed = true;
let appConfig = null;

function normalizeVoiceText(text) {
  return (text || "").trim().replace(/\s+/g, " ");
}

function getWakePhrase() {
  return normalizeVoiceText((appConfig && appConfig.wakePhrase) || "Hey Claude").toLowerCase();
}

function updateVoiceStatus(label, transcript) {
  voiceStatus.textContent = label;
  if (typeof transcript === "string") {
    voiceTranscript.textContent = transcript;
  }
}

function setListeningState(active) {
  listening = active;
  voiceButton.classList.toggle("listening", active);
  voiceButton.textContent = active ? "Stop listening" : "Start listening";
}

function extractWakeCommand(text) {
  const normalized = normalizeVoiceText(text);
  const wakePhrase = getWakePhrase();
  const lower = normalized.toLowerCase();

  if (!lower) {
    return null;
  }

  if (lower.startsWith(wakePhrase)) {
    return normalized.slice(wakePhrase.length).replace(/^[,\s:-]+/, "").trim();
  }

  return null;
}

function setStatus(label, isSuccess = false) {
  statusPill.textContent = label;
  statusPill.classList.toggle("success", isSuccess);
}

function renderList(element, items, emptyText) {
  element.innerHTML = "";

  if (!items || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = emptyText;
    element.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    element.appendChild(li);
  });
}

function renderResponse(payload) {
  appConfig = payload.config || appConfig;
  if (typeof payload.config?.voiceAutoListen === "boolean") {
    autoListenField.checked = payload.config.voiceAutoListen;
  }

  responseText.textContent = payload.compactText || "No response returned.";
  routeText.textContent = `${payload.intent} -> ${payload.result.label}`;
  renderList(filesList, payload.executionPlan.files, "No execution files.");
  renderList(
    stepsList,
    payload.executionPlan.steps.map((step) => `${step.title}: ${step.preview}`),
    "No execution steps."
  );
  jsonOutput.textContent = JSON.stringify(payload, null, 2);

  const succeeded = !payload.executionResult || payload.executionResult.ok;
  setStatus(succeeded ? "Ready" : "Attention", succeeded);
}

function renderVoiceResult(payload, transcript, command) {
  promptField.value = command || promptField.value;
  updateVoiceStatus("Background assistant handled a request.", transcript || "Wake phrase detected.");
  renderResponse(payload);
}

async function sendPrompt() {
  const input = promptField.value.trim();
  if (!input) {
    setStatus("Need prompt");
    responseText.textContent = "Enter a request before sending it to the copilot.";
    return;
  }

  runButton.disabled = true;
  setStatus("Running");
  responseText.textContent = "Working on your request...";

  try {
    const response = await fetch("/api/copilot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input,
        previewOnly: previewOnlyField.checked,
      }),
    });

    const payload = await response.json();

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || "Copilot request failed.");
    }

    renderResponse(payload);
  } catch (error) {
    setStatus("Error");
    responseText.textContent = error.message;
    routeText.textContent = "No route available.";
    renderList(filesList, [], "No execution files.");
    renderList(stepsList, [], "No execution steps.");
    jsonOutput.textContent = "";
  } finally {
    runButton.disabled = false;
  }
}

async function loadHealthConfig() {
  try {
    const response = await fetch("/api/health");
    const payload = await response.json();
    if (response.ok && payload.ok) {
      appConfig = payload.config;
      autoListenField.checked = Boolean(appConfig.voiceAutoListen);
      voiceAllowed = appConfig.voiceEnabled !== false;
    }
  } catch (error) {
    voiceAllowed = true;
  }
}

function stopListening() {
  if (!recognition || !listening) {
    setListeningState(false);
    return;
  }

  recognition.stop();
}

function maybeRestartListening() {
  if (!voiceReady || !voiceAllowed) {
    return;
  }

  if (autoListenField.checked && !listening) {
    startListening();
  }
}

function startListening() {
  if (!voiceReady) {
    updateVoiceStatus("Voice recognition is not available in this build.", "Type your request instead.");
    return;
  }

  if (!voiceAllowed) {
    updateVoiceStatus("Voice mode is disabled by configuration.", "Enable voice in copilot.config.json to use the microphone.");
    return;
  }

  if (listening) {
    return;
  }

  try {
    recognition.start();
  } catch (error) {
    updateVoiceStatus("Could not start the microphone.", error.message || "Try again.");
  }
}

function submitVoiceCommand(command, rawTranscript) {
  if (!command) {
    updateVoiceStatus(`Wake phrase heard: ${getWakePhrase()}`, rawTranscript || "Say a command after the wake phrase.");
    return;
  }

  promptField.value = command;
  updateVoiceStatus("Wake phrase detected. Sending request...", rawTranscript);
  sendPrompt();
}

function setupVoice() {
  if (!SpeechRecognition) {
    voiceAllowed = false;
    updateVoiceStatus("Voice recognition is not supported here.", "This desktop build can still be used with typed prompts.");
    voiceButton.disabled = true;
    autoListenField.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  voiceReady = true;

  recognition.onstart = () => {
    setListeningState(true);
    updateVoiceStatus(`Listening for "${getWakePhrase()}"`, "Speak naturally. The command will auto-submit after the wake phrase.");
  };

  recognition.onend = () => {
    setListeningState(false);
    updateVoiceStatus("Voice is idle.", `Say "${getWakePhrase()}" followed by your request.`);
    setTimeout(maybeRestartListening, 250);
  };

  recognition.onerror = (event) => {
    setListeningState(false);
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      updateVoiceStatus("Microphone permission was denied.", "Allow microphone access to use voice mode.");
      return;
    }

    if (event.error === "no-speech") {
      updateVoiceStatus(`Listening for "${getWakePhrase()}"`, "I did not catch anything. Try again.");
      setTimeout(maybeRestartListening, 250);
      return;
    }

    updateVoiceStatus("Voice recognition hit an error.", event.error || "Try again.");
    setTimeout(maybeRestartListening, 500);
  };

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const transcript = normalizeVoiceText(result[0].transcript);
    const command = extractWakeCommand(transcript);

    updateVoiceStatus(
      command ? "Wake phrase detected." : `Listening for "${getWakePhrase()}"`,
      transcript || `Say "${getWakePhrase()}" followed by your request.`
    );

    if (result.isFinal && command) {
      stopListening();
      submitVoiceCommand(command, transcript);
    }
  };
}

function handleVoiceMessage(event) {
  const message = event.data || {};

  if (message.source !== "voice-listener") {
    return;
  }

  if (message.type === "voice-started") {
    setListeningState(true);
    updateVoiceStatus(`Background listening for "${message.wakePhrase}"`, "The assistant is active even when the app window is hidden.");
    return;
  }

  if (message.type === "voice-stopped") {
    setListeningState(false);
    updateVoiceStatus("Background assistant is waiting.", `Say "${message.wakePhrase}" to wake it again.`);
    return;
  }

  if (message.type === "voice-heard") {
    updateVoiceStatus(
      message.command ? "Wake phrase detected in background." : "Background assistant is listening.",
      message.transcript || `Say "${getWakePhrase()}" followed by your request.`
    );
    return;
  }

  if (message.type === "wake-heard") {
    updateVoiceStatus(`Wake phrase heard: ${getWakePhrase()}`, message.transcript || "Say a command after the wake phrase.");
    return;
  }

  if (message.type === "wake-command") {
    promptField.value = message.command || promptField.value;
    setStatus("Running");
    responseText.textContent = "Background assistant is handling your request...";
    updateVoiceStatus("Background assistant is sending your request...", message.transcript || "");
    return;
  }

  if (message.type === "voice-response") {
    renderVoiceResult(message.payload, message.transcript, message.command);
    return;
  }

  if (message.type === "voice-error") {
    setListeningState(false);
    updateVoiceStatus("Background assistant hit an error.", message.message || "Try again.");
  }
}

runButton.addEventListener("click", sendPrompt);
voiceButton.addEventListener("click", () => {
  if (listening) {
    stopListening();
    return;
  }

  startListening();
});

autoListenField.addEventListener("change", () => {
  if (autoListenField.checked) {
    startListening();
    return;
  }

  stopListening();
});

promptField.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    sendPrompt();
  }
});

toggleDebug.addEventListener("click", () => {
  const isHidden = debugPanel.classList.toggle("hidden");
  toggleDebug.textContent = isHidden ? "Show details" : "Hide details";
});

channel.addEventListener("message", handleVoiceMessage);

loadHealthConfig().finally(() => {
  setupVoice();
  if (voiceAllowed && appConfig && appConfig.backgroundVoiceEnabled) {
    updateVoiceStatus(
      `Background listening for "${getWakePhrase()}"`,
      "The assistant keeps listening even when this window is hidden."
    );
    return;
  }

  if (voiceAllowed && appConfig && appConfig.voiceAutoListen) {
    startListening();
  }
});
