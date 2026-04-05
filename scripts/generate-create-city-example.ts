/**
 * One-off: writes public/example-states/create_city_example.json
 * Run: npx tsx scripts/generate-create-city-example.ts
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { createInitialGameState } from '../src/lib/simulation';

const size = 50;
const state = createInitialGameState(size, 'Create City Example');
const out = join(process.cwd(), 'public/example-states/create_city_example.json');
writeFileSync(out, JSON.stringify(state));
console.log('Wrote', out, `(${size}×${size})`);
