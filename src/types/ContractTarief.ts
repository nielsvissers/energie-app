import { Contract } from "./Contract"
import { Eenheid } from "./Eenheid"
import { TariefType } from "./TariefType"

export type ContractTarief = {
    contract: Contract
    type: TariefType
    id: number
    contractId: number
    prijsPerEenheidInclBtw: number
    prijsPerEenheidExclBtw: number
    btwPercentage: number
    eenheid: Eenheid
    herrekenPerDag: boolean
    geldigVan: Date
    geldigTot: Date | null
    tariefTypeId: number
}