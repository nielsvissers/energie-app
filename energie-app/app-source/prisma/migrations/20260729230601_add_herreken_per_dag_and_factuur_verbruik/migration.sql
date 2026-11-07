-- CreateTable
CREATE TABLE `instellingen` (
    `sleutel` VARCHAR(64) NOT NULL,
    `waarde` TEXT NOT NULL,
    `beschrijving` VARCHAR(255) NULL,

    PRIMARY KEY (`sleutel`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kostencategorie_tarieven` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kostencategorie_id` INTEGER NOT NULL,
    `regio_netbeheerder` VARCHAR(100) NULL,
    `prijs_excl_btw` DECIMAL(12, 6) NOT NULL,
    `btw_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 6.00,
    `geldig_van` DATE NOT NULL,
    `geldig_tot` DATE NULL,
    `min_drempel_waarde` DECIMAL(8, 2) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kostencategorieen` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `naam` VARCHAR(100) NOT NULL,
    `type` ENUM('NETTARIEF', 'HEFFING', 'ENERGIE', 'BTW', 'KORTING', 'DIVERS') NOT NULL,
    `eenheid` ENUM('KWH', 'KW_JAAR', 'VAST_JAAR', 'MAAND', 'PERCENTAGE', 'VAST_BEDRAG') NOT NULL,
    `herrekenPerDag` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `kostencategorieen_naam_key`(`naam`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `energie_contracten` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `leverancier` VARCHAR(100) NOT NULL,
    `contract_naam` VARCHAR(100) NOT NULL,
    `type` ENUM('VAST', 'VARIABEL', 'DYNAMISCH') NOT NULL,
    `start_datum` DATE NOT NULL,
    `eind_datum` DATE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contract_tarieven` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contract_id` INTEGER NOT NULL,
    `type` ENUM('AFNAME_DAG', 'AFNAME_NACHT', 'AFNAME_ENKEL', 'INJECTIE_DAG', 'INJECTIE_NACHT', 'INJECTIE_ENKEL', 'VASTE_VERGOEDING') NOT NULL,
    `prijs_per_eenheid` DECIMAL(12, 6) NOT NULL,
    `geldig_van` DATE NOT NULL,
    `geldig_tot` DATE NULL,
    `herrekenPerDag` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facturen` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contract_id` INTEGER NULL,
    `factuurnummer` VARCHAR(64) NULL,
    `factuur_datum` DATE NOT NULL,
    `start_datum` DATE NOT NULL,
    `eind_datum` DATE NOT NULL,
    `factuur_type` ENUM('VOORSCHOT', 'AFREKENING', 'SLOTFACTUUR') NOT NULL,
    `totaal_bedrag_excl_btw` DECIMAL(10, 2) NOT NULL,
    `totaal_btw_bedrag` DECIMAL(10, 2) NOT NULL,
    `totaal_bedrag_incl_btw` DECIMAL(10, 2) NOT NULL,
    `verbruikDag` DECIMAL(10, 2) NULL DEFAULT 0,
    `verbruikNacht` DECIMAL(10, 2) NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `factuur_lijnen` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `factuur_id` INTEGER NOT NULL,
    `kostencategorie_id` INTEGER NOT NULL,
    `omschrijving` VARCHAR(255) NULL,
    `hoeveelheid` DECIMAL(12, 4) NOT NULL,
    `eenheidsprijs` DECIMAL(12, 6) NOT NULL,
    `bedrag_excl_btw` DECIMAL(10, 2) NOT NULL,
    `btw_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 6.00,
    `bedrag_incl_btw` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `kostencategorie_tarieven` ADD CONSTRAINT `kostencategorie_tarieven_kostencategorie_id_fkey` FOREIGN KEY (`kostencategorie_id`) REFERENCES `kostencategorieen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract_tarieven` ADD CONSTRAINT `contract_tarieven_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `energie_contracten`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facturen` ADD CONSTRAINT `facturen_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `energie_contracten`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `factuur_lijnen` ADD CONSTRAINT `factuur_lijnen_factuur_id_fkey` FOREIGN KEY (`factuur_id`) REFERENCES `facturen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `factuur_lijnen` ADD CONSTRAINT `factuur_lijnen_kostencategorie_id_fkey` FOREIGN KEY (`kostencategorie_id`) REFERENCES `kostencategorieen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
