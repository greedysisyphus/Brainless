module.exports = {
  root: true,
  // lib/shifts 是從 src 複製過來的 ES module 產物，用網站那邊的規範，不在這裡檢查
  ignorePatterns: ["lib/**"],
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    // 動態 import() 需要 2020 以上；Node 22 完全支援
    ecmaVersion: 2020,
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
