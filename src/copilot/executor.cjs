const path = require("path");
const { loadCatalog } = require("./catalog.cjs");

function toRelative(filePath) {
  return path.relative(process.cwd(), filePath) || filePath;
}

function findEntry(catalog, type, id) {
  const list = catalog[type] || [];
  return list.find((entry) => entry.id === id) || null;
}

function buildPromptForMissing(missing) {
  if (!missing || missing.length === 0) {
    return null;
  }

  if (missing.length === 1) {
    return `Need ${missing[0]} before this can run.`;
  }

  return `Need these inputs before this can run: ${missing.join(", ")}.`;
}

function buildExecutionPlan(routing) {
  const catalog = loadCatalog();
  const notes = [];

  if (routing.result.type === "menu") {
    return {
      action: "show-menu",
      notes: ["Present the QA Agent menu and wait for the user to choose a skill."],
      files: [],
      steps: [],
      prompt: null,
    };
  }

  if (routing.result.type === "full-pipeline") {
    const qaAgent = findEntry(catalog, "skills", "qa-agent");
    const phases = [
      "write-acceptance-criteria",
      "manual-testing",
      "ui-test-figma",
      "automation",
    ]
      .map((skillId) => findEntry(catalog, "skills", skillId))
      .filter(Boolean);

    return {
      action: "run-pipeline",
      notes: [
        "Dispatch through the QA Agent orchestrator.",
        qaAgent ? `Primary skill file: ${toRelative(qaAgent.filePath)}` : "QA Agent skill file not found.",
      ],
      files: [qaAgent, ...phases].filter(Boolean).map((entry) => toRelative(entry.filePath)),
      steps: phases.map((entry, index) => ({
        title: `Phase ${index + 1}: ${entry.id}`,
        preview: entry.checklist[0] || entry.description || "Follow the skill instructions.",
      })),
      prompt: buildPromptForMissing(routing.result.missing),
    };
  }

  const skillEntry = findEntry(catalog, "skills", routing.result.skillId);
  const commandEntry = findEntry(catalog, "commands", routing.result.skillId);

  if (!skillEntry && !commandEntry) {
    return {
      action: "fallback",
      notes: ["Use the QA Agent as the fallback natural-language dispatcher."],
      files: [],
      steps: [],
      prompt: null,
    };
  }

  const primary = skillEntry || commandEntry;
  const files = [skillEntry, commandEntry].filter(Boolean).map((entry) => toRelative(entry.filePath));
  const steps = primary.checklist.map((item, index) => ({
    title: `Step ${index + 1}`,
    preview: item,
  }));

  if (!skillEntry) {
    notes.push("This flow is defined by a command file rather than a skill file.");
  }

  if (!commandEntry && skillEntry && skillEntry.userInvocable) {
    notes.push("This flow can be invoked directly from the skill definition.");
  }

  if (routing.result.note) {
    notes.push(routing.result.note);
  }

  return {
    action: "run-skill",
    notes,
    files,
    steps,
    prompt: buildPromptForMissing(routing.result.missing),
  };
}

module.exports = {
  buildExecutionPlan,
};
