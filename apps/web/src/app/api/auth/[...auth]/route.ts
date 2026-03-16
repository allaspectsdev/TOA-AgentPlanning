import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const authPath = url.pathname; // /api/auth/...
  const target = `${API_URL}${authPath}${url.search}`;

  const headers = new Headers();
  // Forward essential headers
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  // Forward cookies from browser → API
  const cookie = req.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  // Better-Auth requires Origin header
  headers.set('origin', API_URL);

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    redirect: 'manual',
  });

  const body = await res.text();
  const responseHeaders = new Headers();
  res.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k !== 'transfer-encoding' && k !== 'connection') {
      responseHeaders.append(key, value);
    }
  });

  return new NextResponse(body, {
    status: res.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
