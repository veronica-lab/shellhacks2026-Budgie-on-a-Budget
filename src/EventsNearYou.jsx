import { useState } from 'react';

const TICKETMASTER_API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;
console.log('Ticketmaster key loaded:', !!TICKETMASTER_API_KEY);

export default function EventsNearYou() {
  const [zipCode, setZipCode] = useState('');
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

   async function handleFindEvents() {
  setError('');
  setLocation(null);
  setEvents([]);

  if (!/^\d{5}$/.test(zipCode)) {
    setError('Please enter a valid 5-digit ZIP code.');
    return;
  }

  try {
    setLoading(true);

    // Get ZIP code data
    const response = await fetch('/zip-centroids.json');

    if (!response.ok) {
      throw new Error('Could not load ZIP code data.');
    }

    const zips = await response.json();

    const match = zips.find((z) => z.zip === zipCode);

    if (!match) {
      setError('We could not find that ZIP code.');
      return;
    }

    const selectedLocation = {
      zip: match.zip,
      lat: match.lat,
      lng: match.lng,
    };

    setLocation(selectedLocation);

    // Ticketmaster API request
    const params = new URLSearchParams({
    apikey: TICKETMASTER_API_KEY,
    latlong: `${match.lat},${match.lng}`,
    radius: '30',
    unit: 'miles',
    size: '20',
    sort: 'distance,asc',
    });

    const ticketmasterResponse = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params}`
    );

    if (!ticketmasterResponse.ok) {
  const errorText = await ticketmasterResponse.text();

  console.error('Ticketmaster error:', {
    status: ticketmasterResponse.status,
    response: errorText,
  });

  throw new Error(
    `Ticketmaster request failed (${ticketmasterResponse.status}).`
  );
}

    const ticketmasterData = await ticketmasterResponse.json();

    const foundEvents = ticketmasterData._embedded?.events || [];

    setEvents(foundEvents);

  } catch (err) {
  console.error('Events error:', err);
  setError(err.message || 'Something went wrong while finding events.');
} finally {
    setLoading(false);
  }
}

  return (
    <section>
      <h2>Events near you</h2>

      <p>
        Enter a ZIP code to discover what's happening nearby.
      </p>

      <input
        type="text"
        value={zipCode}
        onChange={(e) => setZipCode(e.target.value)}
        placeholder="Enter ZIP code"
        maxLength={5}
        inputMode="numeric"
      />

      <button type="button" onClick={handleFindEvents}>
        Find Events
      </button>

      {error && (
        <p role="alert">
          {error}
        </p>
      )}

      {location && (
        <div>
          <p>
            Found ZIP code: <strong>{location.zip}</strong>
          </p>

          <p>
            Coordinates: {location.lat}, {location.lng}
          </p>
        </div>
      )}
      {loading && (
  <p>Finding events near you...</p>
)}

{events.length > 0 && (
  <div>
    <h3>Upcoming events</h3>

    {events.map((event) => (
      <article key={event.id}>
        <h4>{event.name}</h4>

        <p>
          {event.dates?.start?.localDate || 'Date coming soon'}
        </p>

        <p>
          {event._embedded?.venues?.[0]?.name || 'Venue coming soon'}
        </p>

        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Event
          </a>
        )}
      </article>
    ))}
  </div>
)}
    </section>
  );
}