#!/usr/bin/env node
/**
 * Simula o GitHub Pages localmente: serve `dist/` SOMENTE sob um subcaminho (como
 * https://<usuario>.github.io/<repositorio>/) e responde 404 para qualquer outra URL — sem fallback de SPA.
 *
 *   npm run build && npm run pages:serve                 # http://localhost:4180/humanitta-gestao/
 *   node scripts/serve-pages.mjs --port 4180 --base /outro-nome/
 *
 * Usado pelos testes E2E (playwright.config.ts). Sem dependências.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const port = Number(arg('port', '4180'));
const base = `/${arg('base', '/humanitta-gestao/').replace(/^\/+|\/+$/g, '')}/`;
const root = resolve(arg('dir', 'dist'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith(base)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 — fora do subcaminho publicado');
    return;
  }
  const rel = decodeURIComponent(url.pathname.slice(base.length)) || 'index.html';
  const file = normalize(join(root, rel));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const info = await stat(file);
    const target = info.isDirectory() ? join(file, 'index.html') : file;
    const body = await readFile(target);
    res.writeHead(200, { 'content-type': TYPES[extname(target)] ?? 'application/octet-stream' }).end(body);
  } catch {
    // GitHub Pages não tem fallback de SPA: arquivo inexistente = 404.
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404');
  }
}).listen(port, () => {
  console.log(`GitHub Pages simulado: http://localhost:${port}${base} (dist: ${root})`);
});
