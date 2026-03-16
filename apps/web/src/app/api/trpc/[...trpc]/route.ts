import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

async function handler(req: NextRequest) {
  // Forward the request to the Fastify API server
  const url = new URL(req.url);
  const trpcPath = url.pathname.replace('/api/trpc', '/trpc');
  const target = `${API_URL}${trpcPath}${url.search}`;

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
    // Forward all headers except transfer-encoding
    if (key.toLowerCase() !== 'transfer-encoding') {
      responseHeaders.set(key, value);
    }
  });

  // Forward Set-Cookie headers
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
