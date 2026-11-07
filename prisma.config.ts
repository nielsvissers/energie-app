// prisma.config.ts
import { defineConfig } from '@prisma/config';

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: process.env.DATABASE_URL || 'mysql://energydb:baU4M(K6lfd9TzaV@192.168.1.252:3306/energie_db',
    },
});