/**
 * Jest runs COMPONENT tests only (*.test.tsx) — anything that needs React
 * Native rendering. Pure logic (*.test.ts: exam engine, DB SQL, design math)
 * runs on Node's built-in test runner against real SQLite:
 *   npm run test:node
 * The split is by file extension so the two runners never overlap.
 */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['<rootDir>/src/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|expo-router|expo-sqlite|expo-font|expo-localization|expo-modules-core)',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
};
