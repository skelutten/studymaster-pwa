import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PWA offline navigation and runtime caching config', () => {
  const viteConfigPath = resolve(__dirname, '../../../vite.config.ts');
  const src = readFileSync(viteConfigPath, 'utf-8');

  it('enables VitePWA with navigateFallback to index.html', () => {
    // Workbox navigateFallback should be set to index.html
    expect(src).toMatch(/workbox:\s*{[^}]*navigateFallback:\s*['"]\/index\.html['"]/s);
  });

  it('caches documents (NetworkFirst)', () => {
    // NetworkFirst for documents
    expect(src).toMatch(/urlPattern:\s*\(\{\s*request\s*\}\)\s*=>\s*request\.destination\s*===\s*['"]document['"][\s\S]*?handler:\s*['"]NetworkFirst['"]/);
  });

  it('adds runtime caching for leaderboard GET with NetworkFirst', () => {
    // NetworkFirst for leaderboard GET
    expect(src).toMatch(/urlPattern:\s*\/\\\/api\\\/leaderboard\\\/\?.*\/i[\s\S]*?handler:\s*['"]NetworkFirst['"][\s\S]*?cacheName:\s*['"]leaderboard-api['"]/);
  });

  it('queues leaderboard POST submissions with Background Sync', () => {
    // NetworkOnly for POST submit with backgroundSync queue
    expect(src).toMatch(/urlPattern:\s*\/\\\/api\\\/leaderboard\\\/submit\/i[\s\S]*?handler:\s*['"]NetworkOnly['"][\s\S]*?backgroundSync:\s*{[\s\S]*name:\s*['"]leaderboard-queue['"]/);
  });

  it('enables devOptions for PWA during development', () => {
    expect(src).toMatch(/devOptions:\s*{\s*enabled:\s*true\s*}/);
  });
});