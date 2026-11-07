/*
  Warnings:

  - You are about to drop the column `herrekenPerDag` on the `contract_tarieven` table. All the data in the column will be lost.
  - You are about to drop the column `verbruikDag` on the `facturen` table. All the data in the column will be lost.
  - You are about to drop the column `verbruikNacht` on the `facturen` table. All the data in the column will be lost.
  - You are about to drop the column `herrekenPerDag` on the `kostencategorieen` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `contract_tarieven` DROP COLUMN `herrekenPerDag`,
    ADD COLUMN `eenheid` ENUM('KWH', 'KW_JAAR', 'VAST_JAAR', 'MAAND', 'PERCENTAGE', 'VAST_BEDRAG') NOT NULL DEFAULT 'KWH',
    ADD COLUMN `herreken_per_dag` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `is_cent` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `facturen` DROP COLUMN `verbruikDag`,
    DROP COLUMN `verbruikNacht`,
    ADD COLUMN `injectie_dag` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `injectie_nacht` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `verbruik_dag` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `verbruik_nacht` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `factuur_lijnen` ADD COLUMN `herreken_per_dag` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `is_cent` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `kostencategorie_tarieven` ADD COLUMN `herreken_per_dag` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `kostencategorieen` DROP COLUMN `herrekenPerDag`,
    ADD COLUMN `herreken_per_dag` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `dynamische_prijzen` (
    `timestamp` DATETIME NOT NULL,
    `afname_prijs_per_kwh` DECIMAL(10, 6) NOT NULL,
    `injectie_prijs_per_kwh` DECIMAL(10, 6) NOT NULL,

    PRIMARY KEY (`timestamp`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dag_metingen` (
    `datum` DATE NOT NULL,
    `afname_kwh` DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    `injectie_kwh` DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    `zonne_productie_kwh` DECIMAL(10, 3) NULL,
    `max_dag_piek_kw` DECIMAL(8, 3) NULL,
    `herkomst` ENUM('HISTORISCH_IMPORT', 'HOME_ASSISTANT') NOT NULL DEFAULT 'HOME_ASSISTANT',

    INDEX `idx_dag_herkomst`(`herkomst`),
    PRIMARY KEY (`datum`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `minuut_metingen` (
    `timestamp` DATETIME NOT NULL,
    `afname_kw` DECIMAL(8, 3) NOT NULL DEFAULT 0.000,
    `injectie_kw` DECIMAL(8, 3) NOT NULL DEFAULT 0.000,
    `zonne_productie_kw` DECIMAL(8, 3) NOT NULL DEFAULT 0.000,
    `verbruik_kwh` DECIMAL(10, 6) NOT NULL DEFAULT 0.000000,
    `kwartier_timestamp` DATETIME NOT NULL,

    INDEX `idx_mm_kwartier`(`kwartier_timestamp`),
    PRIMARY KEY (`timestamp`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maandpieken` (
    `jaar_maand` VARCHAR(7) NOT NULL,
    `hoogste_kwartierpiek_kw` DECIMAL(8, 3) NOT NULL,
    `is_gecorrigeerd_naar_minimum` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`jaar_maand`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `investeringen` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `naam` VARCHAR(100) NOT NULL,
    `type` ENUM('ZONNEPANELEN', 'BATTERIJ', 'OMVORMER', 'LAADPUNT', 'DIVERS') NOT NULL,
    `aankoop_datum` DATE NOT NULL,
    `bruto_kostprijs` DECIMAL(10, 2) NOT NULL,
    `subsidies_ontvangen` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `verwachte_levensduur_jaren` INTEGER NOT NULL DEFAULT 15,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `simulatie_profielen` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `naam` VARCHAR(100) NOT NULL,
    `capaciteit_kwh` DECIMAL(8, 2) NOT NULL,
    `omvormer_vermogen_kw` DECIMAL(8, 2) NOT NULL,
    `laad_efficientie_pct` DECIMAL(5, 2) NOT NULL DEFAULT 95.00,
    `ontlaad_efficientie_pct` DECIMAL(5, 2) NOT NULL DEFAULT 95.00,
    `min_soc_pct` DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    `max_soc_pct` DECIMAL(5, 2) NOT NULL DEFAULT 90.00,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `simulatie_resultaten` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `simulatie_profiel_id` INTEGER NOT NULL,
    `start_datum` DATE NOT NULL,
    `eind_datum` DATE NOT NULL,
    `nieuwe_afname_kwh` DECIMAL(10, 3) NOT NULL,
    `nieuwe_injectie_kwh` DECIMAL(10, 3) NOT NULL,
    `zelfconsumptie_pct` DECIMAL(5, 2) NOT NULL,
    `autarkie_pct` DECIMAL(5, 2) NOT NULL,
    `nieuwe_gemiddelde_maandpiek_kw` DECIMAL(8, 3) NOT NULL,
    `geschatte_besparing_eur` DECIMAL(10, 2) NOT NULL,
    `berekend_op` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `simulatie_resultaten` ADD CONSTRAINT `simulatie_resultaten_simulatie_profiel_id_fkey` FOREIGN KEY (`simulatie_profiel_id`) REFERENCES `simulatie_profielen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RedefineIndex
CREATE UNIQUE INDEX `uq_kostencategorie_naam` ON `kostencategorieen`(`naam`);
DROP INDEX `kostencategorieen_naam_key` ON `kostencategorieen`;
