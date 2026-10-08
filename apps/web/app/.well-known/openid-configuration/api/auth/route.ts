import type { NextRequest } from "next/server";
import { proxyAuthMetadata } from "@/server/http/auth-metadata-proxy";

export const GET = (request: NextRequest) => proxyAuthMetadata(request, "openid-configuration");
