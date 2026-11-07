import { TariefType } from "./TariefType";


export type FactuurLijn = {
    id?: number
    factuurId?: number
    kostencategorieId?: number
    omschrijving?: string | null
    hoeveelheid: number
    eenheidsprijs?: number
    herrekenPerDag?: boolean
    tariefTypeId?: number
    bedragExclBtw?: number
    btwPercentage: number
    bedragInclBtw?: number
    type?: TariefType
};
