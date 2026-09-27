import { CATEGORY_ICONS, categoryLabel } from './eventCategories.js';

// One event as residents see it in the community feed (also used for the business preview).
export default function EventFeedCard({ event, as: Tag = 'li' }) {
  return (
    <Tag className="feed-card">
      <div className="snip__head">
        <p className="snip__kind">
          <span aria-hidden="true">{CATEGORY_ICONS[event.category] ?? '📍'}</span> {categoryLabel(event.category)}
        </p>
        {event.is_promoted && <span className="snip__demo feed-card__promoted">Promoted</span>}
      </div>
      <h3 className="feed-card__title">{event.title}</h3>
      <p className="feed-card__meta">{event.business_name} &middot; {event.date_time} &middot; ZIP {event.zip_code}</p>
      {event.address && (
        <p className="feed-card__meta feed-card__address">
          <span aria-hidden="true">📍</span>{' '}
          {/* Published posts link to directions; the business preview shows plain text. */}
          {event.event_id ? (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.address} ${event.zip_code}`)}`}
              target="_blank" rel="noreferrer">
              {event.address}<span className="visually-hidden"> (opens directions in a new tab)</span>
            </a>
          ) : event.address}
        </p>
      )}
      {event.description && <p className="feed-card__desc">{event.description}</p>}
      {event.new_mover_perk && (
        <p className="feed-card__perk"><strong>New neighbor perk:</strong> {event.new_mover_perk}</p>
      )}
      {event.attendees_count > 0 && <p className="feed-card__meta">{event.attendees_count} neighbors going</p>}
    </Tag>
  );
}
