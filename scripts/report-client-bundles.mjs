import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = 'dist/client';
const files = [];
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) walk(path);
    else if (item.isFile() && /\.js$/.test(item.name)) {
      files.push({ file: relative(root, path), bytes: statSync(path).size });
    }
  }
}
try { walk(root); } catch (error) {
  console.error('Unable to analyze client JavaScript:', error.message);
  process.exit(1);
}
files.sort((a, b) => b.bytes - a.bytes);
const top = files.slice(0, 15);
console.log('\nLargest client JavaScript assets (uncompressed bytes):');
for (const item of top) console.log(`${(item.bytes / 1024).toFixed(1).padStart(8)} KiB  ${item.file}`);
console.log(`Total client JS: ${(files.reduce((n, x) => n + x.bytes, 0) / 1024).toFixed(1)} KiB across ${files.length} files`);
if (files.some(x => x.bytes > 500000)) console.warn('Oversized client assets remain (>500 kB). See list above.\n');
