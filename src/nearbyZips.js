let cache = null;

async function loadZips() {
  if (!cache) {
    const res = await fetch('/zip-centroids.json');
    cache = await res.json();
  }
  return cache;
}

// Straight-line distance in miles between two points
function milesBetween(a, b) {
  const R = 3958.8;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function findNearbyZips(destination, radiusMiles = 30) {
  const zips = await loadZips();
  return zips
    .map(z => ({ ...z, miles: milesBetween(destination, z) }))
    .filter(z => z.miles <= radiusMiles)
    .sort((a, b) => a.miles - b.miles);
}
