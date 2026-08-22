import { boundaryRule } from "./base.js";

export const workerArchitectureRules = boundaryRule([
  {
    group: [
      "@yonyoung/web",
      "@yonyoung/web/**",
      "apps/web",
      "apps/web/**",
      "../web/**",
      "../../web/**",
      "../../../web/**",
    ],
    message: "The Worker must never import Next.js application code.",
  },
]);
