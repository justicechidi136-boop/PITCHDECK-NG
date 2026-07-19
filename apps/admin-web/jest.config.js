/** @type {import("jest").Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@pitchdeck/ui$": "<rootDir>/../../packages/ui/src/index.ts",
    "^@pitchdeck/ui/(.*)$": "<rootDir>/../../packages/ui/src/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
        },
      },
    ],
  },
  testMatch: ["**/*.test.tsx", "**/*.test.ts"],
};

export default config;
