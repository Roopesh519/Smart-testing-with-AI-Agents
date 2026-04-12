const fs = require("fs");
const path = require("path");
const { getBundleRoot } = require("../copilot/runtime.cjs");

const SEEDED_FILES = [
  ".claude",
  "templates",
  "outputs",
  "test",
  "cucumber.cjs",
  "copilot.config.json",
  "README.md",
];

function copyIfMissing(sourcePath, targetPath) {
  if (fs.existsSync(targetPath)) {
    return;
  }

  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
  });
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureDesktopWorkspace(workspaceRoot) {
  const bundleRoot = getBundleRoot();
  ensureDirectory(workspaceRoot);

  SEEDED_FILES.forEach((entry) => {
    const sourcePath = path.join(bundleRoot, entry);
    const targetPath = path.join(workspaceRoot, entry);

    if (!fs.existsSync(sourcePath)) {
      return;
    }

    copyIfMissing(sourcePath, targetPath);
  });

  ensureDirectory(path.join(workspaceRoot, "outputs"));

  return workspaceRoot;
}

module.exports = {
  ensureDesktopWorkspace,
};
