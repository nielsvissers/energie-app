export const Eenheid= {
  KWH: 'KWH',
  KW_JAAR: 'KW_JAAR',
  VAST_JAAR: 'VAST_JAAR',
  MAAND: 'MAAND',
  PERCENTAGE: 'PERCENTAGE',
  VAST_BEDRAG: 'VAST_BEDRAG',
  KVA_JAAR: 'KVA_JAAR'
};

export type Eenheid = (typeof Eenheid)[keyof typeof Eenheid]