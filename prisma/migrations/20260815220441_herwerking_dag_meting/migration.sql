/*
  Warnings:

  - The primary key for the `dag_metingen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `afname_kwh` on the `dag_metingen` table. All the data in the column will be lost.
  - You are about to drop the column `injectie_kwh` on the `dag_metingen` table. All the data in the column will be lost.
  - You are about to drop the column `max_dag_piek_kw` on the `dag_metingen` table. All the data in the column will be lost.
  - You are about to drop the column `zonne_productie_kwh` on the `dag_metingen` table. All the data in the column will be lost.
  - The primary key for the `dynamische_prijzen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `timestamp` on the `dynamische_prijzen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - The primary key for the `minuut_metingen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `timestamp` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `kwartier_timestamp` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `berekend_op` on the `simulatie_resultaten` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - A unique constraint covering the columns `[datum,meting_type_id,herkomst]` on the table `dag_metingen` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id` to the `dag_metingen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `meting_type_id` to the `dag_metingen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `waarde` to the `dag_metingen` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `idx_dag_herkomst` ON `dag_metingen`;

-- AlterTable
ALTER TABLE `dag_metingen` DROP PRIMARY KEY,
    DROP COLUMN `afname_kwh`,
    DROP COLUMN `injectie_kwh`,
    DROP COLUMN `max_dag_piek_kw`,
    DROP COLUMN `zonne_productie_kwh`,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `meting_type_id` INTEGER NOT NULL,
    ADD COLUMN `waarde` DOUBLE NOT NULL,
    MODIFY `herkomst` ENUM('HISTORISCH_IMPORT', 'HOME_ASSISTANT', 'MANUEEL') NOT NULL DEFAULT 'MANUEEL',
    ADD PRIMARY KEY (`id`);

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
CREATE TABLE `meting_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `naam` VARCHAR(191) NOT NULL,
    `eenheid` VARCHAR(191) NOT NULL DEFAULT 'kWh',

    UNIQUE INDEX `meting_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_dag_datum` ON `dag_metingen`(`datum`);

-- CreateIndex
CREATE UNIQUE INDEX `unique_dag_meting_type` ON `dag_metingen`(`datum`, `meting_type_id`, `herkomst`);

-- AddForeignKey
ALTER TABLE `dag_metingen` ADD CONSTRAINT `dag_metingen_meting_type_id_fkey` FOREIGN KEY (`meting_type_id`) REFERENCES `meting_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
