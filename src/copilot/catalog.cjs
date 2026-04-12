const fs = require("fs");
const path = require("path");
const { getWorkspaceRoot } = require("./runtime.cjs");

function parseFrontmatter(content) {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return { data: {}, body: content };
  }

  const parts = trimmed.split("\n");
  let endIndex = -1;
  for (let index = 1; index < parts.length; index += 1) {
    if (parts[index].trim() === "---") {
      endIndex = index;
      break;
    }
  }

  if (endIndex === -1) {
    return { data: {}, body: content };
  }

  const frontmatterLines = parts.slice(1, endIndex);
  const body = parts.slice(endIndex + 1).join("\n");
  const data = {};
  let activeKey = null;

  frontmatterLines.forEach((line) => {
    if (!line.trim()) {
      return;
    }

    if (line.startsWith("  ") && activeKey) {
      data[activeKey] = `${data[activeKey]} ${line.trim()}`.trim();
      return;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      return;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    data[key] = value;
    activeKey = key;
  });

  return { data, body };
}

function collectFiles(dirPath, filename) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dirPath, entry.name, filename))
    .filter((filePath) => fs.existsSync(filePath));
}

function extractChecklist(body) {
  const lines = body.split("\n").map((line) => line.trim());
  const checklist = [];

  lines.forEach((line) => {
    const orderedMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*/);
    if (orderedMatch) {
      checklist.push(orderedMatch[1].trim());
      return;
    }

    const headingMatch = line.match(/^##+\s+Step\s+\d+[A-Z]?\s+[—-]\s+(.+)/i);
    if (headingMatch) {
      checklist.push(headingMatch[1].trim());
    }
  });

  return checklist.slice(0, 6);
}

function buildEntry(filePath, type) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, body } = parseFrontmatter(raw);
  const id = data.name || path.basename(path.dirname(filePath));
  const description = (data.description || "").replace(/^>\s*/, "").trim();

  return {
    id,
    type,
    filePath,
    description,
    userInvocable: String(data["user-invocable"]).toLowerCase() === "true",
    argumentHint: data["argument-hint"] || null,
    checklist: extractChecklist(body),
    body,
  };
}

function loadCatalog() {
  const projectRoot = getWorkspaceRoot();
  const commandsDir = path.join(projectRoot, ".claude", "commands");
  const skillsDir = path.join(projectRoot, ".claude", "skills");

  const commandFiles = fs.existsSync(commandsDir)
    ? fs
        .readdirSync(commandsDir)
        .filter((name) => name.endsWith(".md"))
        .map((name) => path.join(commandsDir, name))
    : [];

  const skillFiles = collectFiles(skillsDir, "SKILL.md");

  return {
    commands: commandFiles.map((filePath) => buildEntry(filePath, "command")),
    skills: skillFiles.map((filePath) => buildEntry(filePath, "skill")),
  };
}

module.exports = {
  loadCatalog,
};
