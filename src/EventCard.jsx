export default function EventCard({ event }) {
  return (
    <div style={{ minWidth: 220, maxWidth: 260, fontFamily: 'system-ui, sans-serif', color: '#222' }}>
      {event.is_promoted && (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginBottom: 4 }}>
          ★ PROMOTED
        </div>
      )}
      <div style={{ fontSize: 16, fontWeight: 700 }}>{event.title}</div>
      <div style={{ fontSize: 14, color: '#555', margin: '2px 0 6px' }}>
        {event.business_name} · {event.date_time}
      </div>
      {event.new_mover_perk && (
        <div style={{
          fontSize: 13, background: '#fef3c7', borderRadius: 6,
          padding: '6px 8px', marginBottom: 6,
        }}>
          🎁 New mover perk: {event.new_mover_perk}
        </div>
      )}
      {event.attendees_count != null && (
        <div style={{ fontSize: 13, color: '#666' }}>{event.attendees_count} neighbors going</div>
      )}
      {event.url && (
        <a href={event.url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>Get tickets →</a>
      )}
    </div>
  );
}