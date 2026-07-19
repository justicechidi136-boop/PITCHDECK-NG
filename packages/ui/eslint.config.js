import baseConfig from "@pitchdeck/config/eslint/base";

export default [
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        ecmaFeatures: { jsx: true },
      },
      globals: {
        JSX: "readonly",
      },
    },
  },
];
