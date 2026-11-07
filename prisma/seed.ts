// prisma/seed.ts
import { PrismaClient } from '.prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding van basis kostencategorieën...');

  const categorieen = [
    { naam: 'Afname Elektriciteit', type: 'ENERGIE', eenheid: 'KWH' },
    { naam: 'Injectie Elektriciteit', type: 'ENERGIE', eenheid: 'KWH' },
    { naam: 'Vaste Vergoeding Leverancier', type: 'ENERGIE', eenheid: 'VAST_JAAR' },
    { naam: 'Capaciteitstarief (Netbeheer)', type: 'NETTARIEF', eenheid: 'KW_JAAR' },
    { naam: 'Netvergoeding Afname (kWh-gebaseerd)', type: 'NETTARIEF', eenheid: 'KWH' },
    { naam: 'Bijdrage Energiefonds (Vlaanderen)', type: 'HEFFING', eenheid: 'MAAND' },
    { naam: 'Bijzondere Accijns', type: 'HEFFING', eenheid: 'KWH' },
    { naam: 'Aansluitingsvergoeding', type: 'HEFFING', eenheid: 'KWH' },
  ];

  for (const cat of categorieen) {
    await prisma.kostencategorie.upsert({
      where: { naam: cat.naam },
      update: {},
      create: {
        naam: cat.naam,
        type: cat.type as any,
        eenheid: cat.eenheid as any,
      },
    });
  }

  console.log('Seeding voltooid!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });