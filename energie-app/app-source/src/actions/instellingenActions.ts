'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { DalurenInstellingen, parseDalurenInstellingen } from '@/lib/daluren';

const HA_URL = process.env.HOME_ASSISTANT_URL;
const HA_TOKEN = process.env.HOME_ASSISTANT_TOKEN;

export interface HASensor {
  entity_id: string;
  friendly_name: string;
  unit_of_measurement?: string;
}

// 1. Haal alle geschikte sensoren op uit Home Assistant
// src/actions/instellingenActions.ts

export async function getHomeAssistantSensoren(): Promise<{ success: boolean; sensoren: HASensor[]; error?: string }> {
  if (!HA_URL || !HA_TOKEN) {
    return { success: false, sensoren: [], error: 'Home Assistant variabelen (.env) ontbreken.' };
  }

  try {
    const response = await fetch(`${HA_URL}/api/states`, {
      headers: {
        Authorization: `Bearer ${HA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { success: false, sensoren: [], error: `HA API Fout: ${response.statusText}` };
    }

    const states = await response.json();

    // Filter alleen entiteiten die:
    // 1. Een sensor. entity_id hebben
    // 2. OF device_class 'energy' hebben, OF unit_of_measurement 'kWh' / 'Wh' hebben
    const sensoren: HASensor[] = states
      .filter((s: any) => {
        const isSensor = s.entity_id.startsWith('sensor.');
        const attrs = s.attributes || {};

        const isEnergyClass = attrs.device_class === 'energy';
        const isKwhUnit = attrs.unit_of_measurement?.toLowerCase() === 'kwh' ||
          attrs.unit_of_measurement?.toLowerCase() === 'wh';

        // Behoud de sensor als deze aan het energie-criteria voldoet
        return isSensor && (isEnergyClass || isKwhUnit);
      })
      .map((s: any) => ({
        entity_id: s.entity_id,
        friendly_name: s.attributes.friendly_name || s.entity_id,
        unit_of_measurement: s.attributes.unit_of_measurement || '',
      }))
      .sort((a: HASensor, b: HASensor) => a.friendly_name.localeCompare(b.friendly_name));

    return { success: true, sensoren };
  } catch (error: any) {
    return { success: false, sensoren: [], error: error.message };
  }
}

// 2. Haal alle MetingTypes op inclusief de eventueel gekoppelde haEntityId
export async function getMetingTypesMetSensoren() {
  return await prisma.metingType.findMany({
    orderBy: { naam: 'asc' },
  });
}

// 3. Sla een gekoppelde sensor op bij een MetingType
export async function koppelHaEntityId(metingTypeId: number, haEntityId: string | null) {
  try {
    await prisma.metingType.update({
      where: { id: metingTypeId },
      data: { haEntityId: haEntityId || null },
    });

    revalidatePath('/instellingen');
    revalidatePath('/verbruik');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
export async function setDailyReset(metingTypeId: number, dailyReset: boolean) {
  try {
    await prisma.metingType.update({
      where: { id: metingTypeId },
      data: { haDailyReset: dailyReset },
    });

    revalidatePath('/instellingen');
    revalidatePath('/verbruik');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
export async function setSingleSourceOffPeak(metingTypeId: number, singleSourceOffPeak: boolean) {
  try {
    await prisma.metingType.update({
      where: { id: metingTypeId },
      data: { haSingleSourceOffPeak: singleSourceOffPeak },
    });

    revalidatePath('/instellingen');
    revalidatePath('/verbruik');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
export async function setSingleSourcePeak(metingTypeId: number, singleSourcePeak: boolean) {
  try {
    await prisma.metingType.update({
      where: { id: metingTypeId },
      data: { haSingleSourcePeak: singleSourcePeak },
    });

    revalidatePath('/instellingen');
    revalidatePath('/verbruik');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

const DALUREN_SLEUTEL = 'daluren_schema';

export async function getDalurenInstellingen(): Promise<DalurenInstellingen> {
  const instelling = await prisma.instelling.findUnique({ where: { sleutel: DALUREN_SLEUTEL } });
  return parseDalurenInstellingen(instelling?.waarde);
}

export async function setDalurenInstellingen(instellingen: DalurenInstellingen) {
  const tijdPatroon = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (
    !tijdPatroon.test(instellingen.start) ||
    !tijdPatroon.test(instellingen.einde) ||
    instellingen.start === instellingen.einde ||
    typeof instellingen.weekends !== 'boolean'
  ) {
    return { success: false, error: 'Geef geldige en verschillende begin- en eindtijden op.' };
  }

  try {
    await prisma.instelling.upsert({
      where: { sleutel: DALUREN_SLEUTEL },
      update: { waarde: JSON.stringify(instellingen) },
      create: {
        sleutel: DALUREN_SLEUTEL,
        waarde: JSON.stringify(instellingen),
        beschrijving: 'Daluren voor het splitsen van Home Assistant-metingen',
      },
    });
    revalidatePath('/instellingen');
    revalidatePath('/instellingen/daluren');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}