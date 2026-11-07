
export const FactuurType = {
  VOORSCHOT: 'VOORSCHOT',
  AFREKENING: 'AFREKENING',
  SLOTFACTUUR: 'SLOTFACTUUR',
};

export type FactuurType = (typeof FactuurType)[keyof typeof FactuurType]

