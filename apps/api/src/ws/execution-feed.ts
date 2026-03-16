// ---------------------------------------------------------------------------
// WebSocket — Execution Event Feed
// ---------------------------------------------------------------------------
//
// Subscribes clients to real-time execution events using Redis Pub/Sub.
// Each execution publishes events to a Redis channel `execution:<id>`.
// Connected WebSocket clients receive these events as JSON messages.
// ---------------------------------------------------------------------------

import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import Redis from 'ioredis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubscribeMessage {
  type: 'subscribe';
  executionId: string;
}

interface UnsubscribeMessage {
  type: 'unsubscribe';
  executionId: string;
}

type ClientMessage = SubscribeMessage | UnsubscribeMessage;

interface ConnectedClient {
  ws: WebSocket;
  subscriptions: Set<string>;
  subscriber: Redis | null;
}

// ---------------------------------------------------------------------------
// Channel helpers
// ---------------------------------------------------------------------------

function channelName(executionId: string): string {
  return `execution:${executionId}`;
}

// ---------------------------------------------------------------------------
// Redis factory
// ---------------------------------------------------------------------------

function createRedisSubscriber(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  return new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
}

// ---------------------------------------------------------------------------
// Handler Registration
// ---------------------------------------------------------------------------

export async function registerExecutionFeed(app: FastifyInstance): Promise<void> {
  app.get(
    '/ws/executions',
    { websocket: true },
    (socket: WebSocket, _req) => {
      const client: ConnectedClient = {
        ws: socket,
        subscriptions: new Set(),
        subscriber: null,
      };

      app.log.info('WebSocket client connected to execution feed');

      // ── Handle incoming messages ──────────────────────────────────────
      socket.on('message', async (raw: Buffer | string) => {
        let msg: ClientMessage;
        try {
          msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf-8'));
        } catch {
          socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
          return;
        }

        if (msg.type === 'subscribe') {
          await handleSubscribe(app, client, msg.executionId);
        } else if (msg.type === 'unsubscribe') {
          await handleUnsubscribe(client, msg.executionId);
        } else {
          socket.send(
            JSON.stringify({ type: 'error', message: `Unknown message type` }),
          );
        }
      });

      // ── Cleanup on disconnect ─────────────────────────────────────────
      socket.on('close', async () => {
        app.log.info('WebSocket client disconnected from execution feed');
        await cleanupClient(client);
      });

      socket.on('error', async (err) => {
        app.log.error({ err }, 'WebSocket error');
        await cleanupClient(client);
      });

      // Send a welcome message
      socket.send(
        JSON.stringify({
          type: 'connected',
          message: 'Connected to execution feed. Send { "type": "subscribe", "executionId": "..." } to start receiving events.',
        }),
      );
    },
  );
}

// ---------------------------------------------------------------------------
// Subscribe to an execution's events
// ---------------------------------------------------------------------------

async function handleSubscribe(
  app: FastifyInstance,
  client: ConnectedClient,
  executionId: string,
): Promise<void> {
  if (client.subscriptions.has(executionId)) {
    client.ws.send(
      JSON.stringify({
        type: 'info',
        message: `Already subscribed to execution ${executionId}`,
      }),
    );
    return;
  }

  // Lazy-create the Redis subscriber for this client
  if (!client.subscriber) {
    client.subscriber = createRedisSubscriber();
    if (!client.subscriber) {
      // No Redis configured — send events inline (degraded mode)
      client.subscriptions.add(executionId);
      client.ws.send(
        JSON.stringify({
          type: 'subscribed',
          executionId,
          mode: 'polling',
          message: 'Redis not configured. Real-time events may be delayed.',
        }),
      );
      return;
    }

    try {
      await client.subscriber.connect();
    } catch (err) {
      app.log.error({ err }, 'Failed to connect Redis subscriber');
      client.subscriber = null;
      client.subscriptions.add(executionId);
      client.ws.send(
        JSON.stringify({
          type: 'subscribed',
          executionId,
          mode: 'polling',
        }),
      );
      return;
    }

    // Forward Redis messages to the WebSocket
    client.subscriber.on('message', (channel: string, message: string) => {
      if (client.ws.readyState === client.ws.OPEN) {
        client.ws.send(message);
      }
    });
  }

  const channel = channelName(executionId);
  await client.subscriber.subscribe(channel);
  client.subscriptions.add(executionId);

  client.ws.send(
    JSON.stringify({
      type: 'subscribed',
      executionId,
      channel,
    }),
  );
}

// ---------------------------------------------------------------------------
// Unsubscribe from an execution
// ---------------------------------------------------------------------------

async function handleUnsubscribe(
  client: ConnectedClient,
  executionId: string,
): Promise<void> {
  if (!client.subscriptions.has(executionId)) {
    return;
  }

  client.subscriptions.delete(executionId);

  if (client.subscriber) {
    const channel = channelName(executionId);
    await client.subscriber.unsubscribe(channel);
  }

  client.ws.send(
    JSON.stringify({
      type: 'unsubscribed',
      executionId,
    }),
  );
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanupClient(client: ConnectedClient): Promise<void> {
  client.subscriptions.clear();

  if (client.subscriber) {
    try {
      await client.subscriber.quit();
    } catch {
      // Best-effort cleanup
    }
    client.subscriber = null;
  }
}

// ---------------------------------------------------------------------------
// Publisher utility — used by the engine to push events
// ---------------------------------------------------------------------------

let _publisher: Redis | null = null;

/**
 * Publish an execution event to the Redis channel.
 * Called by Inngest functions in the engine to broadcast step events.
 */
export async function publishExecutionEvent(
  executionId: string,
  event: Record<string, unknown>,
): Promise<void> {
  if (!_publisher) {
    const url = process.env.REDIS_URL;
    if (!url) return; // No Redis — events won't be pushed in real time
    _publisher = new Redis(url);
  }

  const channel = channelName(executionId);
  const message = JSON.stringify({
    ...event,
    executionId,
    timestamp: new Date().toISOString(),
  });

  await _publisher.publish(channel, message);
}
