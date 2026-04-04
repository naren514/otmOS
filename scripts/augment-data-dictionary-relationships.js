const fs = require('fs');
const path = require('path');

const base = path.join(process.cwd(), 'public', 'data_dictionary653', 'data_dictionary', 'data_dict');
const indexPath = path.join(process.cwd(), 'data', 'data-dictionary-index.json');
const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

for (const table of data.tables) {
  const file = path.join(base, `index_${table.tableName}.html`);
  let html = '';
  try {
    html = fs.readFileSync(file, 'utf8');
  } catch {
    table.relationships = [];
    continue;
  }

  const rels = [];
  const rx = /<TD NOWRAP>([A-Z0-9_]+)(?:&nbsp;[^<]*)?(?:<A [^>]+>.*?<\/A>)?(?:&nbsp;[^<]*)?<SMALL>\(FK:\s*&nbsp;<EM><A HREF="index_([A-Z0-9_]+)\.html">([A-Z0-9_]+)<\/A><\/EM>\)<\/SMALL><\/TD>/g;
  let m;
  while ((m = rx.exec(html)) !== null) {
    rels.push({ fieldName: m[1], targetTable: m[2], targetLabel: m[3] });
  }
  table.relationships = rels;
}

fs.writeFileSync(indexPath, JSON.stringify(data, null, 2));
console.log(`augmented relationships for ${data.tables.length} tables`);
console.log('sample SHIPMENT relationships:', data.tables.find((t) => t.tableName === 'SHIPMENT')?.relationships?.slice(0, 10));
