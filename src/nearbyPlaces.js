// Reviews cost more per lookup, so only ask for them where they say something about the area
export const PLACE_CATEGORIES = [
  { key: 'grocery', type: 'supermarket', label: 'Groceries', icon: '🛒', reviews: true },
  { key: 'park', type: 'park', label: 'Park', icon: '🌳', reviews: true },
  { key: 'school', type: 'school', label: 'School', icon: '🏫' },
  { key: 'transit', type: 'transit_station', label: 'Transit', icon: '🚉' },
  { key: 'restaurant', type: 'restaurant', label: 'Restaurant', icon: '🍽️', reviews: true },
];

const REVIEW_MAX_CHARS = 120;

// Results per home location, so comparing the same homes again costs no extra lookups
const cache = new Map();

// Straight-line distance in miles
function milesBetween(lat1, lng1, lat2, lng2) {
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(a));
}

// Nearest place of each category around one point, with its rating and (for some) a review snippet.
// Returns { grocery: { name, miles, rating, ratingCount, review } | null, ... }
export async function fetchNearbyPlaces(placesLib, lat, lng) {
  const cacheKey = `${lat},${lng}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const entries = await Promise.all(PLACE_CATEGORIES.map(async ({ key, type, reviews }) => {
    try {
      const fields = ['displayName', 'location', 'rating', 'userRatingCount'];
      if (reviews) fields.push('reviews');
      const { places } = await placesLib.Place.searchNearby({
        fields,
        locationRestriction: { center: { lat, lng }, radius: 3000 },
        includedTypes: [type],
        maxResultCount: 1,
        rankPreference: placesLib.SearchNearbyRankPreference.DISTANCE,
      });
      const p = places?.[0];
      if (!p) return [key, null];
      const reviewText = reviews ? p.reviews?.find(r => r.text)?.text ?? null : null;
      return [key, {
        name: p.displayName,
        miles: milesBetween(lat, lng, p.location.lat(), p.location.lng()),
        rating: p.rating ?? null,
        ratingCount: p.userRatingCount ?? null,
        review: reviewText && reviewText.length > REVIEW_MAX_CHARS
          ? reviewText.slice(0, REVIEW_MAX_CHARS) + '…'
          : reviewText,
      }];
    } catch (err) {
      console.warn(`Nearby search failed for ${type}:`, err);
      return [key, null];
    }
  }));

  const result = Object.fromEntries(entries);
  // Don't remember a total failure (e.g. Places API off), so a retry can still work
  if (entries.some(([, place]) => place)) cache.set(cacheKey, result);
  return result;
}
