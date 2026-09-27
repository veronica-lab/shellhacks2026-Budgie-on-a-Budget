export async function fetchListings(zip, type) {
  const res = await fetch(`/api/listings?zip=${zip}&type=${type}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Listings request failed (${res.status})`);
  return spreadOut(data.listings || []);
}

// Apartments in the same building share a location, so nudge repeats apart
function spreadOut(list) {
  const seen = {};
  return list.map(l => {
    const key = `${l.lat},${l.lng}`;
    const n = (seen[key] = (seen[key] || 0) + 1);
    if (n === 1) return l;
    const angle = n * 1.3;
    const dist = 0.0004 * Math.sqrt(n);
    return { ...l, lat: l.lat + dist * Math.cos(angle), lng: l.lng + dist * Math.sin(angle) };
  });
}

export function formatPrice(price, type) {
  if (type === 'rent') return `$${Math.round(price).toLocaleString()}`;
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(price / 1000)}k`;
}

export function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}