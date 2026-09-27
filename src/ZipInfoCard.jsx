export default function ZipInfoCard({ zip }) {
  const rows = [
    ['Distance', `${zip.miles.toFixed(1)} mi away`],
    ['Commute', zip.commute_mins != null ? `${zip.commute_mins} min` : 'Coming soon'],
    ['Avg rent', zip.median_rent != null ? `$${zip.median_rent.toLocaleString()}/mo` : 'Coming soon'],
    ['Safety', zip.safety_score ?? 'Coming soon'],
    ['Schools nearby', zip.schools_nearby ?? 'Coming soon'],
  ];

  return (
    <div style={{ minWidth: 220, fontFamily: 'system-ui, sans-serif', color: '#222' }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>ZIP {zip.zip}</div>
      {rows.map(([label, value]) => (
        <div key={label} style={{
          display: 'flex', justifyContent: 'space-between', gap: 12,
          fontSize: 14, padding: '3px 0',
        }}>
          <span style={{ color: '#666' }}>{label}</span>
          <span style={{ fontWeight: 600 }}>{value}</span>
        </div>
      ))}
      <a href={`#/community?zip=${zip.zip}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 14 }}>
        See community events in {zip.zip} →
      </a>
    </div>
  );
}