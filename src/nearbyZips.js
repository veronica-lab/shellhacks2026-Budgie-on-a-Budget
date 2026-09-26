let zipCache = null;
let schoolCache = null;

async function loadData() {
  if (!zipCache) {
    const [zipsRes, schoolsRes] = await Promise.all([
      fetch('/zip-centroids.json'),
      fetch('/zip-schools.json'),
    ]);
    zipCache = await zipsRes.json();
    schoolCache = await schoolsRes.json();
  }
  return { zips: zipCache, schools: schoolCache };
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
  const { zips, schools } = await loadData();
  return zips
    .map(z => ({
      ...z,
      miles: milesBetween(destination, z),
      schools_nearby: schools[z.zip] ?? 0,
    }))
    .filter(z => z.miles <= radiusMiles)
    .sort((a, b) => a.miles - b.miles);
}