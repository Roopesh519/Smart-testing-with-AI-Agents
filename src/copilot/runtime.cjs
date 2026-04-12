const path = require("path");

function getBundleRoot() {
  if (process.env.COPILOT_BUNDLE_ROOT) {
    return process.env.COPILOT_BUNDLE_ROOT;
  }

  return path.resolve(__dirname, "..", "..");
}

function getWorkspaceRoot() {
  return process.env.COPILOT_WORKSPACE || getBundleRoot();
}

module.exports = {
  getBundleRoot,
  getWorkspaceRoot,
};
