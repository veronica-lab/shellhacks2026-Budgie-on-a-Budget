let cache = null;

async function loadData() {
  if (!cache) {
    const [zips, schools, safety] = await Promise.all([
      fetch('/zip-centroids.json').then(r => r.json()),
      fetch('/zip-schools.json').then(r => r.json()),
      fetch('/zip-safety.json').then(r => r.json()),
    ]);
    cache = { zips, schools, safety };
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
  const { zips, schools, safety } = await loadData();
  return zips
    .map(z => ({
      ...z,
      ...(safety[z.zip] || {}),          // county, homicide_rate, safety_score
      miles: milesBetween(destination, z),
      schools_nearby: schools[z.zip] ?? 0,
    }))
    .filter(z => z.miles <= radiusMiles)
    .sort((a, b) => a.miles - b.miles);
}