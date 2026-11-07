import {
    ContractType as PrismaContractType,
    FactuurType as PrismaFactuurType,
    Eenheid as PrismaEenheid,
} from "@prisma/client";

export function parseFactuurType(value: string): PrismaFactuurType {
    const isGeldig = Object.values(PrismaFactuurType).includes(value as PrismaFactuurType);

    if (isGeldig) {
        return value as PrismaFactuurType;
    }

    return PrismaFactuurType.AFREKENING; // Of geef een default waarde terug, bijv. TariefType.Vast
}

export function parseContractType(value: string): PrismaContractType {
    const isGeldig = Object.values(PrismaContractType).includes(value as PrismaContractType);

    if (isGeldig) {
        return value as PrismaContractType;
    }

    return PrismaContractType.VAST; // Of geef een default waarde terug, bijv. TariefType.Vast
}

export function parseEenheid(value: string): PrismaEenheid {
    const isGeldig = Object.values(PrismaEenheid).includes(value as PrismaEenheid);

    if (isGeldig) {
        return value as PrismaEenheid;
    }

    return PrismaEenheid.KWH; // Of geef een default waarde terug, bijv. TariefType.Vast
}