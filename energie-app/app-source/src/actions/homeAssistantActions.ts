'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  lokaleTijdNaarUtc,
  parseDalurenInstellingen,
  splitsMeterHistorie,
  vorigeLokaleDatum,
} from '@/lib/daluren';

const HA_URL = process.env.HOME_ASSISTANT_URL;
const HA_TOKEN = process.env.HOME_ASSISTANT_TOKEN;

export async function syncHomeAssistantDagMetingen(targetDatumStr?: string) {
  if (!HA_URL || !HA_TOKEN) {
    return { success: false, error: 'Home Assistant variabelen ontbreken in .env' };
  }

  try {
    const datumStr = targetDatumStr || vorigeLokaleDatum();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datumStr)) {
      return { success: false, error: 'Ongeldige datum opgegeven.' };
    }

    const volgendeDatum = new Date(`${datumStr}T00:00:00.000Z`);
    volgendeDatum.setUTCDate(volgendeDatum.getUTCDate() + 1);
    const start = lokaleTijdNaarUtc(datumStr, '00:00');
    const einde = lokaleTijdNaarUtc(volgendeDatum.toISOString().slice(0, 10), '00:00');
    const datumSchoon = new Date(`${datumStr}T12:00:00.000Z`);
    const instelling = await prisma.instelling.findUnique({ where: { sleutel: 'daluren_schema' } });
    const daluren = parseDalurenInstellingen(instelling?.waarde);

    const alleTypes = await prisma.metingType.findMany();
    const GekoppeldeTypes = alleTypes.filter((type) => type.haEntityId);
    if (GekoppeldeTypes.length === 0) {
      return { success: false, error: 'Geen Home Assistant sensoren gekoppeld in de database.' };
    }

    const groepen = new Map<string, typeof GekoppeldeTypes>();
    for (const type of GekoppeldeTypes) {
      const basisCode = type.code.replace(/_(PIEK|DAL)$/i, '');
      const groepSleutel = `${type.haEntityId}:${basisCode}`;
      groepen.set(groepSleutel, [...(groepen.get(groepSleutel) ?? []), type]);
    }

    const opslagActies = [];

    for (const groep of groepen.values()) {
      const entityId = groep[0].haEntityId;
      if (!entityId) continue;
      const url = `${HA_URL}/api/history/period/${start.toISOString()}?filter_entity_id=${encodeURIComponent(entityId)}&end_time=${encodeURIComponent(einde.toISOString())}&significant_changes_only=false`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${HA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      console.log(response);
      if (!response.ok) continue;

      const data = await response.json();
      const historie = data?.[0];
      if (!Array.isArray(historie)) continue;

      const bronTypes = groep.filter((type) => type.haSingleSourcePeak || type.haSingleSourceOffPeak);
      const dagelijkseReset = groep.some((type) => type.haDailyReset);
      const gesplitst = splitsMeterHistorie(historie, start, einde, daluren, dagelijkseReset);
      if (!gesplitst) continue;

      if (bronTypes.length > 0) {
        const basisCode = bronTypes[0].code.replace(/_(PIEK|DAL)$/i, '');
        const bewaarPiek = bronTypes.some((type) => type.haSingleSourcePeak);
        const bewaarDal = bronTypes.some((type) => type.haSingleSourceOffPeak);
        const piekType = bewaarPiek ? alleTypes.find((type) => type.code === `${basisCode}_PIEK`) : undefined;
        const dalType = bewaarDal ? alleTypes.find((type) => type.code === `${basisCode}_DAL`) : undefined;

        if (bewaarPiek && piekType) {
          opslagActies.push(
            prisma.dagMeting.upsert({
              where: {
                datum_metingTypeId_herkomst: {
                  datum: datumSchoon,
                  metingTypeId: piekType.id,
                  herkomst: 'HOME_ASSISTANT',
                },
              },
              update: { waarde: gesplitst.piek },
              create: {
                datum: datumSchoon,
                metingTypeId: piekType.id,
                waarde: gesplitst.piek,
                herkomst: 'HOME_ASSISTANT',
              },
            })
          );
        }

        if (bewaarDal && dalType) {
          opslagActies.push(
            prisma.dagMeting.upsert({
              where: {
                datum_metingTypeId_herkomst: {
                  datum: datumSchoon,
                  metingTypeId: dalType.id,
                  herkomst: 'HOME_ASSISTANT',
                },
              },
              update: { waarde: gesplitst.dal },
              create: {
                datum: datumSchoon,
                metingTypeId: dalType.id,
                waarde: gesplitst.dal,
                herkomst: 'HOME_ASSISTANT',
              },
            })
          );
        }
      } else {
        const dagTotaal = Math.round((gesplitst.piek + gesplitst.dal) * 1000) / 1000;
        for (const type of groep) {
          opslagActies.push(
            prisma.dagMeting.upsert({
              where: {
                datum_metingTypeId_herkomst: {
                  datum: datumSchoon,
                  metingTypeId: type.id,
                  herkomst: 'HOME_ASSISTANT',
                },
              },
              update: { waarde: dagTotaal },
              create: {
                datum: datumSchoon,
                metingTypeId: type.id,
                waarde: dagTotaal,
                herkomst: 'HOME_ASSISTANT',
              },
            })
          );
        }
      }
    }

    if (opslagActies.length > 0) {
      await prisma.$transaction(opslagActies);
      revalidatePath('/verbruik');
      return { success: true, aantal: opslagActies.length };
    }

    return { success: false, error: 'Geen data gevonden voor deze datum.' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function testVerbinding() {
  if (!HA_URL || !HA_TOKEN) {
    throw new Error('Home Assistant variabelen ontbreken in .env!');
  }

  const response = await fetch(`${HA_URL}/api/`, {
    headers: {
      Authorization: `Bearer ${HA_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  return await response.json(); // Geeft status: "API running" terug bij succes
}