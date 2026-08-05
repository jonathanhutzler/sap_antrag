import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';

/**
 * Blog-Silo je Nische.
 *
 * Konvention statt Konfiguration: alles unter content/blog/<slug>/ gehört zur
 * Nische <slug>. Eine neue Nische legt ihren Ordner an und ist im Silo, in der
 * Sitemap und in der internen Verlinkung — ohne Codeänderung.
 *
 * Bewusst kein Cross-Linking zwischen Nischen: mechanische Querverweise
 * zwischen fremden Themen erzeugen genau das Netzwerkmuster, das eine
 * Dachdomain vermeiden soll. Artikel verlinken nur innerhalb ihres Silos und
 * auf die eigene Landing.
 */

export interface Article {
  slug: string;
  niche: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  /** Nur Artikel desselben Silos. */
  related: string[];
  body: string;
  readingMinutes: number;
}

const ROOT = path.join(process.cwd(), 'content', 'blog');

/** Minimaler Frontmatter-Parser — reicht für key: value und key: [a, b]. */
function parseFrontmatter(raw: string): { data: Record<string, string | string[]>; body: string } {
  if (!raw.startsWith('---')) return { data: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: raw };

  const head = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).trim();
  const data: Record<string, string | string[]> = {};

  for (const line of head.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      continue;
    }
    value = value.replace(/^["']|["']$/g, '');
    data[key] = value;
  }

  return { data, body };
}

function asString(value: string | string[] | undefined, fallback = ''): string {
  if (Array.isArray(value)) return value.join(', ');
  return value ?? fallback;
}

export function listArticles(niche: string): Article[] {
  const dir = path.join(ROOT, niche);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => loadArticle(niche, file.replace(/\.md$/, '')))
    .filter((a): a is Article => a !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function loadArticle(niche: string, slug: string): Article | null {
  const file = path.join(ROOT, niche, `${slug}.md`);
  if (!existsSync(file)) return null;

  const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'));
  const words = body.split(/\s+/).length;

  return {
    slug,
    niche,
    title: asString(data.title, slug),
    description: asString(data.description),
    date: asString(data.date, '2026-01-01'),
    updated: data.updated ? asString(data.updated) : undefined,
    related: Array.isArray(data.related) ? data.related : [],
    body,
    readingMinutes: Math.max(2, Math.round(words / 200)),
  };
}

/**
 * Sehr kleiner Markdown-Renderer für den Artikelinhalt.
 *
 * Deckt ab, was in den Artikeln vorkommt: Überschriften, Absätze, Listen,
 * Zitate, Tabellen, Fettdruck und Links. Bewusst keine Bibliothek — die
 * Inhalte kommen aus dem eigenen Repository, nicht von außen, und ein
 * eigener Renderer hält das HTML im Design-System.
 */
export function renderMarkdown(markdown: string): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-ink">$1</a>',
      );

  const out: string[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{2,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length === 2 ? 2 : 3;
      const cls =
        level === 2 ? 'font-display text-2xl mt-12 mb-4 text-ink' : 'font-display text-xl mt-9 mb-3 text-ink';
      out.push(`<h${level} class="${cls}">${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }
    // Zitat: auch die leere Zeile „>" gehört dazu. Sie ist der Absatzwechsel
    // innerhalb des Zitats — und war der Grund, warum diese Schleife einmal
    // nicht weitergelaufen ist.
    if (/^>/.test(line)) {
      const paragraphs: string[] = [];
      let current: string[] = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        const content = lines[i].replace(/^>\s?/, '');
        if (content.trim()) {
          current.push(content);
        } else if (current.length) {
          paragraphs.push(current.join(' '));
          current = [];
        }
        i += 1;
      }
      if (current.length) paragraphs.push(current.join(' '));
      out.push(
        `<blockquote class="border-l-2 border-accent pl-5 my-7 text-ink-muted italic">${paragraphs
          .map((p) => `<p class="my-2">${inline(p)}</p>`)
          .join('')}</blockquote>`,
      );
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^-{2,}$/.test(c))) rows.push(cells);
        i += 1;
      }
      const [head, ...rest] = rows;
      out.push(
        `<div class="overflow-x-auto my-7"><table class="w-full text-sm border-collapse">` +
          `<thead><tr>${head.map((c) => `<th class="text-left font-sans font-semibold border-b border-rule py-2 pr-4">${inline(c)}</th>`).join('')}</tr></thead>` +
          `<tbody>${rest
            .map(
              (r) =>
                `<tr>${r.map((c) => `<td class="border-b border-rule py-2 pr-4 align-top">${inline(c)}</td>`).join('')}</tr>`,
            )
            .join('')}</tbody></table></div>`,
      );
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].slice(2));
        i += 1;
      }
      out.push(
        `<ul class="my-5 space-y-2">${items
          .map((it) => `<li class="pl-5 relative before:absolute before:left-0 before:top-[0.62em] before:h-1 before:w-1 before:rounded-full before:bg-accent">${inline(it)}</li>`)
          .join('')}</ul>`,
      );
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s*/, ''));
        i += 1;
      }
      out.push(
        `<ol class="my-5 space-y-2 list-decimal pl-5 marker:text-accent marker:font-semibold">${items
          .map((it) => `<li class="pl-1">${inline(it)}</li>`)
          .join('')}</ol>`,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,6}\s|>|[-*] |\d+\. |\|)/.test(lines[i])) {
      paragraph.push(lines[i]);
      i += 1;
    }
    // Sicherung: keine Zeile darf die Schleife stehen lassen. Ohne das wird aus
    // einer unerwarteten Zeichenfolge eine Endlosschleife im Build.
    if (paragraph.length === 0) {
      paragraph.push(lines[i]);
      i += 1;
    }
    out.push(`<p class="my-5 leading-[1.72]">${inline(paragraph.join(' '))}</p>`);
  }

  return out.join('\n');
}
