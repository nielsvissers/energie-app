'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const HA_URL = process.env.HOME_ASSISTANT_URL;
const HA_TOKEN = process.env.HOME_ASSISTANT_TOKEN;

export async function syncHomeAssistantDagMetingen(targetDatumStr?: string) {
  if (!HA_URL || !HA_TOKEN) {
    return { success: false, error: 'Home Assistant variabelen ontbreken in .env' };
  }

  function toDbDateOnly(value: Date) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate(), 12));
  }


  // Bepaal de datum: meegegeven datum óf gisteren
  const d = targetDatumStr ? new Date(targetDatumStr) : new Date();
  if (!targetDatumStr) d.setDate(d.getDate() - 1);

  const startIso = new Date(d.setHours(0, 0, 0, 0)).toISOString();

  const datumSchoon = toDbDateOnly(d);
  try {
    // 1. Haal alleen metingTypes op die een Home Assistant Entity ID gekoppeld hebben
    const GekoppeldeTypes = await prisma.metingType.findMany({
      where: {
        haEntityId: {
          not: null,
        },
      },
    });

    if (GekoppeldeTypes.length === 0) {
      return { success: false, error: 'Geen Home Assistant sensoren gekoppeld in de database.' };
    }

    const opslagActies = [];

    // 2. Loop dynamisch door alle gekoppelde types uit de DB
    for (const type of GekoppeldeTypes) {
      const entityId = type.haEntityId!;
      const url = `${HA_URL}/api/history/period/${startIso}?filter_entity_id=${entityId}&significant_changes_only=false`;
      console.log(url);
      const response = await fetch(
        url,
        {
          headers: {
            Authorization: `Bearer ${HA_TOKEN}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );

      if (!response.ok) continue;

      const data = await response.json();

      // Bereken dagtotaal (laatste stand - eerste stand van de dag)
      if (data && data[0] && data[0].length > 1) {
        const firstState = parseFloat(data[0][1].state);
        const lastState = parseFloat(data[0][data[0].length - 1].state);

        if (!isNaN(firstState) && !isNaN(lastState)) {
          const dagTotaal = Math.max(0, Math.round((lastState - firstState) * 1000) / 1000);

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