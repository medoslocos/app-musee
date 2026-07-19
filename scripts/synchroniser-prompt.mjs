/**
 * Recopie le prompt versionné (/prompts/analyse-bijou.md, source de vérité)
 * dans le dossier de l'edge function avant déploiement.
 * Usage : node scripts/synchroniser-prompt.mjs
 */

import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(racine, 'prompts', 'analyse-bijou.md');
const destination = join(racine, 'supabase', 'functions', 'analyse-bijou', 'prompt.md');

copyFileSync(source, destination);
console.log(`Prompt synchronisé : ${source} → ${destination}`);
