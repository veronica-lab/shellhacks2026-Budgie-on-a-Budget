import { useEffect, useState } from 'react';
import './Auth.css';
import './Portal.css';
import { SiteHeader } from './Home.jsx';
import EventFeedCard from './EventFeedCard.jsx';
import { refreshEvents, useEvents } from './eventStore.js';

const REFRESH_MS = 60_000;
const asZip = (value) => (/^\d{5}$/.test(value) ? value : '');
const zipHref = (zip) => (zip ? `#/community?zip=${zip}` : '#/community');
const formatTime = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// Reload posts when the page opens, when the visitor comes back to the tab, and every
// minute while it's visible, so newly published posts show up without a page reload.
function useLiveRefresh() {
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refreshEvents();
    };
    refreshEvents();
    const timer = setInterval(refreshIfVisible, REFRESH_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, []);
}

// The selected ZIP lives in the URL ("#/community?zip=33174") so it survives reloads and
// can be linked to. Partial input shows every ZIP until all 5 digits are in.
function ZipPicker({ zip }) {
  const [draft, setDraft] = useState(zip);
  const [syncedZip, setSyncedZip] = useState(zip);

  // The URL changed from outside (a link, Back): show the new ZIP in the box.
  if (zip !== syncedZip) {
    setSyncedZip(zip);
    if (asZip(draft) !== zip) setDraft(zip);
  }

  const onChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setDraft(value);
    if (asZip(value) !== zip) window.location.replace(zipHref(asZip(value)));
  };

  return (
    <div className="field feed__filter">
      <label htmlFor="feed-zip">Your ZIP code</label>
      <input id="feed-zip" value={draft} onChange={onChange} inputMode="numeric" maxLength={5}
        placeholder="e.g. 33174" autoComplete="postal-code" />
    </div>
  );
}

function LoadError({ error, loadedAt }) {
  return (
    <div className="auth__error feed__error" role="alert">
      <p>
        <strong>
          {loadedAt
            ? `Couldn’t refresh live events. The posts below are from ${formatTime(loadedAt)}.`
            : 'Couldn’t load live events from local businesses.'}
        </strong>{' '}
        {error.message}
      </p>
      {error.fix && <p className="portal__fix"><strong>How to fix:</strong> {error.fix}</p>}
      <button className="pill pill--outline feed__retry" type="button" onClick={refreshEvents}>Try again</button>
    </div>
  );
}

function EventList({ events, shown, zip, loadedAt }) {
  if (events.length === 0) {
    return <p className="feed__empty">No local businesses have posted events yet. Check back soon.</p>;
  }

  return (
    <>
      <div className="feed__status">
        <p role="status">
          {shown.length} {shown.length === 1 ? 'event' : 'events'} {zip ? `in ZIP ${zip}` : 'in all ZIP codes'}
          {zip && <> &middot; <a href={zipHref('')}>Show all ZIP codes</a></>}
        </p>
        <p className="feed__updated">Updated {formatTime(loadedAt)}</p>
      </div>
      {shown.length === 0 ? (
        <p className="feed__empty">No events in ZIP {zip} yet. Try a nearby ZIP code.</p>
      ) : (
        <ul className="feed__list">
          {shown.map((ev) => (
            <EventFeedCard key={ev.event_id} event={ev} />
          ))}
        </ul>
      )}
    </>
  );
}

export default function CommunityPage({ session, authLoading, zip }) {
  const { events, status, error, loadedAt } = useEvents();
  useLiveRefresh();
  const shown = zip ? events.filter((ev) => ev.zip_code === zip) : events;

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main').focus(); }}>
        Skip to content
      </a>
      <SiteHeader session={session} authLoading={authLoading} current="community" />
      <main className="feed feed--page" id="main" tabIndex={-1} aria-labelledby="feed-title">
        <div className="feed__inner">
          <div className="feed__head">
            <div>
              <p className="eyebrow">Community</p>
              <h1 className="intro__title" id="feed-title">{zip ? `Events in ${zip}` : 'Events near you'}</h1>
              <p className="feed__lead">Live events and new-neighbor perks posted by local businesses.</p>
            </div>
            <ZipPicker zip={zip} />
          </div>

          {status === 'error' && <LoadError error={error} loadedAt={loadedAt} />}
          {!loadedAt && status !== 'error' && <p className="feed__empty" role="status">Loading live events…</p>}
          {loadedAt && <EventList events={events} shown={shown} zip={zip} loadedAt={loadedAt} />}

          <aside className="feed__biz" aria-labelledby="feed-biz-title">
            <div>
              <h2 className="feed__biz-title" id="feed-biz-title">Run a local business?</h2>
              <p>Post an event or a welcome perk and meet the people who just moved in nearby.</p>
            </div>
            <a className="pill pill--solid feed__biz-link" href="#/business">Advertise with us</a>
          </aside>
        </div>
      </main>
      <footer className="site-footer">
        <p>&copy; 2026 Budgie. Built at ShellHacks.</p>
      </footer>
    </>
  );
}
