const fs = require("fs");
const path = require("path");
const { routeRequest } = require("./router.cjs");
const { buildExecutionPlan } = require("./executor.cjs");
const { buildClaudePrompt, runClaude } = require("./claudeRunner.cjs");
const { getWorkspaceRoot } = require("./runtime.cjs");

function loadConfig() {
  const projectRoot = getWorkspaceRoot();
  const configPath = path.join(projectRoot, "copilot.config.json");
  const defaults = {
    name: "Smart Testing Copilot",
    wakePhrase: "Hey Claude",
    defaultAgent: "qa-agent",
    mode: "cli",
    entryCommand: "npm run copilot --",
    invokeClaude: true,
    previewOnly: false,
    debug: false,
    voiceEnabled: true,
    voiceAutoListen: true,
    backgroundVoiceEnabled: true,
  };

  if (!fs.existsSync(configPath)) {
    return defaults;
  }

  try {
    return {
      ...defaults,
      ...JSON.parse(fs.readFileSync(configPath, "utf8")),
    };
  } catch (error) {
    return {
      ...defaults,
      configError: error.message,
    };
  }
}

function handleRequest(input, options = {}) {
  const config = loadConfig();
  const projectRoot = getWorkspaceRoot();
  const routing = routeRequest(input);
  const executionPlan = buildExecutionPlan(routing);
  const shouldExecute = config.invokeClaude && !config.previewOnly && !options.previewOnly;
  let executionResult = null;

  if (shouldExecute && !executionPlan.prompt) {
    const prompt = buildClaudePrompt(input, routing);
    const result = runClaude(prompt, projectRoot);
    executionResult = {
      prompt,
      ...result,
    };
  }

  return {
    config,
    input,
    ...routing,
    executionPlan,
    executionResult,
  };
}

module.exports = {
  handleRequest,
  loadConfig,
};
