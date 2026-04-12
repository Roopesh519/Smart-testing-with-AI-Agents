const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const channel = new BroadcastChannel("smart-testing-copilot");

let recognition = null;
let listening = false;
let wakePhrase = "hey claude";
let previewOnly = false;
let voiceEnabled = true;
let autoListen = true;

function normalizeText(text) {
  return (text || "").trim().replace(/\s+/g, " ");
}

function broadcast(type, data = {}) {
  channel.postMessage({
    source: "voice-listener",
    type,
    ...data,
  });
}

function extractCommand(text) {
  const normalized = normalizeText(text);
  const lower = normalized.toLowerCase();

  if (lower.startsWith(wakePhrase)) {
    return normalized.slice(wakePhrase.length).replace(/^[,\s:-]+/, "").trim();
  }

  return null;
}

async function loadConfig() {
  try {
    const response = await fetch("/api/health");
    const payload = await response.json();

    if (response.ok && payload.ok) {
      wakePhrase = normalizeText(payload.config.wakePhrase || "Hey Claude").toLowerCase();
      previewOnly = Boolean(payload.config.previewOnly);
      voiceEnabled = payload.config.voiceEnabled !== false;
      autoListen = payload.config.voiceAutoListen !== false;
    }
  } catch (error) {
    broadcast("voice-error", {
      message: error.message,
    });
  }
}

function maybeRestart() {
  if (!voiceEnabled || !autoListen || !recognition || listening) {
    return;
  }

  setTimeout(() => {
    try {
      recognition.start();
    } catch (error) {
      broadcast("voice-error", {
        message: error.message,
      });
    }
  }, 350);
}

async function submitCommand(command, transcript) {
  if (!command) {
    broadcast("wake-heard", {
      transcript,
      command: "",
    });
    return;
  }

  broadcast("wake-command", {
    transcript,
    command,
  });

  try {
    const response = await fetch("/api/copilot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: command,
        previewOnly,
      }),
    });

    const payload = await response.json();

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || "Voice request failed.");
    }

    broadcast("voice-response", {
      transcript,
      command,
      payload,
    });
  } catch (error) {
    broadcast("voice-error", {
      transcript,
      command,
      message: error.message,
    });
  }
}

function startVoiceListener() {
  if (!SpeechRecognition) {
    broadcast("voice-unsupported");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    listening = true;
    broadcast("voice-started", {
      wakePhrase,
    });
  };

  recognition.onend = () => {
    listening = false;
    broadcast("voice-stopped", {
      wakePhrase,
    });
    maybeRestart();
  };

  recognition.onerror = (event) => {
    listening = false;
    broadcast("voice-error", {
      message: event.error || "Voice recognition error",
    });
    maybeRestart();
  };

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const transcript = normalizeText(result[0].transcript);
    const command = extractCommand(transcript);

    broadcast("voice-heard", {
      transcript,
      command,
      final: result.isFinal,
    });

    if (result.isFinal && command) {
      recognition.stop();
      submitCommand(command, transcript);
    }
  };

  maybeRestart();
}

loadConfig().finally(startVoiceListener);
