/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["eslint:recommended"],
  rules: {
    "no-unused-vars": "warn",
    "no-console": "warn"
  },
  env: {
    node: true,
    es2022: true
  }
};
