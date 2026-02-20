#!/usr/bin/env node

import { createHash } from "node:crypto";

const args = Object.fromEntries(
  process.argv.slice(2).map((entry) => {
    const [key, value] = entry.split("=");
    return [key.replace(/^--/, ""), value ?? "true"];
  }),
);

const baseUrl = (args.baseUrl ?? process.env.CACHE_VERIFY_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const publicPath = args.publicPath ?? process.env.CACHE_VERIFY_PUBLIC_PATH ?? "/";
const personalizedPath =
  args.personalizedPath ?? process.env.CACHE_VERIFY_PERSONALIZED_PATH ?? "/admin";
const cookieA = args.cookieA ?? process.env.CACHE_VERIFY_COOKIE_A ?? "better-auth.session_token=fake-user-a";
const cookieB = args.cookieB ?? process.env.CACHE_VERIFY_COOKIE_B ?? "better-auth.session_token=fake-user-b";
const timeoutMs = Number.parseInt(args.timeoutMs ?? process.env.CACHE_VERIFY_TIMEOUT_MS ?? "30000", 10);

const normalizeHeader = (value) => (value ?? "").toLowerCase();

const assert = (condition, message, failures) => {
  if (!condition) {
    failures.push(message);
  }
};

const hashText = (text) =>
  createHash("sha256")
    .update(text)
    .digest("hex");

const fetchText = async (url, options = {}) => {
  const response = await fetch(url, options);
  const body = await response.text();
  return { response, body };
};

const fetchImmutableAssetPath = async () => {
  const { body } = await fetchText(`${baseUrl}${publicPath}`);
  const match = body.match(/\/_next\/static\/[^"']+\.js/g);
  if (!match) {
    return null;
  }

  return match[0] ?? null;
};

const failures = [];

const publicResponse = await fetch(`${baseUrl}${publicPath}`);
const publicCacheControl = publicResponse.headers.get("cache-control") ?? "";
assert(
  /public/i.test(publicCacheControl) && /s-maxage/i.test(publicCacheControl),
  `Expected public cache headers on ${publicPath}, got: ${publicCacheControl || "<missing>"}`,
  failures,
);

const personalizedA = await fetchText(`${baseUrl}${personalizedPath}`, {
  headers: {
    cookie: cookieA,
  },
});
const personalizedB = await fetchText(`${baseUrl}${personalizedPath}`, {
  headers: {
    cookie: cookieB,
  },
});

const personalizedCacheControl =
  personalizedA.response.headers.get("cache-control") ?? "";
assert(
  /private/i.test(personalizedCacheControl) || /no-store/i.test(personalizedCacheControl),
  `Expected private/no-store cache headers on ${personalizedPath}, got: ${personalizedCacheControl || "<missing>"}`,
  failures,
);

const varyHeader = normalizeHeader(personalizedA.response.headers.get("vary"));
assert(
  /cookie/.test(varyHeader) || /authorization/.test(varyHeader) || /no-store/i.test(personalizedCacheControl),
  `Expected Vary: Cookie/Authorization or no-store on ${personalizedPath}, got vary: ${varyHeader || "<missing>"}`,
  failures,
);

const bodyHashA = hashText(personalizedA.body);
const bodyHashB = hashText(personalizedB.body);
const isLikelyLeak =
  bodyHashA === bodyHashB &&
  personalizedA.response.status === 200 &&
  personalizedB.response.status === 200 &&
  !/no-store/i.test(personalizedCacheControl);
assert(!isLikelyLeak, "Potential personalized cache leakage detected", failures);

const immutableAssetPath = await fetchImmutableAssetPath();
let immutableAssetHeader = null;
if (immutableAssetPath) {
  const immutableResponse = await fetch(`${baseUrl}${immutableAssetPath}`);
  immutableAssetHeader = immutableResponse.headers.get("cache-control") ?? "";
  assert(
    /immutable/i.test(immutableAssetHeader),
    `Expected immutable cache header for ${immutableAssetPath}, got: ${immutableAssetHeader || "<missing>"}`,
    failures,
  );
} else {
  failures.push("Unable to discover a /_next/static/*.js asset from public HTML for immutable cache validation");
}

const isrPath = args.isrPath ?? process.env.CACHE_VERIFY_ISR_PATH;
const revalidateUrl = args.revalidateUrl ?? process.env.CACHE_VERIFY_REVALIDATE_URL;
let isrCheck = null;

if (isrPath && revalidateUrl) {
  const before = await fetchText(`${baseUrl}${isrPath}`, { cache: "no-store" });
  const revalidateResponse = await fetch(revalidateUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(args.revalidateSecret
        ? { "x-revalidate-secret": args.revalidateSecret }
        : process.env.REVALIDATE_SECRET
          ? { "x-revalidate-secret": process.env.REVALIDATE_SECRET }
          : {}),
    },
    body: JSON.stringify({ path: isrPath }),
  });

  const pollStartedAt = Date.now();
  let changed = false;
  let after = before;

  while (Date.now() - pollStartedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    after = await fetchText(`${baseUrl}${isrPath}`, { cache: "no-store" });
    if (hashText(before.body) !== hashText(after.body) || before.response.headers.get("etag") !== after.response.headers.get("etag")) {
      changed = true;
      break;
    }
  }

  isrCheck = {
    isrPath,
    revalidateStatus: revalidateResponse.status,
    changed,
  };

  assert(
    revalidateResponse.ok,
    `ISR revalidate endpoint returned ${revalidateResponse.status}`,
    failures,
  );
  assert(
    changed,
    `ISR response for ${isrPath} did not change within ${timeoutMs}ms after revalidate`,
    failures,
  );
}

const report = {
  baseUrl,
  publicPath,
  personalizedPath,
  checks: {
    publicCacheControl,
    personalizedCacheControl,
    personalizedStatuses: {
      cookieA: personalizedA.response.status,
      cookieB: personalizedB.response.status,
    },
    personalizedBodyHashes: {
      cookieA: bodyHashA,
      cookieB: bodyHashB,
    },
    immutableAssetPath,
    immutableAssetCacheControl: immutableAssetHeader,
    isrCheck,
  },
  failures,
};

console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
