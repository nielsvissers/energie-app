/*
  Warnings:

  - You are about to alter the column `btw_percentage` on the `contract_tarieven` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Double`.
  - You are about to alter the column `prijs_per_eenheid_excl_btw` on the `contract_tarieven` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,6)` to `Double`.
  - You are about to alter the column `prijs_per_eenheid_incl_btw` on the `contract_tarieven` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,6)` to `Double`.
  - You are about to alter the column `afname_kwh` on the `dag_metingen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,3)` to `Double`.
  - You are about to alter the column `injectie_kwh` on the `dag_metingen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,3)` to `Double`.
  - You are about to alter the column `zonne_productie_kwh` on the `dag_metingen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,3)` to `Double`.
  - You are about to alter the column `max_dag_piek_kw` on the `dag_metingen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(8,3)` to `Double`.
  - The primary key for the `dynamische_prijzen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `timestamp` on the `dynamische_prijzen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `afname_prijs_per_kwh` on the `dynamische_prijzen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,6)` to `Double`.
  - You are about to alter the column `injectie_prijs_per_kwh` on the `dynamische_prijzen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,6)` to `Double`.
  - You are about to alter the column `totaal_bedrag_excl_btw` on the `facturen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `totaal_btw_bedrag` on the `facturen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `totaal_bedrag_incl_btw` on the `facturen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `injectie_dag` on the `facturen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `injectie_nacht` on the `facturen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `verbruik_dag` on the `facturen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `verbruik_nacht` on the `facturen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `verbruik_excl_nacht` on the `facturen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `hoeveelheid` on the `factuur_lijnen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,4)` to `Double`.
  - You are about to alter the column `eenheidsprijs` on the `factuur_lijnen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,6)` to `Double`.
  - You are about to alter the column `bedrag_excl_btw` on the `factuur_lijnen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `btw_percentage` on the `factuur_lijnen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Double`.
  - You are about to alter the column `bedrag_incl_btw` on the `factuur_lijnen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `bruto_kostprijs` on the `investeringen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `subsidies_ontvangen` on the `investeringen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `prijs_excl_btw` on the `kostencategorie_tarieven` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,6)` to `Double`.
  - You are about to alter the column `btw_percentage` on the `kostencategorie_tarieven` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Double`.
  - You are about to alter the column `min_drempel_waarde` on the `kostencategorie_tarieven` table. The data in that column could be lost. The data in that column will be cast from `Decimal(8,2)` to `Double`.
  - You are about to alter the column `hoogste_kwartierpiek_kw` on the `maandpieken` table. The data in that column could be lost. The data in that column will be cast from `Decimal(8,3)` to `Double`.
  - The primary key for the `minuut_metingen` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `timestamp` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `afname_kw` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(8,3)` to `Double`.
  - You are about to alter the column `injectie_kw` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(8,3)` to `Double`.
  - You are about to alter the column `zonne_productie_kw` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(8,3)` to `Double`.
  - You are about to alter the column `verbruik_kwh` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,6)` to `Double`.
  - You are about to alter the column `kwartier_timestamp` on the `minuut_metingen` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `capaciteit_kwh` on the `simulatie_profielen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(8,2)` to `Double`.
  - You are about to alter the column `omvormer_vermogen_kw` on the `simulatie_profielen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(8,2)` to `Double`.
  - You are about to alter the column `laad_efficientie_pct` on the `simulatie_profielen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Double`.
  - You are about to alter the column `ontlaad_efficientie_pct` on the `simulatie_profielen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Double`.
  - You are about to alter the column `min_soc_pct` on the `simulatie_profielen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Double`.
  - You are about to alter the column `max_soc_pct` on the `simulatie_profielen` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Double`.
  - You are about to alter the column `nieuwe_afname_kwh` on the `simulatie_resultaten` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,3)` to `Double`.
  - You are about to alter the column `nieuwe_injectie_kwh` on the `simulatie_resultaten` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,3)` to `Double`.
  - You are about to alter the column `zelfconsumptie_pct` on the `simulatie_resultaten` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Double`.
  - You are about to alter the column `autarkie_pct` on the `simulatie_resultaten` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Double`.
  - You are about to alter the column `nieuwe_gemiddelde_maandpiek_kw` on the `simulatie_resultaten` table. The data in that column could be lost. The data in that column will be cast from `Decimal(8,3)` to `Double`.
  - You are about to alter the column `geschatte_besparing_eur` on the `simulatie_resultaten` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `berekend_op` on the `simulatie_resultaten` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.

*/
-- AlterTable
ALTER TABLE `contract_tarieven` MODIFY `btw_percentage` DOUBLE NOT NULL DEFAULT 6.00,
    MODIFY `prijs_per_eenheid_excl_btw` DOUBLE NOT NULL,
    MODIFY `prijs_per_eenheid_incl_btw` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `dag_metingen` MODIFY `afname_kwh` DOUBLE NOT NULL DEFAULT 0.000,
    MODIFY `injectie_kwh` DOUBLE NOT NULL DEFAULT 0.000,
    MODIFY `zonne_productie_kwh` DOUBLE NULL,
    MODIFY `max_dag_piek_kw` DOUBLE NULL;

-- AlterTable
ALTER TABLE `dynamische_prijzen` DROP PRIMARY KEY,
    MODIFY `timestamp` DATETIME NOT NULL,
    MODIFY `afname_prijs_per_kwh` DOUBLE NOT NULL,
    MODIFY `injectie_prijs_per_kwh` DOUBLE NOT NULL,
    ADD PRIMARY KEY (`timestamp`);

-- AlterTable
ALTER TABLE `facturen` MODIFY `totaal_bedrag_excl_btw` DOUBLE NOT NULL,
    MODIFY `totaal_btw_bedrag` DOUBLE NOT NULL,
    MODIFY `totaal_bedrag_incl_btw` DOUBLE NOT NULL,
    MODIFY `injectie_dag` DOUBLE NOT NULL DEFAULT 0.00,
    MODIFY `injectie_nacht` DOUBLE NOT NULL DEFAULT 0.00,
    MODIFY `verbruik_dag` DOUBLE NOT NULL DEFAULT 0.00,
    MODIFY `verbruik_nacht` DOUBLE NOT NULL DEFAULT 0.00,
    MODIFY `verbruik_excl_nacht` DOUBLE NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `factuur_lijnen` MODIFY `hoeveelheid` DOUBLE NOT NULL,
    MODIFY `eenheidsprijs` DOUBLE NOT NULL,
    MODIFY `bedrag_excl_btw` DOUBLE NOT NULL,
    MODIFY `btw_percentage` DOUBLE NOT NULL DEFAULT 6.00,
    MODIFY `bedrag_incl_btw` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `investeringen` MODIFY `bruto_kostprijs` DOUBLE NOT NULL,
    MODIFY `subsidies_ontvangen` DOUBLE NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `kostencategorie_tarieven` MODIFY `prijs_excl_btw` DOUBLE NOT NULL,
    MODIFY `btw_percentage` DOUBLE NOT NULL DEFAULT 6.00,
    MODIFY `min_drempel_waarde` DOUBLE NULL;

-- AlterTable
ALTER TABLE `maandpieken` MODIFY `hoogste_kwartierpiek_kw` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `minuut_metingen` DROP PRIMARY KEY,
    MODIFY `timestamp` DATETIME NOT NULL,
    MODIFY `afname_kw` DOUBLE NOT NULL DEFAULT 0.000,
    MODIFY `injectie_kw` DOUBLE NOT NULL DEFAULT 0.000,
    MODIFY `zonne_productie_kw` DOUBLE NOT NULL DEFAULT 0.000,
    MODIFY `verbruik_kwh` DOUBLE NOT NULL DEFAULT 0.000000,
    MODIFY `kwartier_timestamp` DATETIME NOT NULL,
    ADD PRIMARY KEY (`timestamp`);

-- AlterTable
ALTER TABLE `simulatie_profielen` MODIFY `capaciteit_kwh` DOUBLE NOT NULL,
    MODIFY `omvormer_vermogen_kw` DOUBLE NOT NULL,
    MODIFY `laad_efficientie_pct` DOUBLE NOT NULL DEFAULT 95.00,
    MODIFY `ontlaad_efficientie_pct` DOUBLE NOT NULL DEFAULT 95.00,
    MODIFY `min_soc_pct` DOUBLE NOT NULL DEFAULT 10.00,
    MODIFY `max_soc_pct` DOUBLE NOT NULL DEFAULT 90.00;

-- AlterTable
ALTER TABLE `simulatie_resultaten` MODIFY `nieuwe_afname_kwh` DOUBLE NOT NULL,
    MODIFY `nieuwe_injectie_kwh` DOUBLE NOT NULL,
    MODIFY `zelfconsumptie_pct` DOUBLE NOT NULL,
    MODIFY `autarkie_pct` DOUBLE NOT NULL,
    MODIFY `nieuwe_gemiddelde_maandpiek_kw` DOUBLE NOT NULL,
    MODIFY `geschatte_besparing_eur` DOUBLE NOT NULL,
    MODIFY `berekend_op` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
