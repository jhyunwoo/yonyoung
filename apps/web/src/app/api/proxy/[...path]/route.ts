import { apiBaseUrl } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

async function proxyRequest(req: NextRequest, paramsPromise: Promise<{ path: string[] }>) {
  const params = await paramsPromise;
  const path = params.path.join("/");
  const query = req.nextUrl.search || "";
  const targetUrl = `${apiBaseUrl().replace(/\/$/, "")}/${path}${query}`;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req.body,
    duplex: "half"
  } as RequestInit);

  const responseHeaders = new Headers(response.headers);
  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders
  });
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, context.params);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, context.params);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, context.params);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, context.params);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, context.params);
}
