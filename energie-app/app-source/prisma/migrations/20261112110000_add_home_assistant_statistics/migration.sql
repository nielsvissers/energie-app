CREATE TABLE `statistic_sources` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `statistic_metadata` (
    `statistic_id` VARCHAR(191) NOT NULL,
    `source_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NULL,
    `unit_of_measurement` VARCHAR(64) NULL,
    `has_mean` BOOLEAN NOT NULL DEFAULT false,
    `has_sum` BOOLEAN NOT NULL DEFAULT false,
    `last_synced_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_statistic_metadata_source` (`source_id`),
    PRIMARY KEY (`statistic_id`),
    CONSTRAINT `fk_statistic_metadata_source`
        FOREIGN KEY (`source_id`) REFERENCES `statistic_sources` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `statistic_values` (
    `statistic_id` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `state` DOUBLE NULL,
    `sum` DOUBLE NULL,
    `source` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_statistic_value_timestamp` (`timestamp`),
    UNIQUE INDEX `unique_statistic_timestamp` (`statistic_id`, `timestamp`),
    CONSTRAINT `fk_statistic_value_metadata`
        FOREIGN KEY (`statistic_id`) REFERENCES `statistic_metadata` (`statistic_id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;