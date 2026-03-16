// ---------------------------------------------------------------------------
// Inngest Client — singleton instance for the @toa/engine
// ---------------------------------------------------------------------------

import { EventSchemas, Inngest } from 'inngest';
import type { Events } from './events.js';

/**
 * The Inngest client used by every function in the engine package.
 *
 * The `id` identifies this application to the Inngest dev server / cloud.
 * Event schemas are supplied as a type parameter so that `client.send()`
 * and function triggers are fully type-safe.
 */
export const inngest = new Inngest({
  id: 'toa-engine',
  schemas: new EventSchemas().fromRecord<Events>(),
});

export type ToaInngest = typeof inngest;
