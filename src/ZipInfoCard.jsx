function formatValue(zip) {
  if (zip.home_value == null) return 'No data';
  const k = `$${Math.round(zip.home_value / 1000)}k`;
  if (zip.value_change_1y == null) return k;
  const sign = zip.value_change_1y > 0 ? '+' : '';
  return `${k} (${sign}${zip.value_change_1y}%/yr)`;
}

const buttonStyle = {
  flex: 1, padding: '7px 8px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  borderRadius: 6, border: '1px solid #d1d5db', background: '#f9fafb', color: '#111',
};

export default function ZipInfoCard({ zip, onShowHomes }) {
  const rows = [
    ['County', zip.county ?? 'Unknown'],
    ['Distance', `${zip.miles.toFixed(1)} mi away`],
    ['Commute', zip.commute_mins != null ? `${zip.commute_mins} min` : 'Calculating…'],
    ['Home value', formatValue(zip)],
    ['Safety', zip.safety_score != null ? `${zip.safety_score}/100` : 'Not enough data'],
    ['Public schools', zip.schools_nearby ?? 0],
  ];

  return (
    <div style={{ minWidth: 240, fontFamily: 'system-ui, sans-serif', color: '#222' }}>
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
      {onShowHomes && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button style={buttonStyle} onClick={() => onShowHomes('rent')}>🏠 Rentals</button>
          <button style={buttonStyle} onClick={() => onShowHomes('sale')}>🏡 For sale</button>
        </div>
      )}
      <a href={`#/community?zip=${zip.zip}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 14 }}>
        See community events in {zip.zip} →
      </a>
    </div>
  );
}