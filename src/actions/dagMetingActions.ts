'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Haal alle actieve meting types op
export async function getMetingTypes() {
  return await prisma.metingType.findMany({
    orderBy: { id: 'asc' },
  });
}

// Haal de bestaande metingen op voor een specifieke datum
export async function getMetingenVoorDatum(datumString: string) {
  const datum = new Date(datumString);
  const metingen = await prisma.dagMeting.findMany({
    where: { datum },
  });

  // Zet om naar een eenvoudig object: { [metingTypeId]: waarde }
  const metingenMap: Record<number, number> = {};
  metingen.forEach((m) => {
    metingenMap[m.metingTypeId] = m.waarde;
  });

  return metingenMap;
}

// Bewaar alle waarden voor een bepaalde dag
export async function opslaanDagMetingen(datumString: string, waarden: Record<number, number>) {
  try {
    const datum = new Date(datumString);

    // Voer alle opslagacties uit in 1 transactie
    const opslagActies = Object.entries(waarden).map(([typeIdStr, waarde]) => {
      const metingTypeId = parseInt(typeIdStr);

      return prisma.dagMeting.upsert({
        where: {
          datum_metingTypeId_herkomst: {
            datum,
            metingTypeId,
            herkomst: 'MANUEEL',
          },
        },
        update: { waarde },
        create: {
          datum,
          metingTypeId,
          waarde,
          herkomst: 'MANUEEL',
        },
      });
    });

    await prisma.$transaction(opslagActies);
    revalidatePath('/verbruik');
    return { success: true };
  } catch (error: any) {
    console.error('Fout bij opslaan metingen:', error);
    return { success: false, error: error.message };
  }
}
// Haal de meest recente datum op + 1 dag (of null als de DB leeg is)
export async function getVolgendeStandaardDatum(): Promise<string | null> {
  const meestRecenteMeting = await prisma.dagMeting.findFirst({
    orderBy: { datum: 'desc' },
    select: { datum: true },
  });

  if (!meestRecenteMeting) {
    return null; // Geen data in de database = leeg laten
  }

  // Telt 1 dag op bij de meest recente datum
  const volgendeDatum = new Date(meestRecenteMeting.datum);
  volgendeDatum.setDate(volgendeDatum.getDate() + 1);

  return volgendeDatum.toISOString().slice(0, 10);
}