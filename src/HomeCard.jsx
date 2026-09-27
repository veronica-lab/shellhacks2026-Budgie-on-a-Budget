import { formatPrice } from './listings';

export default function HomeCard({ home, type, medianPrice, zipHomeValue, isSaved, canSave, onToggleSave }) {
  const details = [
    home.beds != null && `${home.beds} bd`,
    home.baths != null && `${home.baths} ba`,
    home.sqft != null && `${home.sqft.toLocaleString()} sqft`,
  ].filter(Boolean).join(' · ');

  let comparison = null;
  if (medianPrice) {
    const pct = Math.round(((home.price - medianPrice) / medianPrice) * 100);
    if (Math.abs(pct) < 3) {
      comparison = { text: 'About typical for this ZIP', color: '#555' };
    } else {
      comparison = {
        text: `${Math.abs(pct)}% ${pct < 0 ? 'below' : 'above'} the median listing here`,
        color: pct < 0 ? '#15803d' : '#b91c1c',
      };
    }
  }

  const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(home.address)}_rb/`;

  return (
    <div style={{ minWidth: 230, maxWidth: 270, fontFamily: 'system-ui, sans-serif', color: '#222' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>
          {formatPrice(home.price, type)}{type === 'rent' ? '/mo' : ''}
        </div>
        {onToggleSave && (
          <button
            onClick={onToggleSave}
            disabled={!canSave}
            title={isSaved ? 'Remove from comparison' : 'Save to compare (up to 2)'}
            style={{
              border: 'none', background: 'none', fontSize: 20, cursor: canSave ? 'pointer' : 'not-allowed',
              opacity: canSave ? 1 : 0.35, lineHeight: 1, padding: 0,
            }}
          >
            {isSaved ? '❤️' : '🤍'}
          </button>
        )}
      </div>
      <div style={{ fontSize: 14, margin: '2px 0 6px' }}>{home.address}</div>
      {details && <div style={{ fontSize: 13, color: '#555' }}>{details}</div>}
      {home.property_type && (
        <div style={{ fontSize: 13, color: '#555' }}>{home.property_type}</div>
      )}
      {comparison && (
        <div style={{ fontSize: 13, fontWeight: 700, color: comparison.color, marginTop: 6 }}>
          {comparison.text}
        </div>
      )}
      {type === 'sale' && zipHomeValue && (
        <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
          Typical home value in this ZIP: {formatPrice(zipHomeValue, 'sale')}
        </div>
      )}
      {home.days_on_market != null && (
        <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
          Listed {home.days_on_market} days ago
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <a href={zillowUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600 }}>
          View on Zillow →
        </a>
      </div>
    </div>
  );
}