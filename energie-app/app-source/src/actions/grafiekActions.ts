'use server';

import { prisma } from '@/lib/prisma';

const MAAND_NAMEN = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

export async function getMaandProductiePerJaar(startDatum?: string, eindDatum?: string) {
  // Filter op beide productie-types (dal en piek)
  const whereClause: any = {
    metingType: {
      code: {
        in: ['PRODUCTIE_DAL', 'PRODUCTIE_PIEK'],
      },
    },
  };

  if (startDatum || eindDatum) {
    whereClause.datum = {};
    if (startDatum) whereClause.datum.gte = new Date(startDatum);
    if (eindDatum) whereClause.datum.lte = new Date(eindDatum);
  }

  const metingen = await prisma.dagMeting.findMany({
    where: whereClause,
    select: {
      datum: true,
      waarde: true,
    },
    orderBy: { datum: 'asc' },
  });

  const maandData = MAAND_NAMEN.map((maand) => ({ maand }));
  const uniekeJaren = new Set<number>();

  // Telt automatisch DAL + PIEK bij elkaar op per maand/jaar
  metingen.forEach((m) => {
    const d = new Date(m.datum);
    const maandIndex = d.getMonth();
    const jaar = d.getFullYear();

    uniekeJaren.add(jaar);

    const huidigeWaarde = (maandData[maandIndex] as any)[jaar] || 0;
    (maandData[maandIndex] as any)[jaar] = Math.round((huidigeWaarde + m.waarde) * 100) / 100;
  });

  return {
    chartData: maandData,
    jaren: Array.from(uniekeJaren).sort((a, b) => a - b),
  };
}
// Voeg dit toe onderaan src/actions/grafiekActions.ts

export async function getJaarProductieTotaal(startDatum?: string, eindDatum?: string) {
  const whereClause: any = {
    metingType: {
      code: {
        in: ['PRODUCTIE_DAL', 'PRODUCTIE_PIEK', 'ZONNE_PRODUCTIE'],
      },
    },
  };

  if (startDatum || eindDatum) {
    whereClause.datum = {};
    if (startDatum) whereClause.datum.gte = new Date(startDatum);
    if (eindDatum) whereClause.datum.lte = new Date(eindDatum);
  }

  const metingen = await prisma.dagMeting.findMany({
    where: whereClause,
    select: {
      datum: true,
      waarde: true,
    },
    orderBy: { datum: 'asc' },
  });

  // Telt alle dagwaarden op per jaar
  const jaarMap: Record<number, number> = {};

  metingen.forEach((m) => {
    const jaar = new Date(m.datum).getFullYear();
    jaarMap[jaar] = (jaarMap[jaar] || 0) + m.waarde;
  });

  // Zet om naar array voor Recharts [{ jaar: "2020", totaal: 2380 }, ...]
  return Object.entries(jaarMap).map(([jaar, totaal]) => ({
    jaar,
    totaal: Math.round(totaal * 100) / 100,
  }));
}
// Voeg onderaan src/actions/grafiekActions.ts toe:

// Voeg dit toe of vervang getElektriciteitsStromen in src/actions/grafiekActions.ts

export async function getDynamischeElektriciteitsStromen(startDatum?: string, eindDatum?: string) {
  // 1. Haal alle beschikbare metingtypes op uit het systeem
  const alleTypes = await prisma.metingType.findMany();


  const nu = new Date();

  if (startDatum === '') {
    const jaarGeleden = new Date();
    jaarGeleden.setMonth(nu.getMonth() - 3);
    startDatum = jaarGeleden.toISOString().slice(0, 10);
    eindDatum = nu.toISOString().slice(0, 10);
  }

  // Filter op optionele datum
  const whereClause: any = {};
  if (startDatum || eindDatum) {
    whereClause.datum = {};
    if (startDatum) whereClause.datum.gte = new Date(startDatum);
    if (eindDatum) whereClause.datum.lte = new Date(eindDatum);
  }

  // 2. Haal alle dagmetingen op
  const metingen = await prisma.dagMeting.findMany({
    where: whereClause,
    include: { metingType: true },
    orderBy: { datum: 'asc' },
  });

  const datumMap: Record<string, any> = {};
  const actieveCodes = new Set<string>();

  // Helper om te bepalen wat voor type een code is
  const isInjectie = (code: string) => code.toUpperCase().includes('INJECTIE');
  const isProductie = (code: string) =>
    code.toUpperCase().includes('PRODUCTIE') || code.toUpperCase().includes('ZONNE');

  // 3. Groepeer metingen per datum
  metingen.forEach((m) => {
    const datumKey = new Date(m.datum).toISOString().slice(0, 10);
    const code = m.metingType.code;
    const label = m.metingType.naam || code;

    if (!datumMap[datumKey]) {
      datumMap[datumKey] = {
        datum: datumKey,
        datumLabel: new Date(m.datum).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
        _totaleProductie: 0,
        _totaleInjectie: 0,
      };
    }

    const w = m.waarde;

    if (isInjectie(code)) {
      datumMap[datumKey]._totaleInjectie += w;
      datumMap[datumKey][label] = -Math.abs(w); // Negatief voor grafiek naar beneden
      actieveCodes.add(label);
    } else if (isProductie(code)) {
      datumMap[datumKey]._totaleProductie += w;
    } else {
      datumMap[datumKey][label] = w; // Positief voor staving omhoog
      actieveCodes.add(label);
    }
  });

  // 4. Bereken Eigenverbruik automatisch
  const EIGENVERBRUIK_LABEL = 'Eigenverbruik Zonne-energie';
  let heeftEigenverbruik = false;

  const chartData = Object.values(datumMap).map((d: any) => {
    const eigenVerbruik = Math.max(0, d._totaleProductie - d._totaleInjectie);
    if (eigenVerbruik > 0) heeftEigenverbruik = true;

    const row = { ...d, [EIGENVERBRUIK_LABEL]: Math.round(eigenVerbruik * 100) / 100 };

    delete row._totaleProductie;
    delete row._totaleInjectie;
    return row;
  });

  if (heeftEigenverbruik) {
    actieveCodes.add(EIGENVERBRUIK_LABEL);
  }

  // 5. Bouw een dynamische configuratie van de staven voor Recharts
  const barConfigs = Array.from(actieveCodes).map((label, index) => {
    const isInj = label.toLowerCase().includes('injectie');
    const isEigen = label === EIGENVERBRUIK_LABEL;

    // Dynamische kleurentoewijzing gebaseerd op de aard van de meting
    let fill = '#3b82f6'; // Standaard blauw
    if (isEigen) fill = '#f97316'; // Oranje
    else if (isInj) fill = index % 2 === 0 ? '#8b5cf6' : '#c084fc'; // Paars-tinten
    else fill = ['#3b82f6', '#10b981', '#06b6d4', '#6366f1'][index % 4];

    return { key: label, fill };
  });

  return { chartData, barConfigs };
}