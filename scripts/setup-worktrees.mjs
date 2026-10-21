#!/usr/bin/env node
/**
 * Cria um git worktree por agente, cada um no próprio branch (a partir de main).
 *
 *   npm run agents:worktrees                  # cria em ../humanitta-worktrees/<id>-<slug>
 *   npm run agents:worktrees -- --dir D:/wt   # outro diretório
 *   npm run agents:worktrees -- --only 02,05  # só alguns agentes
 *
 * Idempotente: pula worktrees/branches que já existem. Depois, em cada pasta: `npm install`.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const config = JSON.parse(readFileSync(new URL('../agents.config.json', import.meta.url), 'utf8'));
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const quiet = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

const root = resolve(arg('dir') ?? '../humanitta-worktrees');
const only = arg('only')?.split(',').map((s) => s.trim().padStart(2, '0'));
const base = config.baseBranch;

for (const agent of config.agents) {
  if (only && !only.includes(agent.id)) continue;
  if (agent.worktree === false) continue;
  const dir = resolve(root, `${agent.id}-${agent.slug}`);
  if (existsSync(dir)) {
    console.log(`• ${agent.id} ${agent.name}: já existe em ${dir}`);
    continue;
  }
  const hasBranch = Boolean(quiet(`git rev-parse --verify --quiet refs/heads/${agent.branch}`));
  run(hasBranch ? `git worktree add "${dir}" ${agent.branch}` : `git worktree add -b ${agent.branch} "${dir}" ${base}`);
  console.log(`✔ ${agent.id} ${agent.name} → ${dir} (branch ${agent.branch})`);
}
console.log('\nPróximo passo em cada worktree: npm install && npm run dev -- --port 51XX');
