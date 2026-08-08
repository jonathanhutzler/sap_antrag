/**
 * Antwortauswertung im Browser.
 *
 * `res.json()` blind aufzurufen ist die Ursache für die schlechteste
 * Fehlermeldung, die ein Nutzer bekommen kann: „Unexpected token 'A'". Sie
 * entsteht, wenn die Plattform bei Timeout oder Absturz Klartext liefert
 * („An error occurred with your deployment") und der Client darauf einen
 * JSON-Parser wirft.
 *
 * Deshalb: erst Text lesen, dann parsen, und wenn das nicht geht, eine
 * Meldung, mit der jemand etwas anfangen kann.
 */

export interface JsonResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  /** Gesetzt, wenn es nichts Auswertbares gibt. Fertig für die Anzeige. */
  error: string | null;
}

function messageForStatus(status: number, raw: string): string {
  if (status === 504 || status === 408) {
    return 'Die Prüfung hat zu lange gedauert und wurde abgebrochen. Bei einem kürzeren Dokument klappt es meist.';
  }
  if (status === 413) {
    return 'Die Datei ist zu groß für den Upload.';
  }
  if (status >= 500) {
    return 'Auf dem Server ist etwas schiefgelaufen. Bitte in einer Minute erneut versuchen.';
  }
  if (status === 0) {
    return 'Die Verbindung wurde unterbrochen. Bitte erneut versuchen.';
  }

  // Der Rohtext hilft nur, wenn er kurz ist und nach einer Meldung aussieht.
  const trimmed = raw.trim();
  if (trimmed && trimmed.length <= 200 && !trimmed.startsWith('<')) {
    return trimmed;
  }
  return 'Die Anfrage konnte nicht verarbeitet werden. Bitte erneut versuchen.';
}

export async function readJson<T>(response: Response): Promise<JsonResult<T>> {
  let raw = '';
  try {
    raw = await response.text();
  } catch {
    return {
      ok: false,
      status: response.status,
      data: null,
      error: 'Die Antwort des Servers ließ sich nicht lesen. Bitte erneut versuchen.',
    };
  }

  if (!raw.trim()) {
    return {
      ok: false,
      status: response.status,
      data: null,
      error: response.ok
        ? 'Der Server hat eine leere Antwort geschickt. Bitte erneut versuchen.'
        : messageForStatus(response.status, raw),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      status: response.status,
      data: null,
      error: messageForStatus(response.status, raw),
    };
  }

  const data = parsed as T & { error?: string };

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data,
      error: typeof data.error === 'string' && data.error ? data.error : messageForStatus(response.status, raw),
    };
  }

  return { ok: true, status: response.status, data, error: null };
}
