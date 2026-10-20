#!/usr/bin/env node
/**
 * Verifica se o branch de um agente só alterou arquivos que ele possui (agents.config.json).
 *
 *   npm run check:boundaries -- --agent 03            # compara com o merge-base de main
 *   npm run check:boundaries -- --agent 03 --base main
 *   npm run check:boundaries                            # detecta o agente pelo nome do branch
 *
 * Exceção permitida: arquivos novos em docs/change-requests/ (pedidos ao Integrador).
 * Sai com código 1 se houver arquivo fora da área do agente.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const config = JSON.parse(readFileSync(new URL('../agents.config.json', import.meta.url), 'utf8'));
const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

const branch = sh('git rev-parse --abbrev-ref HEAD');
const agentId = arg('agent') ?? config.agents.find((a) => a.branch === branch)?.id;
if (!agentId) {
  console.error(`Não foi possível identificar o agente (branch "${branch}"). Use --agent <01..08>.`);
  process.exit(2);
}
const agent = config.agents.find((a) => a.id === agentId.padStart(2, '0'));
if (!agent) {
  console.error(`Agente "${agentId}" não existe em agents.config.json.`);
  process.exit(2);
}

/** Glob simples: "**" = qualquer coisa (inclusive "/"), "*" = qualquer coisa sem "/". */
const toRegex = (glob) =>
  new RegExp(
    '^' +
      glob
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '\u0000')
        .replace(/\*/g, '[^/]*')
        .replace(/\u0000/g, '.*') +
      '$',
  );

const allowed = [...agent.owns, 'docs/change-requests/**'].map(toRegex);
const base = arg('base') ?? config.baseBranch;
const mergeBase = sh(`git merge-base ${base} HEAD`);
const committed = sh(`git diff --name-only ${mergeBase}...HEAD`);
const working = execSync('git status --porcelain --untracked-files=all', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .map((l) => l.slice(3).replace(/^"|"$/g, '').split(' -> ').pop());
const changed = Array.from(new Set([...committed.split('\n').filter(Boolean), ...working]));

const violations = changed.filter((f) => !allowed.some((re) => re.test(f)));

console.log(`Agente ${agent.id} · ${agent.name} — ${changed.length} arquivo(s) alterado(s) desde ${base}.`);
if (violations.length) {
  console.error('\n✖ Arquivos FORA da área do agente (precisam de aprovação do Integrador):');
  violations.forEach((f) => console.error(`  - ${f}`));
  console.error('\nAbra um pedido em docs/change-requests/ em vez de editar arquivos compartilhados.');
  process.exit(1);
}
console.log('✔ Todas as alterações estão dentro da área do agente.');
