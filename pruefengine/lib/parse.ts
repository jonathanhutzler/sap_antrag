import { PDFDocument } from 'pdf-lib';
import type { NicheConfig } from '@/config/schema';

/**
 * Eingangsprüfung der hochgeladenen Dateien.
 *
 * Alles, was hier durchfällt, kostet keinen Modell-Aufruf. Die Grenzen
 * kommen ausschließlich aus der Nischen-Config (`input`), nicht aus dem Code.
 */

export type AcceptedType = 'pdf' | 'jpg' | 'png';

export interface ParsedDoc {
  filename: string;
  type: AcceptedType;
  mediaType: 'application/pdf' | 'image/jpeg' | 'image/png';
  base64: string;
  pages: number;
  bytes: number;
}

export class ParseError extends Error {
  readonly userMessage: string;
  constructor(userMessage: string) {
    super(userMessage);
    this.name = 'ParseError';
    this.userMessage = userMessage;
  }
}

/** Dateityp aus den Magic Bytes, nicht aus dem vom Browser gemeldeten MIME-Typ. */
function sniff(buf: Uint8Array): AcceptedType | null {
  if (buf.length < 8) return null;
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'pdf'; // %PDF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }
  return null;
}

const MEDIA_TYPE: Record<AcceptedType, ParsedDoc['mediaType']> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  png: 'image/png',
};

const TYPE_LABEL: Record<AcceptedType, string> = {
  pdf: 'PDF',
  jpg: 'JPG',
  png: 'PNG',
};

export async function parseUploads(files: File[], niche: NicheConfig): Promise<ParsedDoc[]> {
  if (files.length === 0) {
    throw new ParseError('Es wurde keine Datei hochgeladen.');
  }
  if (files.length > niche.input.maxFiles) {
    throw new ParseError(
      `Es sind höchstens ${niche.input.maxFiles} Dateien möglich, hochgeladen wurden ${files.length}.`,
    );
  }

  const maxBytes = niche.input.maxMbPerFile * 1024 * 1024;
  const docs: ParsedDoc[] = [];
  let totalPages = 0;

  for (const file of files) {
    if (file.size > maxBytes) {
      throw new ParseError(
        `„${file.name}" ist ${(file.size / 1024 / 1024).toFixed(1)} MB groß. Erlaubt sind ${niche.input.maxMbPerFile} MB je Datei.`,
      );
    }
    if (file.size === 0) {
      throw new ParseError(`„${file.name}" ist leer.`);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniff(bytes);

    if (!type) {
      throw new ParseError(
        `„${file.name}" konnte nicht gelesen werden. Erlaubt sind ${niche.input.accept.map((a) => TYPE_LABEL[a]).join(', ')}.`,
      );
    }
    if (!niche.input.accept.includes(type)) {
      throw new ParseError(
        `„${file.name}" ist eine ${TYPE_LABEL[type]}-Datei. Erlaubt sind ${niche.input.accept.map((a) => TYPE_LABEL[a]).join(', ')}.`,
      );
    }

    let pages = 1;
    if (type === 'pdf') {
      try {
        const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
        pages = pdf.getPageCount();
      } catch {
        throw new ParseError(
          `„${file.name}" lässt sich nicht öffnen. Möglicherweise ist die Datei beschädigt oder passwortgeschützt.`,
        );
      }
      if (pages === 0) {
        throw new ParseError(`„${file.name}" enthält keine Seiten.`);
      }
    }

    totalPages += pages;
    if (totalPages > niche.input.maxPages) {
      throw new ParseError(
        `Zusammen sind es ${totalPages} Seiten. Geprüft werden höchstens ${niche.input.maxPages} Seiten.`,
      );
    }

    docs.push({
      filename: file.name,
      type,
      mediaType: MEDIA_TYPE[type],
      base64: Buffer.from(bytes).toString('base64'),
      pages,
      bytes: file.size,
    });
  }

  return docs;
}

/** Ankerwert des Nutzers in Cent. Akzeptiert "1.184,05", "1184.05", "1184". */
export function parseAnchorToCents(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[^\d.,-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function formatEuro(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function formatEuroPlain(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}
