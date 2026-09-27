import fs from 'fs';

// ---------- 1. Homicide rate per county (County Health Rankings) ----------
const chLines = fs.readFileSync('scripts/county-health.csv', 'utf8')
  .replace(/^\uFEFF/, '').split(/\r?\n/);
const codes = chLines[1].split(',').map(c => c.trim()); // 2nd row = short column codes

const fipsCol = codes.indexOf('fipscode');
const countyCodeCol = codes.indexOf('countycode');
const nameCol = codes.indexOf('county');
const homicideCol = codes.indexOf('v015_rawvalue');

if ([fipsCol, countyCodeCol, nameCol, homicideCol].includes(-1)) {
  console.log('Could not find County Health columns. First codes:', codes.slice(0, 10));
  process.exit(1);
}

const counties = {};
for (const line of chLines.slice(2)) {
  if (!line.trim()) continue;
  const cols = line.split(',');
  if (cols[countyCodeCol] === '000') continue; // skip state/national totals
  const rate = parseFloat(cols[homicideCol]);
  counties[cols[fipsCol].padStart(5, '0')] = {
    name: cols[nameCol],
    rate: Number.isFinite(rate) ? Number(rate.toFixed(1)) : null,
  };
}

// Safety score 0-100 = % of US counties with a HIGHER homicide rate
const rates = Object.values(counties).map(c => c.rate).filter(r => r != null);
for (const c of Object.values(counties)) {
  c.score = c.rate == null
    ? null
    : Math.round((100 * rates.filter(r => r > c.rate).length) / rates.length);
}

// ---------- 2. Which county each ZIP is in (Census relationship file) ----------
const relLines = fs.readFileSync('scripts/zcta_county.txt', 'utf8')
  .replace(/^\uFEFF/, '').trim().split(/\r?\n/);
const relHeaders = relLines[0].split('|').map(h => h.trim().toUpperCase());

const zipCol = relHeaders.findIndex(h => h.startsWith('GEOID_ZCTA5'));
const countyCol = relHeaders.findIndex(h => h.startsWith('GEOID_COUNTY'));
const overlapCol = relHeaders.findIndex(h => h === 'AREALAND_PART');

if ([zipCol, countyCol, overlapCol].includes(-1)) {
  console.log('Could not find relationship columns. Headers are:', relHeaders);
  process.exit(1);
}

// A ZIP can cross county lines, so keep the county with the most overlap
const best = {};
for (const line of relLines.slice(1)) {
  const cols = line.split('|');
  const zip = (cols[zipCol] || '').trim();
  if (!/^\d{5}$/.test(zip)) continue;
  const overlap = Number(cols[overlapCol]) || 0;
  if (!best[zip] || overlap > best[zip].overlap) {
    best[zip] = { county: cols[countyCol].trim().padStart(5, '0'), overlap };
  }
}

// ---------- 3. Combine: ZIP -> county name, homicide rate, safety score ----------
const out = {};
for (const [zip, { county }] of Object.entries(best)) {
  const c = counties[county];
  if (!c) continue;
  out[zip] = { county: c.name, homicide_rate: c.rate, safety_score: c.score };
}

fs.writeFileSync('public/zip-safety.json', JSON.stringify(out));
const withScore = Object.values(out).filter(v => v.safety_score != null).length;
console.log(`Saved ${Object.keys(out).length} ZIPs (${withScore} with a safety score)`);

