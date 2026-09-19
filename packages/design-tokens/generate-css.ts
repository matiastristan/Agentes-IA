import tokens from './design-tokens.json' with { type: 'json' };
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { buildDesignTokensCss } from './build-css';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const css = buildDesignTokensCss(tokens as never);

const outPath = path.resolve(__dirname, '../../apps/web/styles/design-tokens.css');
writeFileSync(outPath, css);
console.log(`✅ design-tokens.css generado en ${outPath}`);
