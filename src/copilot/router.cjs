const { skills, requiredFieldLabels } = require("./skills.cjs");

const JIRA_KEY_PATTERN = /\b[A-Z][A-Z0-9]+-\d+\b/;
const URL_PATTERN = /\bhttps?:\/\/[^\s]+/gi;

function normalize(text) {
  return (text || "").trim();
}

function extractJiraCardId(input) {
  const match = normalize(input).match(JIRA_KEY_PATTERN);
  return match ? match[0] : null;
}

function extractUrls(input) {
  return normalize(input).match(URL_PATTERN) || [];
}

function extractContext(input) {
  const urls = extractUrls(input);
  const jiraCardId = extractJiraCardId(input);
  const figmaUrl = urls.find((url) => url.toLowerCase().includes("figma")) || null;
  const appUrl = urls.find((url) => url !== figmaUrl) || null;

  return {
    jiraCardId,
    appUrl,
    figmaUrl,
    reportPath: input.includes("outputs/") ? input.split(/\s+/).find((part) => part.startsWith("outputs/")) : null,
  };
}

function detectIntent(input) {
  const text = normalize(input).toLowerCase();

  if (!text) {
    return "menu";
  }

  if (
    text.includes("full qa") ||
    text.includes("full pipeline") ||
    text.includes("run everything") ||
    text.includes("test and automate")
  ) {
    return "full-pipeline";
  }

  if (
    text.includes("what can you do") ||
    text === "help" ||
    text === "menu" ||
    text.includes("show skills")
  ) {
    return "menu";
  }

  const skillMatchers = [
    ["write-acceptance-criteria", ["acceptance criteria", "write ac", "generate ac"]],
    ["manual-testing", ["manual testing", "run tests", "do qa", "test "]],
    ["test-charter", ["test charter", "publish charter", "charter"]],
    ["ui-test-figma", ["figma", "compare design", "ui test", "check design"]],
    ["bug-reporting", ["bug report", "file a bug", "log a bug"]],
    ["automation", ["automation", "gherkin", "playwright", "pom", "bdd"]],
  ];

  for (const [intent, patterns] of skillMatchers) {
    if (patterns.some((pattern) => text.includes(pattern))) {
      return intent;
    }
  }

  if (extractJiraCardId(input)) {
    return "qa-agent";
  }

  return "unknown";
}

function summarizeFullPipeline(context) {
  const phases = [
    "Phase 1 -> write-acceptance-criteria",
    "Phase 2 -> manual-testing",
    context.figmaUrl ? "Phase 3 -> ui-test-figma" : "Phase 3 -> ui-test-figma (skip unless Figma URL is provided)",
    "Phase 4 -> automation",
  ];

  const missing = [];
  if (!context.jiraCardId) {
    missing.push("Jira card ID");
  }
  if (!context.appUrl) {
    missing.push("App URL");
  }

  return {
    type: "full-pipeline",
    command: "/qa-agent",
    label: "Full QA Pipeline",
    phases,
    missing,
    summary: context.jiraCardId
      ? `Run the QA pipeline for ${context.jiraCardId}.`
      : "Run the full QA pipeline after the Jira card and app URL are provided.",
  };
}

function summarizeSkill(skill, context) {
  const missing = (skill.needs || []).filter((field) => !context[field]).map((field) => requiredFieldLabels[field]);

  return {
    type: skill.kind,
    skillId: skill.id,
    label: skill.title,
    command: skill.command,
    available: skill.available,
    missing,
    note: skill.note || null,
    summary: skill.available
      ? `Route the request to ${skill.title}.`
      : `${skill.title} is referenced in the repo, but it is not fully wired yet.`,
  };
}

function routeRequest(input) {
  const context = extractContext(input);
  const intent = detectIntent(input);

  if (intent === "menu") {
    return {
      intent,
      context,
      result: {
        type: "menu",
        label: "Skill Menu",
        skills: skills.map((skill) => ({
          id: skill.id,
          title: skill.title,
          available: skill.available,
        })),
      },
    };
  }

  if (intent === "full-pipeline") {
    return {
      intent,
      context,
      result: summarizeFullPipeline(context),
    };
  }

  const matchedSkill = skills.find((skill) => skill.id === intent);

  if (matchedSkill) {
    return {
      intent,
      context,
      result: summarizeSkill(matchedSkill, context),
    };
  }

  const fallback = skills.find((skill) => skill.id === "qa-agent");

  return {
    intent,
    context,
    result: {
      type: "fallback",
      label: fallback.title,
      command: fallback.command,
      summary: "Use the QA Agent as the natural-language entrypoint and ask one follow-up question if needed.",
    },
  };
}

module.exports = {
  routeRequest,
};
