// Root Cucumber config — used for dry-run and ad-hoc runs
module.exports = {
  default: {
    import: ['test/step-definations/**/*.cjs'],
    format: ['progress'],
  },
};
