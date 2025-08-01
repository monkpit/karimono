export default {
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
  'package-lock.json': [() => 'npm run generate-license-report', 'git add LICENSES.md'],
};
