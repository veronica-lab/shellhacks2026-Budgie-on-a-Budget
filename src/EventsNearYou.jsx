import { useState } from 'react';
import './EventsNearYou.css';

const TICKETMASTER_API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;

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

      // Find ZIP coordinates
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

      // Search Ticketmaster
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
        throw new Error(
          `Ticketmaster request failed (${ticketmasterResponse.status}).`
        );
      }

      const ticketmasterData = await ticketmasterResponse.json();

      const foundEvents = ticketmasterData._embedded?.events || [];

      setEvents(foundEvents);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong while finding events.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="events-near-you" id="community">

      {/* Header */}
      <div className="events-near-you__header">
        <p className="events-near-you__eyebrow">
          Explore your community
        </p>

        <h2 className="events-near-you__title">
          Events near you
        </h2>

        <p className="events-near-you__description">
          Discover concerts, sports, festivals, and other events happening
          around your future neighborhood.
        </p>
      </div>

      <div className="events-near-you__search">
        <input
          className="events-near-you__input"
          type="text"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          placeholder="Enter your ZIP code"
          maxLength={5}
          inputMode="numeric"
        />

        <button
          className="events-near-you__button"
          type="button"
          onClick={handleFindEvents}
          disabled={loading}
        >
          {loading ? 'Finding...' : 'Find Events'}
        </button>
      </div>

      
      {error && (
        <p className="events-near-you__error" role="alert">
          {error}
        </p>
      )}

      
      {location && (
        <p className="events-near-you__location">
          Showing events near{' '}
          <strong>{location.zip}</strong>
        </p>
      )}

      
      {loading && (
        <p className="events-near-you__loading">
          Finding events near you...
        </p>
      )}

      
      {events.length > 0 && (
        <div className="events-results">

          <div className="events-results__heading">
            <h3>Upcoming events</h3>

            <span className="events-results__count">
              {events.length} events found
            </span>
          </div>

          <div className="events-grid">

            {events.map((event) => {
              const venue = event._embedded?.venues?.[0];

              const image =
                event.images?.find((img) => img.width >= 300)?.url ||
                event.images?.[0]?.url;

              const date = event.dates?.start?.localDate;
              const time = event.dates?.start?.localTime;

              return (
                <article className="event-card" key={event.id}>

                  
                  {image && (
                    <div className="event-card__image-wrapper">
                      <img
                        className="event-card__image"
                        src={image}
                        alt=""
                      />
                    </div>
                  )}

                  
                  <div className="event-card__content">

                    <h4 className="event-card__title">
                      {event.name}
                    </h4>

                    <p className="event-card__date">
                      📅 {date || 'Date coming soon'}
                      {time && ` · ${time}`}
                    </p>

                    <p className="event-card__venue">
                      📍 {venue?.name || 'Venue coming soon'}
                    </p>

                    {venue?.city?.name && (
                      <p className="event-card__location">
                        {venue.city.name}
                        {venue.state?.stateCode &&
                          `, ${venue.state.stateCode}`}
                      </p>
                    )}

                    {event.url && (
                      <a
                        className="event-card__link"
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View event →
                      </a>
                    )}

                  </div>
                </article>
              );
            })}

          </div>
        </div>
      )}

     
      {!loading && location && events.length === 0 && !error && (
        <div className="events-empty">
          <p>
            We couldn't find any upcoming events within 30 miles.
          </p>
        </div>
      )}

    </section>
  );
}