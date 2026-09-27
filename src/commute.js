export async function fetchCommuteTimes(destination, zips, travelMode = 'DRIVE') {
  const res = await fetch('/api/commute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      destination: { lat: destination.lat, lng: destination.lng },
      origins: zips.map(z => ({ zip: z.zip, lat: z.lat, lng: z.lng })),
      travelMode,
    }),
  });
  if (!res.ok) throw new Error(`Commute request failed (${res.status})`);
  return res.json(); // { "33174": 14, ... }
}