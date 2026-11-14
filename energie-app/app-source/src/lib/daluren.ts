export interface DalurenInstellingen {
  start: string;
  einde: string;
  weekends: boolean;
}

export const STANDAARD_DALUREN: DalurenInstellingen = {
  start: '22:00',
  einde: '06:00',
  weekends: true,
};

const TIJDZONE = 'Europe/Brussels';

function isTijd(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function parseDalurenInstellingen(raw?: string | null): DalurenInstellingen {
  if (!raw) return STANDAARD_DALUREN;

  try {
    const value = JSON.parse(raw);
    if (isTijd(value.start) && isTijd(value.einde) && value.start !== value.einde && typeof value.weekends === 'boolean') {
      return { start: value.start, einde: value.einde, weekends: value.weekends };
    }
  } catch {
    return STANDAARD_DALUREN;
  }

  return STANDAARD_DALUREN;
}

function tijdzoneOnderdelen(epochMs: number) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIJDZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(epochMs))
      .map((part) => [part.type, part.value])
  );
}

export function lokaleTijdNaarUtc(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const gewensteUtc = Date.UTC(year, month - 1, day, hour, minute);
  let resultaat = gewensteUtc;

  for (let poging = 0; poging < 2; poging += 1) {
    const parts = tijdzoneOnderdelen(resultaat);
    const tijdzoneAlsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    resultaat = gewensteUtc - (tijdzoneAlsUtc - resultaat);
  }

  return new Date(resultaat);
}

export function isDalUur(timestamp: Date, instellingen: DalurenInstellingen): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIJDZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(timestamp);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  if (instellingen.weekends && (values.weekday === 'Sat' || values.weekday === 'Sun')) return true;

  const nu = Number(values.hour) * 60 + Number(values.minute);
  const start = Number(instellingen.start.slice(0, 2)) * 60 + Number(instellingen.start.slice(3));
  const einde = Number(instellingen.einde.slice(0, 2)) * 60 + Number(instellingen.einde.slice(3));

  return start > einde ? nu >= start || nu < einde : nu >= start && nu < einde;
}

export interface GesplitsteMeting {
  piek: number;
  dal: number;
}

export function splitsMeterHistorie(
  historie: Array<{ state: string; last_changed?: string; last_updated?: string }>,
  start: Date,
  einde: Date,
  instellingen: DalurenInstellingen,
  resetDagelijks: boolean
): GesplitsteMeting | null {
  const metingen = historie
    .map((item) => ({
      waarde: Number.parseFloat(item.state),
      tijd: new Date(item.last_changed ?? item.last_updated ?? ''),
    }))
    .filter((item) => Number.isFinite(item.waarde) && Number.isFinite(item.tijd.getTime()))
    .filter((item) => item.tijd >= start && item.tijd < einde)
    .sort((a, b) => a.tijd.getTime() - b.tijd.getTime());

  if (metingen.length === 0 || (!resetDagelijks && metingen.length < 2)) return null;

  let piek = 0;
  let dal = 0;
  let vorigeWaarde: number | null = null;

  for (const meting of metingen) {
    let verschil = 0;
    if (vorigeWaarde === null) {
      if (resetDagelijks) verschil = Math.max(0, meting.waarde);
    } else if (meting.waarde < vorigeWaarde && resetDagelijks) {
      verschil = Math.max(0, meting.waarde);
    } else {
      verschil = Math.max(0, meting.waarde - vorigeWaarde);
    }

    if (isDalUur(meting.tijd, instellingen)) dal += verschil;
    else piek += verschil;
    vorigeWaarde = meting.waarde;
  }

  return {
    piek: Math.round(piek * 1000) / 1000,
    dal: Math.round(dal * 1000) / 1000,
  };
}

export function vorigeLokaleDatum(): string {
  const parts = tijdzoneOnderdelen(Date.now());
  const gisteren = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) - 1));
  return gisteren.toISOString().slice(0, 10);
}