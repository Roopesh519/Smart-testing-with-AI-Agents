const readline = require("readline");
const { handleRequest, loadConfig } = require("./service.cjs");

function formatDebugResponse(input, routing, config, executionPlan, executionResult) {
  const lines = [];

  lines.push(`${config.name}`);
  lines.push(`Wake phrase: ${config.wakePhrase}`);
  lines.push("");
  lines.push(`Request: ${input || "(menu)"}`);
  lines.push(`Intent: ${routing.intent}`);
  lines.push("");

  if (routing.result.type === "menu") {
    lines.push("Available skills:");
    routing.result.skills.forEach((skill, index) => {
      const state = skill.available ? "ready" : "needs wiring";
      lines.push(`${index + 1}. ${skill.title} (${skill.id}) - ${state}`);
    });
    return lines.join("\n");
  }

  lines.push(`Route: ${routing.result.label}`);

  if (routing.result.command) {
    lines.push(`Invoke: ${routing.result.command}`);
  }

  if (routing.result.summary) {
    lines.push(`Summary: ${routing.result.summary}`);
  }

  const contextEntries = Object.entries(routing.context).filter(([, value]) => Boolean(value));
  if (contextEntries.length > 0) {
    lines.push("");
    lines.push("Detected context:");
    contextEntries.forEach(([key, value]) => {
      lines.push(`- ${key}: ${value}`);
    });
  }

  if (routing.result.phases && routing.result.phases.length > 0) {
    lines.push("");
    lines.push("Pipeline:");
    routing.result.phases.forEach((phase) => {
      lines.push(`- ${phase}`);
    });
  }

  if (routing.result.missing && routing.result.missing.length > 0) {
    lines.push("");
    lines.push("Still needed:");
    routing.result.missing.forEach((field) => {
      lines.push(`- ${field}`);
    });
  }

  if (routing.result.note) {
    lines.push("");
    lines.push(`Note: ${routing.result.note}`);
  }

  if (executionPlan.files.length > 0) {
    lines.push("");
    lines.push("Execution files:");
    executionPlan.files.forEach((filePath) => {
      lines.push(`- ${filePath}`);
    });
  }

  if (executionPlan.steps.length > 0) {
    lines.push("");
    lines.push("Execution preview:");
    executionPlan.steps.forEach((step) => {
      lines.push(`- ${step.title}: ${step.preview}`);
    });
  }

  if (executionPlan.notes.length > 0) {
    lines.push("");
    lines.push("Execution notes:");
    executionPlan.notes.forEach((note) => {
      lines.push(`- ${note}`);
    });
  }

  if (executionPlan.prompt) {
    lines.push("");
    lines.push(`Next prompt: ${executionPlan.prompt}`);
  }

  if (executionResult) {
    lines.push("");
    lines.push("Claude invocation:");
    lines.push(`- prompt: ${executionResult.prompt}`);
    lines.push(`- status: ${executionResult.ok ? "success" : "failed"}`);

    if (executionResult.stdout) {
      lines.push("");
      lines.push("Claude output:");
      lines.push(executionResult.stdout);
    }

    if (executionResult.stderr || executionResult.error) {
      lines.push("");
      lines.push("Claude error:");
      lines.push(executionResult.stderr || executionResult.error);
    }
  }

  if (config.configError) {
    lines.push("");
    lines.push(`Config warning: ${config.configError}`);
  }

  return lines.join("\n");
}

function formatCompactResponse(input, routing, executionPlan, executionResult) {
  const lines = [];

  if (executionResult && executionResult.ok && executionResult.stdout) {
    lines.push(executionResult.stdout);
    return lines.join("\n");
  }

  if (executionPlan.prompt) {
    lines.push(executionPlan.prompt);
  } else if (executionResult && !executionResult.ok) {
    lines.push("Claude could not complete the request.");

    if (executionResult.stdout) {
      lines.push("");
      lines.push(executionResult.stdout);
    } else if (executionResult.stderr || executionResult.error) {
      lines.push("");
      lines.push(executionResult.stderr || executionResult.error);
    }
  } else if (routing.result.type === "menu") {
    lines.push("Available skills:");
    routing.result.skills.forEach((skill, index) => {
      lines.push(`${index + 1}. ${skill.title}`);
    });
  } else {
    lines.push(routing.result.summary || `Routed to ${routing.result.label}.`);
  }

  return lines.join("\n");
}

function printOutput(input, asJson, options = {}) {
  const response = handleRequest(input, options);
  const { config, routing, executionPlan, executionResult } = {
    config: response.config,
    routing: response,
    executionPlan: response.executionPlan,
    executionResult: response.executionResult,
  };
  const debugEnabled = config.debug || options.debug;

  if (asJson) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  if (debugEnabled) {
    console.log(formatDebugResponse(input, routing, config, executionPlan, executionResult));
    return;
  }

  console.log(formatCompactResponse(input, routing, executionPlan, executionResult));
}

function startInteractiveMode() {
  const config = loadConfig();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${config.wakePhrase}> `,
  });

  console.log(`${config.name}`);
  console.log(`Type a QA request, or 'exit' to quit.`);
  rl.prompt();

  rl.on("line", (line) => {
    const input = line.trim();

    if (input.toLowerCase() === "exit") {
      rl.close();
      return;
    }

    console.log("");
    printOutput(input, false);
    console.log("");
    rl.prompt();
  });
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const previewOnly = args.includes("--preview");
  const debug = args.includes("--debug");
  const input = args.filter((arg) => arg !== "--json" && arg !== "--preview" && arg !== "--debug").join(" ").trim();

  if (!input) {
    startInteractiveMode();
    return;
  }

  printOutput(input, asJson, { previewOnly, debug });
}

main();
