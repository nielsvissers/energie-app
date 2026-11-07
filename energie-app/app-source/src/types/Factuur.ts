
import { FactuurLijn } from "./FactuurLijn";
import { FactuurType } from "./FactuurType";
import { Contract } from "./Contract";

export type Factuur = {

    id: number
    contractId: number | null
    factuurnummer: string | null
    factuurDatum: Date
    startDatum: Date
    eindDatum: Date
    factuurType: FactuurType
    verbruikDag: number
    verbruikNacht: number
    verbruikExclNacht: number
    injectieDag: number
    injectieNacht: number
    totaalBedragExclBtw: number
    totaalBtwBedrag: number
    totaalBedragInclBtw: number
    lijnen: FactuurLijn[];
    contract: Contract| null
    piekvermogen:number
}

//export type ContractWithTarieven = Prisma.EnergieContractGetPayload<{ include: { tarieven: true } }>;