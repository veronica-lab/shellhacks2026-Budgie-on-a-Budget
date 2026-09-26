import fs from 'fs';

// Converts the Census file into a small JSON file the app can load
const raw = fs.readFileSync('scripts/zcta_gazetteer.txt', 'utf8').replace(/^\uFEFF/, '');
const lines = raw.trim().split(/\r?\n/);

// Newer Census files use "|" between columns, older ones use tabs
const delim = lines[0].includes('|') ? '|' : '\t';
const headers = lines[0].split(delim).map(h => h.trim().toUpperCase());

const zipCol = headers.findIndex(h => h.startsWith('GEOID'));
const latCol = headers.findIndex(h => h.startsWith('INTPTLAT'));
const lngCol = headers.findIndex(h => h.startsWith('INTPTLON'));

if (zipCol === -1 || latCol === -1 || lngCol === -1) {
  console.log('Could not find columns. Headers are:', headers);
  process.exit(1);
}

const zips = lines.slice(1)
  .map(line => line.split(delim))
  .filter(cols => cols.length > Math.max(zipCol, latCol, lngCol))
  .map(cols => ({
    zip: cols[zipCol].trim().padStart(5, '0'),   // stays text, keeps leading zeros
    lat: Number(Number(cols[latCol]).toFixed(4)),
    lng: Number(Number(cols[lngCol]).toFixed(4)),
  }));

fs.writeFileSync('public/zip-centroids.json', JSON.stringify(zips));
console.log(`Saved ${zips.length} ZIP codes`);