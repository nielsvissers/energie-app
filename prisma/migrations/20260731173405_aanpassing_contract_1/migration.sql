/*
  Warnings:

  - You are about to drop the column `is_cent` on the `contract_tarieven` table. All the data in the column will be lost.
  - You are about to drop the column `prijs_per_eenheid` on the `contract_tarieven` table. All the data in the column will be lost.
  - The primary key for the `dynamische_prijzen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `timestamp` on the `dynamische_prijzen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to drop the column `is_cent` on the `factuur_lijnen` table. All the data in the column will be lost.
  - The primary key for the `minuut_metingen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `timestamp` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `kwartier_timestamp` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `berekend_op` on the `simulatie_resultaten` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - Added the required column `prijs_per_eenheid_excl_btw` to the `contract_tarieven` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prijs_per_eenheid_incl_btw` to the `contract_tarieven` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `contract_tarieven` DROP COLUMN `is_cent`,
    DROP COLUMN `prijs_per_eenheid`,
    ADD COLUMN `btw_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 6.00,
    ADD COLUMN `prijs_per_eenheid_excl_btw` DECIMAL(12, 6) NOT NULL,
    ADD COLUMN `prijs_per_eenheid_incl_btw` DECIMAL(12, 6) NOT NULL;

-- AlterTable
ALTER TABLE `dynamische_prijzen` DROP PRIMARY KEY,
    MODIFY `timestamp` DATETIME NOT NULL,
    ADD PRIMARY KEY (`timestamp`);

-- AlterTable
ALTER TABLE `facturen` ADD COLUMN `verbruik_excl_nacht` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `factuur_lijnen` DROP COLUMN `is_cent`;

-- AlterTable
ALTER TABLE `minuut_metingen` DROP PRIMARY KEY,
    MODIFY `timestamp` DATETIME NOT NULL,
    MODIFY `kwartier_timestamp` DATETIME NOT NULL,
    ADD PRIMARY KEY (`timestamp`);

-- AlterTable
ALTER TABLE `simulatie_resultaten` MODIFY `berekend_op` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
