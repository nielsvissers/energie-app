'use server';

import { parseContractType, parseEenheid } from '@/lib/conversion';
import { db } from '@/lib/db';
import { prisma } from '@/lib/prisma';
import { Contract, ContractWithTarieven } from '@/types/Contract';
import { EnergieContract } from '@prisma/client';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Tarief {
  id?: number;
  contract_id?: number;
  type: string; // bijv. AFNAME_DAG, AFNAME_NACHT, VASTE_KOST
  prijsPerEenheid: number;
  isVasteKostPerJaar: boolean;
  herrekenPerDag: boolean;
  isCent: boolean;
}


/**
 * Haalt alle contracten op inclusief hun actieve tarieven
 */

export async function getContractenMetTarieven():Promise<Contract[]> {
  let dbcontracts= await prisma.energieContract.findMany({
    include: {
      tarieven: {
        include: {
          type: true,
        },
      }
    },
    orderBy: {
      startDatum: 'desc',
    },
  });
  let contracts:Contract[]=[];

  return dbcontracts as Contract[];
}
export async function getContractMetTarieven(id: number) {
  return await prisma.energieContract.findUnique({
    include: {
      tarieven: {
        include: {
          type: true,
        },
      }
    },
    where: { id: id }
  });
}

export async function UpdateContract(data: Contract) {
  try {
    var updatedContract = await prisma.energieContract.update({
      where: { id: data.id },
      data: {
        contractNaam: data.contractNaam,
        eindDatum: data.eindDatum,
        leverancier: data.leverancier,
        startDatum: data.startDatum,
        type: parseContractType(data.type)
      }
    })

    for (const t of data.tarieven) {
      if (t.id !== undefined) {
        var upsertTarief = await prisma.contractTarief.update({
          where: { id: t.id },
          data: {
            btwPercentage: t.btwPercentage,
            contractId: data.id,
            eenheid: parseEenheid(t.eenheid),
            geldigTot: t.geldigTot,
            geldigVan: t.geldigVan,
            herrekenPerDag: t.herrekenPerDag,
            prijsPerEenheidExclBtw: t.prijsPerEenheidExclBtw,
            prijsPerEenheidInclBtw: t.prijsPerEenheidInclBtw,
            tariefTypeId: t.tariefTypeId
          }
        })
      }
      else {
        var createdTarief = await prisma.contractTarief.create({
          data: {
            btwPercentage: t.btwPercentage,
            contractId: data.id,
            eenheid: parseEenheid(t.eenheid),
            geldigTot: t.geldigTot,
            geldigVan: t.geldigVan,
            herrekenPerDag: t.herrekenPerDag,
            prijsPerEenheidExclBtw: t.prijsPerEenheidExclBtw,
            prijsPerEenheidInclBtw: t.prijsPerEenheidInclBtw,
            tariefTypeId: t.tariefTypeId
          }
        })

      }
    }

    return { success: true, contractId: updatedContract.id };
  } catch (error: any) {
    console.error('Fout bij opslaan contract:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Maakt een nieuw contract aan inclusief gekoppelde tarieven (Transactie)
 */
export async function opslaanContract(data: Contract) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [contractRes] = await connection.query<ResultSetHeader>(
      `INSERT INTO energie_contracten (leverancier, contract_naam, type, start_datum, eind_datum) 
       VALUES (?, ?, ?, ?,?)`,
      [data.leverancier, data.contractNaam, data.type, data.startDatum, data.eindDatum || null]
    );

    const contractId = contractRes.insertId;

    /* for (const t of data.tarieven) {
       await connection.query(
         `INSERT INTO contract_tarieven 
          (contract_id, type, prijs_per_eenheid, is_vaste_kost_per_jaar, herreken_per_dag, is_cent, geldig_van) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
         [
           contractId,
           t.type,
           t.prijsPerEenheid,
           t.isVasteKostPerJaar ? 1 : 0,
           t.herrekenPerDag ? 1 : 0,
           t.isCent ? 1 : 0,
           data.startDatum
         ]
       );
     }*/

    await connection.commit();
    return { success: true, contractId };
  } catch (error: any) {
    await connection.rollback();
    console.error('Fout bij opslaan contract:', error);
    return { success: false, error: error.message };
  } finally {
    connection.release();
  }
}