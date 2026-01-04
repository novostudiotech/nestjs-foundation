export default {
  '*.{ts,js,tsx,jsx}': ['biome check --write', 'biome format --write'],
  '*.json': ['biome format --write'],
};
