import { Prisma } from "@prisma/client";
import { ContractType } from "./ContractType";
import { ContractTarief } from "./ContractTarief";
import { Factuur } from "./Factuur";

export type Contract = {

    id: number
    leverancier: string
    contractNaam: string
    type: ContractType
    startDatum: Date
    eindDatum: Date | null
    tarieven: ContractTarief[];
    facturen: Factuur[]
}

export type ContractWithTarieven = Prisma.EnergieContractGetPayload<{ include: { tarieven: true } }>;