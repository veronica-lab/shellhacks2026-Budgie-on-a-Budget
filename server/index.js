import express from 'express';
import fs from 'fs';

const app = express();
app.use(express.json());

const toWaypoint = p => ({
  waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } },
});

// =====================================================================
// COMMUTE TIMES (Google Routes API)
// =====================================================================
const ROUTES_KEY = process.env.ROUTES_SERVER_KEY;
const ROUTES_URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
const BATCH_SIZE = 50;
const commuteCache = new Map();

if (!ROUTES_KEY) console.warn('ROUTES_SERVER_KEY is missing from .env');

app.post('/api/commute', async (req, res) => {
  const { destination, origins, travelMode = 'DRIVE' } = req.body || {};
  if (!destination || !Array.isArray(origins)) {
    return res.status(400).json({ error: 'Send { destination, origins }' });
  }

  const destKey = `${travelMode}|${destination.lat.toFixed(3)},${destination.lng.toFixed(3)}`;
  const results = {};
  const todo = [];
  for (const o of origins) {
    const k = `${destKey}|${o.zip}`;
    if (commuteCache.has(k)) results[o.zip] = commuteCache.get(k);
    else todo.push(o);
  }

  try {
    for (let i = 0; i < todo.length; i += BATCH_SIZE) {
      const batch = todo.slice(i, i + BATCH_SIZE);
      const response = await fetch(ROUTES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': ROUTES_KEY,
          'X-Goog-FieldMask': 'originIndex,duration,condition',
        },
        body: JSON.stringify({
          origins: batch.map(toWaypoint),
          destinations: [toWaypoint(destination)],
          travelMode,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        console.error('Routes API error:', details);
        return res.status(502).json({ error: 'Routes API request failed', details });
      }

      const elements = await response.json();
      for (const el of elements) {
        const origin = batch[el.originIndex ?? 0]; // Google leaves out index 0
        const mins = el.condition === 'ROUTE_EXISTS' && el.duration
          ? Math.round(parseInt(el.duration, 10) / 60)
          : null;
        results[origin.zip] = mins;
        commuteCache.set(`${destKey}|${origin.zip}`, mins);
      }
    }
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Commute lookup failed' });
  }
});

// =====================================================================
// HOME LISTINGS (RentCast): saved to a file, hard cap on paid calls
// =====================================================================
const RENTCAST_KEY = process.env.RENTCAST_API_KEY;
const LISTINGS_FILE = 'server/listings-cache.json';
const MAX_RENTCAST_CALLS = 40; // free plan is 50/month, then RentCast charges per request

let listingsStore = { calls: 0, data: {} };
try {
  listingsStore = JSON.parse(fs.readFileSync(LISTINGS_FILE, 'utf8'));
} catch { /* first run: no saved listings yet */ }

function saveListingsStore() {
  fs.writeFileSync(LISTINGS_FILE, JSON.stringify(listingsStore, null, 2));
}

const RENTCAST_URLS = {
  rent: 'https://api.rentcast.io/v1/listings/rental/long-term',
  sale: 'https://api.rentcast.io/v1/listings/sale',
};

function slimListing(l) {
  return {
    id: l.id,
    address: l.formattedAddress ?? l.addressLine1 ?? 'Address unavailable',
    lat: l.latitude,
    lng: l.longitude,
    price: l.price,
    beds: l.bedrooms ?? null,
    baths: l.bathrooms ?? null,
    sqft: l.squareFootage ?? null,
    property_type: l.propertyType ?? null,
    days_on_market: l.daysOnMarket ?? null,
  };
}

// GET /api/listings?zip=33174&type=rent   (type = rent or sale)
app.get('/api/listings', async (req, res) => {
  const zip = String(req.query.zip || '');
  const type = req.query.type === 'sale' ? 'sale' : 'rent';
  if (!/^\d{5}$/.test(zip)) return res.status(400).json({ error: 'Invalid ZIP' });

  const key = `${type}|${zip}`;
  if (listingsStore.data[key]) {
    return res.json({ listings: listingsStore.data[key], cached: true, callsUsed: listingsStore.calls });
  }
  if (!RENTCAST_KEY) {
    return res.status(503).json({ error: 'No RentCast key on this computer, and this ZIP is not saved yet.' });
  }
  if (listingsStore.calls >= MAX_RENTCAST_CALLS) {
    return res.status(429).json({ error: `RentCast limit reached (${MAX_RENTCAST_CALLS} calls). Only saved ZIPs work now.` });
  }

  try {
    listingsStore.calls += 1; // count it before calling, even if it fails
    saveListingsStore();

    const params = new URLSearchParams({ zipCode: zip, status: 'Active', limit: '30' });
    const response = await fetch(`${RENTCAST_URLS[type]}?${params}`, {
      headers: { 'X-Api-Key': RENTCAST_KEY, Accept: 'application/json' },
    });

    if (!response.ok) {
      const details = await response.text();
      console.error('RentCast error:', response.status, details);
      return res.status(502).json({ error: `RentCast request failed (${response.status})`, details });
    }

    const raw = await response.json();
    const listings = (Array.isArray(raw) ? raw : [])
      .map(slimListing)
      .filter(l => Number.isFinite(l.lat) && Number.isFinite(l.lng) && l.price);

    listingsStore.data[key] = listings;
    saveListingsStore();
    console.log(`RentCast: saved ${listings.length} ${type} listings for ${zip} (call ${listingsStore.calls}/${MAX_RENTCAST_CALLS})`);
    res.json({ listings, cached: false, callsUsed: listingsStore.calls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Listings lookup failed' });
  }
});

app.listen(3001, () => console.log('Server running on http://localhost:3001'));