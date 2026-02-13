import { apiBaseUrl } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

async function authProxy(req: NextRequest, paramsPromise: Promise<{ all: string[] }>) {
  const params = await paramsPromise;
  const path = params.all.join("/");
  const query = req.nextUrl.search || "";
  const targetUrl = `${apiBaseUrl().replace(/\/$/, "")}/api/auth/${path}${query}`;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req.body,
    duplex: "half"
  } as RequestInit);

  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers
  });
}

export async function GET(req: NextRequest, context: { params: Promise<{ all: string[] }> }) {
  return authProxy(req, context.params);
}

export async function POST(req: NextRequest, context: { params: Promise<{ all: string[] }> }) {
  return authProxy(req, context.params);
}
