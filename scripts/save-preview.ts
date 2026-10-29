// Saves /digest/<night> as one HTML file, without starting a server: `pnpm preview [night] [out]`.
// The page carries LANE_MARKER from the environment (ADR 0003); unset it for the clean copy.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../src/app.js';

const night = process.argv[2] ?? '2026-10-28';
const out = process.argv[3] ?? 'var/preview.html';

const res = await createApp().request(`/digest/${night}`);
if (res.status !== 200) throw new Error(`digest ${night}: HTTP ${res.status}`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, await res.text());
console.log(`saved ${out}`);
