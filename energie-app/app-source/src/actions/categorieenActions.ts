'use server';

import { db } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Kostencategorie {
  id: number;
  naam: string;
  type: string;
  beschrijving?: string;
}

/**
 * Haalt alle kostencategorieën op
 */
export async function getKostencategorieen(): Promise<Kostencategorie[]> {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, naam, type, eenheid, herreken_per_dag FROM kostencategorieen ORDER BY naam ASC'
    );
    return rows as Kostencategorie[];
  } catch (error) {
    console.error('Fout bij ophalen kostencategorieën:', error);
    return [];
  }
}

/**
 * Voegt een nieuwe kostencategorie toe
 */
export async function voegKostencategorieToe(data: { naam: string; type: string; eenheid: string, herrekenPerDag:boolean }) {
  try {
    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO kostencategorieen (naam, type, eenheid, herreken_per_dag) VALUES (?, ?, ?, ?)',
      [data.naam, data.type, data.eenheid, data.herrekenPerDag]
    );
    return { success: true, id: result.insertId };
  } catch (error: any) {
    console.error('Fout bij toevoegen kostencategorie:', error);
    return { success: false, error: error.message };
  }
}