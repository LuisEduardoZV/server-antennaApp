module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    './node_modules/standard/eslintrc.json'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' }, "import/resolver": {
    "node": {
        "moduleDirectory": ["node_modules", "src/"]
    }
}, },
}
