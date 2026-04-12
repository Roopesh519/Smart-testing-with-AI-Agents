const { spawnSync } = require("child_process");

function buildClaudePrompt(input, routing) {
  if (routing.result.type === "menu") {
    return "/qa-agent";
  }

  if (routing.result.type === "full-pipeline") {
    return `/qa-agent ${input}`.trim();
  }

  if (routing.result.type === "fallback") {
    return `/qa-agent ${input}`.trim();
  }

  const command = routing.result.command || "";

  if (command.startsWith("/")) {
    const arg = routing.context.jiraCardId || routing.context.reportPath || routing.context.appUrl || input;
    return `${command} ${arg}`.trim();
  }

  if (routing.result.skillId) {
    return `Use the ${routing.result.skillId} skill for this request: ${input}`;
  }

  return input;
}

function runClaude(prompt, workdir) {
  const result = spawnSync("claude", ["-p", prompt], {
    cwd: workdir,
    encoding: "utf8",
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
    error: result.error ? result.error.message : null,
  };
}

module.exports = {
  buildClaudePrompt,
  runClaude,
};
