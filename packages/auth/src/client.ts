import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";

<<<<<<< ours
<<<<<<< ours
=======
=======
<<<<<<< ours
>>>>>>> theirs
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
function toAuthBaseUrl(base: string) {
  return `${base.replace(/\/$/, "")}/api/auth`;
}

function resolveAuthBaseUrl() {
  if (typeof window !== "undefined" && typeof window.location?.origin === "string") {
    return toAuthBaseUrl(window.location.origin);
  }

  return toAuthBaseUrl(process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
<<<<<<< ours
=======
>>>>>>> theirs
>>>>>>> theirs
function resolveBaseURL() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`;
  }
  return `${(process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/auth`;
}

export const authClient = createAuthClient({
  baseURL: resolveBaseURL(),
<<<<<<< ours
<<<<<<< ours
=======
=======
<<<<<<< ours
>>>>>>> theirs
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
<<<<<<< ours
=======
>>>>>>> theirs
>>>>>>> theirs
  plugins: [passkeyClient()]
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
