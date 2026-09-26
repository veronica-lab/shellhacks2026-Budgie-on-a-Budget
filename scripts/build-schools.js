import fs from 'fs';

// Counts public schools per ZIP code from the NCES file
const lines = fs.readFileSync('scripts/schools.txt', 'utf8')
  .replace(/^\uFEFF/, '').trim().split(/\r?\n/);

const ZIP_COL = 7; // 8th column (counting starts at 0)
const counts = {};

for (const line of lines) {
  const cols = line.split('|');
  const zip = (cols[ZIP_COL] || '').trim().slice(0, 5).padStart(5, '0');
  if (!/^\d{5}$/.test(zip)) continue; // skips a header row or bad lines
  counts[zip] = (counts[zip] || 0) + 1;
}

fs.writeFileSync('public/zip-schools.json', JSON.stringify(counts));
console.log(`Counted schools in ${Object.keys(counts).length} ZIP codes`);
