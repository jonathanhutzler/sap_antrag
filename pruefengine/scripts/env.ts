import { readFileSync } from 'node:fs';

/**
 * `.env.local` für Skripte laden.
 *
 * Bewusst zwölf Zeilen statt einer Abhängigkeit: Die Datei hat hier immer
 * dasselbe Format, und eine Bibliothek dafür wäre eine Abhängigkeit mehr im
 * Produktionsbaum, die niemand braucht.
 *
 * Bereits gesetzte Variablen bleiben stehen — was in der Shell steht, schlägt
 * die Datei.
 */
export function loadEnv(path = '.env.local'): void {
  let content: string;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    return;
  }

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) process.env[key] = value;
  }
}
