/*
  Warnings:

  - You are about to drop the column `type` on the `contract_tarieven` table. All the data in the column will be lost.
  - The primary key for the `dynamische_prijzen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `timestamp` on the `dynamische_prijzen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - The primary key for the `minuut_metingen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `timestamp` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `kwartier_timestamp` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `berekend_op` on the `simulatie_resultaten` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - Added the required column `tariefTypeSleutel` to the `contract_tarieven` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `contract_tarieven` DROP COLUMN `type`,
    ADD COLUMN `tariefTypeSleutel` VARCHAR(64) NOT NULL;

-- AlterTable
ALTER TABLE `dynamische_prijzen` DROP PRIMARY KEY,
    MODIFY `timestamp` DATETIME NOT NULL,
    ADD PRIMARY KEY (`timestamp`);

-- AlterTable
ALTER TABLE `minuut_metingen` DROP PRIMARY KEY,
    MODIFY `timestamp` DATETIME NOT NULL,
    MODIFY `kwartier_timestamp` DATETIME NOT NULL,
    ADD PRIMARY KEY (`timestamp`);

-- AlterTable
ALTER TABLE `simulatie_resultaten` MODIFY `berekend_op` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE `tarief_types` (
    `sleutel` VARCHAR(64) NOT NULL,
    `waarde` TEXT NOT NULL,
    `beschrijving` VARCHAR(255) NULL,

    PRIMARY KEY (`sleutel`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contract_tarieven` ADD CONSTRAINT `contract_tarieven_tariefTypeSleutel_fkey` FOREIGN KEY (`tariefTypeSleutel`) REFERENCES `tarief_types`(`sleutel`) ON DELETE RESTRICT ON UPDATE CASCADE;
