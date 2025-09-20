export default {
  '*.{js,jsx,ts,tsx,mts,cts,cjs,mjs,json,yaml,yml}': ['pnpm exec prettier --write'],
  '*.{js,jsx,ts,tsx,mts,cts,cjs,mjs}': ['pnpm exec eslint --fix'],
};
