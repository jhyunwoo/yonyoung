/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular-deps",
      comment: "순환 의존성은 유지보수 난이도를 급격히 높입니다.",
      severity: "error",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "no-api-to-web-import",
      comment: "API 레이어는 Web 앱 구현에 의존하면 안 됩니다.",
      severity: "error",
      from: {
        path: "^apps/api/",
      },
      to: {
        path: "^apps/web/",
      },
    },
    {
      name: "no-web-to-api-import",
      comment: "Web 앱은 API 앱 구현에 직접 의존하면 안 됩니다.",
      severity: "error",
      from: {
        path: "^apps/web/",
      },
      to: {
        path: "^apps/api/",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "(^|/)node_modules/",
    },
    includeOnly: "^apps/|^packages/",
    exclude: {
      path: "\\.next/|\\.open-next/|coverage/|drizzle/meta/",
    },
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/[^/]+",
      },
    },
  },
};
