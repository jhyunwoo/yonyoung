import { readFile } from "node:fs/promises";

const files = ["base.json", "nextjs.json", "worker.json"];

await Promise.all(
  files.map(async (file) => {
    const source = await readFile(
      new URL(`../${file}`, import.meta.url),
      "utf8",
    );
    JSON.parse(source);
  }),
);
