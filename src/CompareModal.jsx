import { PLACE_CATEGORIES } from './nearbyPlaces';
import { formatPrice } from './listings';

const BEST_BG = '#dcfce7';
const BEST_FG = '#166534';

// Index of the winning value in a row, or -1 when there's nothing to compare
function bestIndex(values, better) {
  const known = values.map((v, i) => [v, i]).filter(([v]) => v != null);
  if (known.length < 2 || known.every(([v]) => v === known[0][0])) return -1;
  known.sort((a, b) => (better === 'min' ? a[0] - b[0] : b[0] - a[0]));
  return known[0][1];
}

const cellStyle = {
  padding: '10px 12px', borderBottom: '1px solid #eee', verticalAlign: 'top',
  fontSize: 14, minWidth: 190,
};
const labelStyle = {
  ...cellStyle, minWidth: 110, fontWeight: 600, color: '#555', background: 'white',
  position: 'sticky', left: 0, zIndex: 1,
};
const sectionStyle = {
  padding: '14px 12px 6px', fontSize: 12, fontWeight: 800, letterSpacing: 0.6,
  textTransform: 'uppercase', color: '#19350C', borderBottom: '2px solid #19350C',
};

function Row({ label, cells, best = -1 }) {
  return (
    <tr>
      <td style={labelStyle}>{label}</td>
      {cells.map((c, i) => (
        <td key={i} style={{ ...cellStyle, ...(i === best && { background: BEST_BG }) }}>
          {c ?? <span style={{ color: '#aaa' }}>—</span>}
          {i === best && <div style={{ fontSize: 11, fontWeight: 800, color: BEST_FG, marginTop: 2 }}>✓ BEST</div>}
        </td>
      ))}
    </tr>
  );
}

function Section({ title, span }) {
  return <tr><td colSpan={span} style={sectionStyle}>{title}</td></tr>;
}

function PlaceCell({ place }) {
  if (!place) return null;
  return (
    <div>
      <div style={{ fontWeight: 600 }}>{place.name}</div>
      <div style={{ fontSize: 13, color: '#555' }}>
        {place.miles.toFixed(1)} mi
        {place.rating != null && <> · ⭐ {place.rating} ({place.ratingCount?.toLocaleString()})</>}
      </div>
      {place.review && (
        <div title={place.review} style={{ fontSize: 12, color: '#777', fontStyle: 'italic', marginTop: 3 }}>
          “{place.review.length > 90 ? place.review.slice(0, 90) + '…' : place.review}”
        </div>
      )}
    </div>
  );
}

export default function CompareModal({ state, count, onClose, onRetry }) {
  const { loading, error, result } = state;
  const homes = result?.homes ?? [];
  const ai = result?.ai;
  const span = homes.length + 1;

  const priceLabel = t => (t === 'rent' ? '/mo' : '');
  const perSqft = h => (h.sqft ? h.price / h.sqft : null);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 5, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', color: '#222', borderRadius: 14, width: 'min(1000px, 100%)',
          maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)', fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #eee' }}>
          <strong style={{ fontSize: 18 }}>Compare {count} homes</strong>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ overflow: 'auto' }}>
          {loading && (
            <div style={{ padding: 30, textAlign: 'center', color: '#555' }}>
              Checking what's around each home and reading local reviews…
            </div>
          )}

          {error && (
            <div style={{ padding: 24, color: '#b91c1c' }}>
              Something went wrong generating the comparison: {error}
              <div><button onClick={onRetry} style={{ marginTop: 10, cursor: 'pointer' }}>Try again</button></div>
            </div>
          )}

          {result && (
            <>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ ...labelStyle, borderBottom: 'none' }} />
                    {homes.map((h, i) => (
                      <th key={h.id} style={{ ...cellStyle, textAlign: 'left', borderBottom: 'none' }}>
                        <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>HOME {i + 1}</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>
                          {formatPrice(h.price, h.listingType)}{priceLabel(h.listingType)}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#444' }}>{h.address}</div>
                        {ai?.homes?.[i]?.tagline && (
                          <div style={{
                            display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 12,
                            background: '#19350C', color: 'white', fontSize: 12, fontWeight: 700,
                          }}>
                            {ai.homes[i].tagline}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Section title="The home" span={span} />
                  <Row
                    label="Price"
                    cells={homes.map(h => `$${h.price.toLocaleString()}${priceLabel(h.listingType)}`)}
                    best={bestIndex(homes.map(h => h.price), 'min')}
                  />
                  <Row label="Beds / baths" cells={homes.map(h => (h.beds != null || h.baths != null) ? `${h.beds ?? '?'} bd · ${h.baths ?? '?'} ba` : null)} />
                  <Row
                    label="Size"
                    cells={homes.map(h => h.sqft ? `${h.sqft.toLocaleString()} sqft` : null)}
                    best={bestIndex(homes.map(h => h.sqft), 'max')}
                  />
                  <Row
                    label="Price / sqft"
                    cells={homes.map(h => perSqft(h) ? `$${perSqft(h).toFixed(h.listingType === 'rent' ? 2 : 0)}` : null)}
                    best={bestIndex(homes.map(perSqft), 'min')}
                  />
                  <Row label="ZIP home value" cells={homes.map(h => h.homeValue ? `$${h.homeValue.toLocaleString()} typical` : null)} />
                  <Row label="Days listed" cells={homes.map(h => h.daysOnMarket != null ? `${h.daysOnMarket} days` : null)} />

                  <Section title="What's nearby" span={span} />
                  {PLACE_CATEGORIES.map(({ key, label, icon }) => (
                    <Row
                      key={key}
                      label={`${icon} ${label}`}
                      cells={homes.map(h => h.nearby[key] && <PlaceCell place={h.nearby[key]} />)}
                      best={bestIndex(homes.map(h => h.nearby[key]?.miles ?? null), 'min')}
                    />
                  ))}

                  {ai && (
                    <>
                      <Section title="The AI's take" span={span} />
                      <Row label="Vibe" cells={homes.map((_, i) => ai.homes?.[i]?.vibe)} />
                      <Row label="Pros" cells={homes.map((_, i) => <List items={ai.homes?.[i]?.pros} mark="+" color="#166534" />)} />
                      <Row label="Cons" cells={homes.map((_, i) => <List items={ai.homes?.[i]?.cons} mark="−" color="#b91c1c" />)} />
                    </>
                  )}
                </tbody>
              </table>

              {ai?.verdict && (
                <div style={{ margin: 16, padding: 14, borderRadius: 10, background: '#f3f7ef', border: '1px solid #cfe0c3' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#19350C', marginBottom: 4 }}>VERDICT</div>
                  <div style={{ fontSize: 15, lineHeight: 1.5 }}>{ai.verdict}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function List({ items, mark, color }) {
  if (!items?.length) return null;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((t, i) => (
        <li key={i} style={{ marginBottom: 4 }}>
          <span style={{ color, fontWeight: 800, marginRight: 6 }}>{mark}</span>{t}
        </li>
      ))}
    </ul>
  );
}
