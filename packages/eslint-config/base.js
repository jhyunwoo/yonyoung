export const commonIgnores = [
  "**/node_modules/**",
  "**/.turbo/**",
  "**/coverage/**",
  "**/dist/**",
];

export const packageBoundaryPatterns = [
  {
    group: ["@yonyoung/*/src/**", "@yonyoung/*/src"],
    message: "Import a workspace package through one of its public exports.",
  },
  {
    group: ["packages/**/src/**", "../packages/**", "../../packages/**"],
    message: "Import a workspace package by its @yonyoung/* package name.",
  },
];

export const boundaryRule = (additionalPatterns = []) => ({
  "no-restricted-imports": [
    "error",
    {
      patterns: [...packageBoundaryPatterns, ...additionalPatterns],
    },
  ],
});
