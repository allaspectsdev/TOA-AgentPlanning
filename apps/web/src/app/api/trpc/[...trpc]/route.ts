import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const trpcPath = url.pathname.replace('/api/trpc', '/trpc');
  const target = `${API_URL}${trpcPath}${url.search}`;

  const headers = new Headers();
  // Forward essential headers
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  // Forward cookies from browser → API (session token)
  const cookie = req.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  // Forward org header if present
  const orgId = req.headers.get('x-org-id');
  if (orgId) headers.set('x-org-id', orgId);

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
  });

  const body = await res.text();
  const responseHeaders = new Headers();
  responseHeaders.set('content-type', res.headers.get('content-type') ?? 'application/json');

  return new NextResponse(body, {
    status: res.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
