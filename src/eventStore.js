import { useSyncExternalStore } from 'react';

// Community posts published by businesses, read from Snowflake (BUDGIE_DB.APP.EVENTS)
// through the server's /api. Only live posts live here: no sample events are mixed in,
// so a failed load shows as an error rather than as a feed of fake posts.
// loadedAt is when the last successful load finished (null until then).
let state = { events: [], status: 'idle', error: null, loadedAt: null };
const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

// Calls the Budgie server and returns its JSON, or throws { message, fix?, fields? }.
export async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw { message: "Couldn't reach the Budgie server. Check that npm run dev is running, then try again." };
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (body?.error) throw body.error;
    // A bare 404 means the /api routes aren't loaded (e.g. a dev server started before they existed).
    if (res.status === 404) {
      throw {
        message: "The Budgie API isn't running on this server.",
        fix: 'Stop the dev server (Ctrl+C) and start it again with npm run dev.',
      };
    }
    throw { message: `The Budgie server returned HTTP ${res.status}. Try again.` };
  }
  return body;
}

// Callers that ask while a load is already running share it instead of starting another.
let inFlight = null;

export function refreshEvents() {
  if (inFlight) return inFlight;
  setState({ status: 'loading' });
  inFlight = api('/api/events')
    .then(({ events }) => setState({ events, status: 'ready', error: null, loadedAt: new Date() }))
    .catch((error) => setState({ status: 'error', error }))
    .finally(() => { inFlight = null; });
  return inFlight;
}

function subscribe(listener) {
  listeners.add(listener);
  if (state.status === 'idle') refreshEvents();
  return () => listeners.delete(listener);
}

// { events, status: 'idle' | 'loading' | 'ready' | 'error', error, loadedAt }
export function useEvents() {
  return useSyncExternalStore(subscribe, () => state);
}

// Saves a reviewed post to Snowflake. Throws { message, fix?, fields? } on failure.
export async function publishEvent(post) {
  const { event } = await api('/api/events', { method: 'POST', body: JSON.stringify(post) });
  // Show it right away in this tab; other tabs and visitors pick it up on their next load.
  setState({ events: [event, ...state.events.filter((e) => e.event_id !== event.event_id)] });
  return event;
}
