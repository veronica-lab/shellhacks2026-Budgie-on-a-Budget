export default function ZipInfoCard({ zip }) {
  const rows = [
    ['County', zip.county ?? 'Unknown'],
    ['Distance', `${zip.miles.toFixed(1)} mi away`],
    ['Commute', zip.commute_mins != null ? `${zip.commute_mins} min` : 'Coming soon'],
    ['Avg rent', zip.median_rent != null ? `$${zip.median_rent.toLocaleString()}/mo` : 'Coming soon'],
    ['Safety', zip.safety_score != null ? `${zip.safety_score}/100` : 'Not enough data'],
    ['Public schools', zip.schools_nearby ?? 0],
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
      {zip.safety_score != null && (
        <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
          Safety = % of US counties with a higher homicide rate
        </div>
      )}
    </div>
  );
}