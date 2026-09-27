const KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;

const CATEGORY_MAP = {
  'Music': 'music',
  'Sports': 'sports',
  'Arts & Theatre': 'arts',
  'Family': 'family',
};

// "2026-09-27" + "19:30:00" -> "Sun, Sep 27, 7:30 PM"
function formatDate(start = {}) {
  if (!start.localDate) return 'Date TBA';
  const date = new Date(`${start.localDate}T${start.localTime || '00:00:00'}`);
  return date.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    ...(start.localTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

// Converts one Ticketmaster event into the shape the map uses
function toMapEvent(tm) {
  const venue = tm._embedded?.venues?.[0];
  return {
    event_id: tm.id,
    title: tm.name,
    business_name: venue?.name ?? 'Local venue',
    category: CATEGORY_MAP[tm.classifications?.[0]?.segment?.name] ?? 'other',
    date_time: formatDate(tm.dates?.start),
    new_mover_perk: null,
    attendees_count: null,
    is_promoted: false,
    url: tm.url,
    lat: Number(venue?.location?.latitude),
    lng: Number(venue?.location?.longitude),
  };
}

export async function fetchTicketmasterEvents(lat, lng, radiusMiles = 30) {
  if (!KEY) {
    console.warn('No Ticketmaster key in .env');
    return [];
  }

  const params = new URLSearchParams({
    apikey: KEY,
    latlong: `${lat},${lng}`,
    radius: String(radiusMiles),
    unit: 'miles',
    size: '40',
    sort: 'date,asc',
  });

  const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
  if (!res.ok) throw new Error(`Ticketmaster request failed (${res.status})`);

  const data = await res.json();
  const events = (data._embedded?.events || [])
    .map(toMapEvent)
    .filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lng));

  // Many events share a venue, so nudge repeats slightly so every pin is clickable
  const seen = {};
  return events.map(e => {
    const key = `${e.lat},${e.lng}`;
    const n = (seen[key] = (seen[key] || 0) + 1);
    if (n === 1) return e;
    const angle = n * 1.3;
    const dist = 0.0015 * Math.sqrt(n);
    return { ...e, lat: e.lat + dist * Math.cos(angle), lng: e.lng + dist * Math.sin(angle) };
  });
}