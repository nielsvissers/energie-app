
export const ContractType= {
  VAST: 'VAST',
  VARIABEL: 'VARIABEL',
  DYNAMISCH: 'DYNAMISCH'
};

export type ContractType = (typeof ContractType)[keyof typeof ContractType]