/**
 * Main runner: scrape both Fonos and VoizFM in bulk with rate limiting
 * Usage:
 *   npx tsx scratch/metadata-scraper/run-scraper.ts fonos <slug>
 *   npx tsx scratch/metadata-scraper/run-scraper.ts voizfm <id>
 *   npx tsx scratch/metadata-scraper/run-scraper.ts fonos-catalog
 *   npx tsx scratch/metadata-scraper/run-scraper.ts voizfm-catalog
 */

import pLimit from 'p-limit';
import { scrapeFonosBook, getFonosCatalogSlugs } from './fonos-scraper';
import { scrapeVoizFMBook, getVoizFMCatalogIds, closeBrowser } from './voizfm-scraper';
import { saveMetadata, batchSave, closePool } from './save-to-db';
import type { AudiobookMetadata } from './types';
import fs from 'fs';
import path from 'path';

const RESULTS_DIR = path.join(__dirname, 'results');
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

function saveJson(filename: string, data: any) {
  const outPath = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[Runner] Saved to ${outPath}`);
}

async function runFonosSingle(slug: string) {
  console.log(`\n📚 Fonos single: ${slug}`);
  const data = await scrapeFonosBook(slug);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
    await saveMetadata(data);
    saveJson(`fonos-${slug}.json`, data);
  } else {
    console.error('Failed to scrape');
  }
}

async function runVoizFMSingle(id: number) {
  console.log(`\n🎙️ VoizFM single: ${id}`);
  const data = await scrapeVoizFMBook(id);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
    await saveMetadata(data);
    saveJson(`voizfm-${id}.json`, data);
  } else {
    console.error('Failed to scrape');
  }
  await closeBrowser();
}

async function runFonosCatalog() {
  console.log('\n📚 Fonos catalog crawl...');
  const slugs = await getFonosCatalogSlugs(100);
  console.log(`[TEST MODE] Found ${slugs.length} books. Scraping...`);
  saveJson('fonos-slugs.json', slugs);

  const limit = pLimit(2); // 2 concurrent
  const results: AudiobookMetadata[] = [];

  await Promise.all(
    slugs.map((slug) =>
      limit(async () => {
        const data = await scrapeFonosBook(slug);
        if (data) {
          results.push(data);
          await saveMetadata(data);
        }
        // Rate limit: 2 seconds per request
        await new Promise((r) => setTimeout(r, 2000));
      })
    )
  );

  saveJson('fonos-catalog-results.json', results);
  console.log(`\n✅ Fonos done: ${results.length}/${slugs.length} scraped`);
}

async function runVoizFMCatalog() {
  console.log('\n🎙️ VoizFM catalog crawl...');
  const ids = await getVoizFMCatalogIds();
  console.log(`[TEST MODE] Found ${ids.length} books. Scraping...`);
  saveJson('voizfm-ids.json', ids);

  const limit = pLimit(1); // 1 concurrent (Playwright)
  const results: AudiobookMetadata[] = [];

  await Promise.all(
    ids.map((id) =>
      limit(async () => {
        const data = await scrapeVoizFMBook(id);
        if (data) {
          results.push(data);
          await saveMetadata(data);
        }
        await new Promise((r) => setTimeout(r, 3000));
      })
    )
  );

  await closeBrowser();
  saveJson('voizfm-catalog-results.json', results);
  console.log(`\n✅ VoizFM done: ${results.length}/${ids.length} scraped`);
}

// --- CLI ---
const [, , command, arg] = process.argv;

(async () => {
  switch (command) {
    case 'fonos':
      if (!arg) { console.error('Usage: ... fonos <slug>'); process.exit(1); }
      await runFonosSingle(arg);
      break;
    case 'voizfm':
      if (!arg) { console.error('Usage: ... voizfm <id>'); process.exit(1); }
      await runVoizFMSingle(parseInt(arg));
      break;
    case 'fonos-catalog':
      await runFonosCatalog();
      break;
    case 'voizfm-catalog':
      await runVoizFMCatalog();
      break;
    case 'catalog':
      await runFonosCatalog();
      await runVoizFMCatalog();
      break;
    default:
      console.log(`Usage:
  npx tsx scratch/metadata-scraper/run-scraper.ts fonos <slug>          # Scrape 1 Fonos book
  npx tsx scratch/metadata-scraper/run-scraper.ts voizfm <id>           # Scrape 1 VoizFM book
  npx tsx scratch/metadata-scraper/run-scraper.ts fonos-catalog         # Scrape all Fonos books
  npx tsx scratch/metadata-scraper/run-scraper.ts voizfm-catalog        # Scrape all VoizFM books
  npx tsx scratch/metadata-scraper/run-scraper.ts catalog               # Scrape EVERYTHING`);
  }
  await closePool();
})();
