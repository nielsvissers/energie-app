/*
  Warnings:

  - You are about to drop the column `tariefTypeSleutel` on the `contract_tarieven` table. All the data in the column will be lost.
  - The primary key for the `dynamische_prijzen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `timestamp` on the `dynamische_prijzen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - The primary key for the `minuut_metingen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `timestamp` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `kwartier_timestamp` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `berekend_op` on the `simulatie_resultaten` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - The primary key for the `tarief_types` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `tariefTypeId` to the `contract_tarieven` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id` to the `tarief_types` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `contract_tarieven` DROP FOREIGN KEY `contract_tarieven_tariefTypeSleutel_fkey`;

-- DropIndex
DROP INDEX `contract_tarieven_tariefTypeSleutel_fkey` ON `contract_tarieven`;

-- AlterTable
ALTER TABLE `contract_tarieven` DROP COLUMN `tariefTypeSleutel`,
    ADD COLUMN `tariefTypeId` INTEGER NOT NULL;

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

-- AlterTable
ALTER TABLE `tarief_types` DROP PRIMARY KEY,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AddForeignKey
ALTER TABLE `contract_tarieven` ADD CONSTRAINT `contract_tarieven_tariefTypeId_fkey` FOREIGN KEY (`tariefTypeId`) REFERENCES `tarief_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
