'use server'
import { db } from '@/lib/db';
import { prisma } from '@/lib/prisma';
import { TariefType } from '@prisma/client';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GetTariefTypes():Promise<TariefType[] | undefined | null> {
  return await prisma.tariefType.findMany();
}

export async function AddTariefType(data:TariefType) {
    var result =await prisma.tariefType.create({data});
    return result;
}
