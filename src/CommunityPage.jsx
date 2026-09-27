import { useEffect, useState } from 'react';
import './Auth.css';
import './Portal.css';
import './Community.css';
import { SiteHeader } from './Home.jsx';
import { categoryLabel } from './eventCategories.js';
import PinIcon from './PinIcon.jsx';
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

// ---------- The board: one featured event, then a grid ----------

// One accent per category (label text + dot on the cream card), dark enough to read (4.5:1 or better)
const CATEGORY_ACCENTS = {
  cafe: '#806400',
  food: '#806400',
  fitness: '#3f5a22',
  music: '#2d4a1c',
  market: '#5b7229',
  arts: '#806400',
  family: '#806400',
  community: '#1e3a0e',
  other: '#4f6627',
};
const accentOf = (category) => CATEGORY_ACCENTS[category] ?? CATEGORY_ACCENTS.other;

// Light panes (mascot yellows, light green) get dark text; the rest use the accent with white text
const LIGHT_PANES = {
  cafe: '#f3c94f',
  food: '#f8cb3c',
  arts: '#fde68f',
  family: '#fcd95a',
  other: '#c5d99e',
};
const paneStyle = (category) => {
  const light = LIGHT_PANES[category] ?? (CATEGORY_ACCENTS[category] ? null : LIGHT_PANES.other);
  return light
    ? { '--accent': accentOf(category), '--accent-bg': light, '--accent-ink': 'var(--forest)' }
    : { '--accent': accentOf(category) };
};

const DAY_MS = 86_400_000;
const startOf = (ev) => {
  const date = new Date(ev.starts_at);
  return Number.isNaN(date.getTime()) ? null : date;
};
const sameDay = (a, b) => a.toDateString() === b.toDateString();

// "Today · 7:30 PM", "Tomorrow · 9 AM", "Sat, Oct 31 · 1:56 AM"; falls back to the business's own label
function whenText(ev, now) {
  const date = startOf(ev);
  if (!date) return ev.date_time;
  const time = formatTime(date);
  if (sameDay(date, now)) return `Today · ${time}`;
  if (sameDay(date, new Date(now.getTime() + DAY_MS))) return `Tomorrow · ${time}`;
  return `${date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`;
}

// Date filters, all worked out from each post's real start time
const WHEN_FILTERS = [
  { id: 'any', label: 'Any time', test: () => true },
  { id: 'today', label: 'Today', test: (d, now) => sameDay(d, now) },
  {
    id: 'weekend',
    label: 'This weekend',
    test: (d, now) => {
      // From now until the end of the coming Sunday; on a weekend, that's the current one.
      const sunday = new Date(now);
      sunday.setDate(now.getDate() + ((7 - now.getDay()) % 7));
      sunday.setHours(23, 59, 59, 999);
      return (d.getDay() === 6 || d.getDay() === 0) && d <= sunday;
    },
  },
  { id: 'week', label: 'Next 7 days', test: (d, now) => d - now <= 7 * DAY_MS },
  { id: 'later', label: 'Later', test: (d, now) => d - now > 7 * DAY_MS },
];

const normalize = (text) => (text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Posts that look like the same event posted twice: same ZIP and title, starting within an
// hour, from the same business or at the same address. The newest one stays on the board;
// the rest are only hidden here (nothing is deleted) and can be shown again.
function splitRepeats(events) {
  const kept = [];
  const repeats = [];
  for (const ev of events) {
    const date = startOf(ev);
    const twin = kept.find((other) => {
      const otherDate = startOf(other);
      const sameBusiness = normalize(ev.business_name) === normalize(other.business_name)
        || normalize(ev.business_name).startsWith(normalize(other.business_name))
        || normalize(other.business_name).startsWith(normalize(ev.business_name));
      const sameAddress = ev.address && normalize(ev.address) === normalize(other.address);
      return ev.zip_code === other.zip_code
        && normalize(ev.title) === normalize(other.title)
        && date && otherDate && Math.abs(date - otherDate) <= 60 * 60_000
        && (sameBusiness || sameAddress);
    });
    (twin ? repeats : kept).push(ev);
  }
  return { kept, repeats };
}

const directionsHref = (ev) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ev.address} ${ev.zip_code}`)}`;

// A business-provided photo, if the post has one (only https URLs are shown)
const photoOf = (ev) => {
  const url = ev.photo_url ?? ev.image_url;
  return typeof url === 'string' && url.startsWith('https://') ? url : null;
};

// Without a photo: the category's color with the date set large, no stock imagery
function DateArt({ ev, now, large = false }) {
  const date = startOf(ev);
  const photo = photoOf(ev);
  return (
    <div className={`board-art${large ? ' board-art--large' : ''}${photo ? ' board-art--photo' : ''}`}>
      {photo && <img className="board-art__photo" src={photo} alt="" loading="lazy" />}
      {date ? (
        <p className="board-art__date" aria-hidden="true">
          <span className="board-art__weekday">{date.toLocaleDateString([], { weekday: 'short' })}</span>
          <span className="board-art__day">{date.getDate()}</span>
          <span className="board-art__month">{date.toLocaleDateString([], { month: 'short' })}</span>
          {large && <span className="board-art__time">{formatTime(date)}</span>}
        </p>
      ) : null}
      {date && date < now && <span className="board-art__started">Started</span>}
    </div>
  );
}

function CardMeta({ ev }) {
  return (
    <div className="board-card__meta">
      <p className="board-card__category">
        <span className="board-card__dot" aria-hidden="true"></span>
        {categoryLabel(ev.category)}
      </p>
      {ev.is_promoted && <span className="board-card__promoted">Promoted</span>}
    </div>
  );
}

function Details({ ev, now }) {
  return (
    <>
      <p className="board-card__when">{whenText(ev, now)}</p>
      <p className="board-card__venue">{ev.business_name}</p>
      {ev.address && (
        <p className="board-card__address">
          <span aria-hidden="true"><PinIcon /></span>{' '}
          <a href={directionsHref(ev)} target="_blank" rel="noreferrer">
            {ev.address}, {ev.zip_code}<span className="visually-hidden"> (opens directions in a new tab)</span>
          </a>
        </p>
      )}
      {!ev.address && <p className="board-card__address">ZIP {ev.zip_code}</p>}
    </>
  );
}

function Extras({ ev }) {
  return (
    <>
      {ev.new_mover_perk && (
        <p className="board-card__perk"><strong>New neighbor perk</strong> {ev.new_mover_perk}</p>
      )}
      {ev.attendees_count > 0 && (
        <p className="board-card__going">{ev.attendees_count} {ev.attendees_count === 1 ? 'neighbor' : 'neighbors'} going</p>
      )}
    </>
  );
}

function FeaturedEvent({ ev, now, upcoming }) {
  return (
    <article className="board-featured" style={paneStyle(ev.category)} aria-labelledby="featured-title">
      <DateArt ev={ev} now={now} large />
      <div className="board-featured__body">
        <p className="board-featured__kicker">{upcoming ? 'Next up' : 'Latest post'}</p>
        <CardMeta ev={ev} />
        <h2 className="board-featured__title" id="featured-title">{ev.title}</h2>
        <Details ev={ev} now={now} />
        {ev.description && <p className="board-card__desc">{ev.description}</p>}
        <Extras ev={ev} />
      </div>
    </article>
  );
}

function BoardCard({ ev, now }) {
  return (
    <li className="board-card" style={paneStyle(ev.category)}>
      <DateArt ev={ev} now={now} />
      <div className="board-card__body">
        <CardMeta ev={ev} />
        <h3 className="board-card__title">{ev.title}</h3>
        <Details ev={ev} now={now} />
        {ev.description && <p className="board-card__desc board-card__desc--clamp">{ev.description}</p>}
        <Extras ev={ev} />
      </div>
    </li>
  );
}

// Chips for one filter group; options with no events are left out.
function FilterGroup({ label, options, value, onChange }) {
  return (
    <div className="board-filter" role="group" aria-label={label}>
      <span className="board-filter__label" aria-hidden="true">{label}</span>
      {options.map((opt) => (
        <button key={opt.id} type="button" className="board-chip" aria-pressed={value === opt.id}
          onClick={() => onChange(opt.id)}>
          {opt.label} <span className="board-chip__count">{opt.count}</span>
        </button>
      ))}
    </div>
  );
}

function EventList({ events, shown, zip, loadedAt }) {
  const [when, setWhen] = useState('any');
  const [category, setCategory] = useState('all');
  const [showRepeats, setShowRepeats] = useState(false);

  if (events.length === 0) {
    return <p className="feed__empty">No local businesses have posted events yet. Check back soon.</p>;
  }

  const now = loadedAt;
  // Soonest first; anything that already started (the feed keeps a day's worth) goes last.
  const sorted = [...shown].sort((a, b) => {
    const da = startOf(a) ?? now;
    const db = startOf(b) ?? now;
    return (da < now) - (db < now) || da - db;
  });
  const { kept, repeats } = splitRepeats([...shown]); // server order: newest post first
  const onBoard = showRepeats ? sorted : sorted.filter((ev) => kept.includes(ev));

  const whenOptions = WHEN_FILTERS.map((f) => ({
    ...f,
    count: onBoard.filter((ev) => f.id === 'any' || (startOf(ev) && startOf(ev) >= now && f.test(startOf(ev), now))).length,
  })).filter((f) => f.id === 'any' || f.count > 0);
  const categories = [...new Set(onBoard.map((ev) => ev.category))];
  const categoryOptions = [
    { id: 'all', label: 'All', count: onBoard.length },
    ...categories.map((c) => ({ id: c, label: categoryLabel(c), count: onBoard.filter((ev) => ev.category === c).length })),
  ];

  // A filter whose option disappeared (e.g. after changing ZIP) falls back to showing everything.
  const whenFilter = whenOptions.find((f) => f.id === when) ?? WHEN_FILTERS[0];
  const activeCategory = categoryOptions.some((c) => c.id === category) ? category : 'all';
  const filtered = onBoard.filter((ev) => {
    const date = startOf(ev);
    const whenOk = whenFilter.id === 'any' || (date && date >= now && whenFilter.test(date, now));
    return whenOk && (activeCategory === 'all' || ev.category === activeCategory);
  });
  const isFiltered = whenFilter.id !== 'any' || activeCategory !== 'all';

  const featured = filtered.find((ev) => (startOf(ev) ?? now) >= now) ?? filtered[0];
  const rest = filtered.filter((ev) => ev !== featured);

  return (
    <>
      <div className="feed__status">
        <p role="status">
          {filtered.length} {filtered.length === 1 ? 'event' : 'events'} {zip ? `in ZIP ${zip}` : 'in all ZIP codes'}
          {zip && <> &middot; <a href={zipHref('')}>Show all ZIP codes</a></>}
        </p>
        <p className="feed__updated">Updated {formatTime(loadedAt)}</p>
      </div>

      {shown.length === 0 ? (
        <p className="feed__empty">No events in ZIP {zip} yet. Try a nearby ZIP code.</p>
      ) : (
        <>
          {(whenOptions.length > 1 || categoryOptions.length > 2) && (
            <div className="board-filters">
              {whenOptions.length > 1 && <FilterGroup label="When" options={whenOptions} value={whenFilter.id} onChange={setWhen} />}
              {categoryOptions.length > 2 && <FilterGroup label="Category" options={categoryOptions} value={activeCategory} onChange={setCategory} />}
            </div>
          )}

          {repeats.length > 0 && (
            <p className="board-repeats">
              {showRepeats
                ? `Showing ${repeats.length} ${repeats.length === 1 ? 'post that looks' : 'posts that look'} like a repeat of another listing.`
                : `${repeats.length} ${repeats.length === 1 ? 'post looks' : 'posts look'} like a repeat of another listing and ${repeats.length === 1 ? 'is' : 'are'} hidden.`}{' '}
              <button type="button" className="board-repeats__toggle" onClick={() => setShowRepeats((s) => !s)}>
                {showRepeats ? 'Hide repeats' : repeats.length === 1 ? 'Show it' : 'Show them'}
              </button>
            </p>
          )}

          {filtered.length === 0 ? (
            <p className="feed__empty">
              No events match these filters.{' '}
              <button type="button" className="board-repeats__toggle" onClick={() => { setWhen('any'); setCategory('all'); }}>
                Clear filters
              </button>
            </p>
          ) : (
            <div className="board">
              <FeaturedEvent ev={featured} now={now} upcoming={(startOf(featured) ?? now) >= now} />
              {rest.length > 0 && (
                <>
                  <h2 className="board__heading">{isFiltered ? 'Also matching' : 'More on the board'}</h2>
                  <ul className="board__grid">
                    {rest.map((ev) => <BoardCard key={ev.event_id} ev={ev} now={now} />)}
                  </ul>
                </>
              )}
            </div>
          )}
        </>
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
