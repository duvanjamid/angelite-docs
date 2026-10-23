import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
const exe = process.env.CHROME || undefined;
const b = await chromium.launch(exe ? { executablePath: exe } : {});
const p = await b.newPage({ viewport: { width: 1000, height: 560 } });
await p.goto('file://' + resolve(import.meta.dirname, 'preview.html'));
await p.screenshot({ path: resolve(import.meta.dirname, 'preview.png') });
await b.close();
