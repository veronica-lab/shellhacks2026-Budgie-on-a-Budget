import { PLACE_CATEGORIES, fetchNearbyPlaces } from './nearbyPlaces';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();
const GEMINI_API_URL = import.meta.env.VITE_GEMINI_API_URL?.trim();

// Shape Gemini must answer in, so the reply is always complete, parseable JSON
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    homes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          tagline: { type: 'STRING' },
          vibe: { type: 'STRING' },
          pros: { type: 'ARRAY', items: { type: 'STRING' } },
          cons: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['tagline', 'vibe', 'pros', 'cons'],
      },
    },
    verdict: { type: 'STRING' },
  },
  required: ['homes', 'verdict'],
};

function describeHome(h, i) {
  const isRent = h.listingType === 'rent';
  const lines = [
    `Home ${i + 1}: ${h.address} (ZIP ${h.zip})`,
    `${isRent ? 'Rent' : 'Price'}: $${h.price.toLocaleString()}${isRent ? '/mo' : ''}`,
    `Typical home value in ZIP: ${h.homeValue ? '$' + h.homeValue.toLocaleString() : 'unknown'}`,
    `Size: ${[h.beds != null && `${h.beds} bd`, h.baths != null && `${h.baths} ba`, h.sqft && `${h.sqft} sqft`].filter(Boolean).join(', ') || 'unknown'}`,
  ];
  for (const { key, label } of PLACE_CATEGORIES) {
    const p = h.nearby[key];
    if (!p) { lines.push(`Nearest ${label}: none within about 2 miles`); continue; }
    let line = `Nearest ${label}: ${p.name}, ${p.miles.toFixed(1)} mi`;
    if (p.rating) line += `, ${p.rating}★ (${p.ratingCount} reviews)`;
    if (p.review) line += `. A review says: "${p.review}"`;
    lines.push(line);
  }
  return lines.join('\n');
}

// Looks up what's around each saved home, then asks Gemini for the opinion parts of the comparison
export async function compareHomes(savedHomes) {
  // MapPage sits outside <APIProvider>, so load the Places library directly
  const placesLib = await window.google.maps.importLibrary('places');
  const homes = await Promise.all(savedHomes.map(async h => ({
    ...h,
    nearby: await fetchNearbyPlaces(placesLib, h.lat, h.lng),
  })));

  const prompt = `You help someone choose between ${homes.length} homes, like a product comparison page.
Use the listing facts and the nearby places, especially what the reviews reveal about each neighborhood (noise, safety, convenience, crowds) that a listing site would not show.
Return one entry per home, in the same order:
- tagline: 2-5 words, like "Best value" or "Walkable & lively"
- vibe: one sentence about what living there feels like, grounded in the reviews
- pros: 2-3 short points
- cons: 1-3 short points
Then verdict: 1-2 sentences naming which home fits which kind of person.

${homes.map(describeHome).join('\n\n')}`;

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 2000,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  // Busy or retired models are common, so fall through to the next one instead of failing
  let lastError;
  for (const url of modelUrls()) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body,
      });
      const data = await res.json();
      if (data?.error) throw new Error(data.error.message);
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini returned an empty response');
      return { homes, ai: JSON.parse(text) };
    } catch (err) {
      console.warn(`Gemini call failed (${url}):`, err.message);
      lastError = err;
    }
  }
  throw lastError;
}

// The model from .env first, then one fallback that supports JSON output
const FALLBACK_MODELS = ['gemini-3.6-flash'];

function modelUrls() {
  const urls = [GEMINI_API_URL];
  for (const model of FALLBACK_MODELS) {
    const url = GEMINI_API_URL.replace(/models\/[^:]+:/, `models/${model}:`);
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}
