module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  extends: [
    "eslint:recommended",
  ],
  rules: {
    "quotes": "off",
    "comma-dangle": "off",
    "indent": "off",
    "no-trailing-spaces": "off",
    "object-curly-spacing": "off",
    "arrow-parens": "off",
    "no-unused-vars": "off",
  },
};
