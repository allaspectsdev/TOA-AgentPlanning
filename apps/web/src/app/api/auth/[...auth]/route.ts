import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const authPath = url.pathname; // /api/auth/...
  const target = `${API_URL}${authPath}${url.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
  });

  const body = await res.text();
  const responseHeaders = new Headers();
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'transfer-encoding') {
      responseHeaders.set(key, value);
    }
  });

  // Forward Set-Cookie headers so auth cookies are set on the Next.js domain
  const cookies = res.headers.getSetCookie?.() ?? [];
  for (const cookie of cookies) {
    responseHeaders.append('set-cookie', cookie);
  }

  return new NextResponse(body, {
    status: res.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
