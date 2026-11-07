/*
  Warnings:

  - The primary key for the `dynamische_prijzen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `timestamp` on the `dynamische_prijzen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - The primary key for the `minuut_metingen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `timestamp` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `kwartier_timestamp` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `berekend_op` on the `simulatie_resultaten` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.

*/
-- AlterTable
ALTER TABLE `dynamische_prijzen` DROP PRIMARY KEY,
    MODIFY `timestamp` DATETIME NOT NULL,
    ADD PRIMARY KEY (`timestamp`);

-- AlterTable
ALTER TABLE `meting_types` ADD COLUMN `haEntityId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `minuut_metingen` DROP PRIMARY KEY,
    MODIFY `timestamp` DATETIME NOT NULL,
    MODIFY `kwartier_timestamp` DATETIME NOT NULL,
    ADD PRIMARY KEY (`timestamp`);

-- AlterTable
ALTER TABLE `simulatie_resultaten` MODIFY `berekend_op` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
