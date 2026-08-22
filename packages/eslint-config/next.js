import { boundaryRule } from "./base.js";

export const nextArchitectureRules = boundaryRule([
  {
    group: [
      "@yonyoung/api",
      "@yonyoung/api/**",
      "apps/api",
      "apps/api/**",
      "../api/**",
      "../../api/**",
      "../../../api/**",
    ],
    message:
      "The web app may consume @yonyoung/contracts, never API implementation code.",
  },
]);
