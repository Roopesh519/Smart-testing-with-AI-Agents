module.exports = {
  default: {
    paths: ['test/E2E2/ChatInterface/*.feature'],
    import: ['test/step-definations/ChatInterface/*.cjs'],
    format: ['progress'],
    dryRun: false,
  },
  'dry-run': {
    paths: ['test/E2E2/ChatInterface/*.feature'],
    import: ['test/step-definations/ChatInterface/*.cjs'],
    format: ['progress'],
    dryRun: true,
  },
};
