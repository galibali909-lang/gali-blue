-- CreateTable
CREATE TABLE `Settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `onlineEnabled` BOOLEAN NOT NULL DEFAULT false,
    `discountEnabled` BOOLEAN NOT NULL DEFAULT false,
    `discountPercent` INTEGER NOT NULL DEFAULT 0,
    `onlineAmount` INTEGER NOT NULL DEFAULT 0,
    `maxGuests` INTEGER NOT NULL DEFAULT 12,
    `durationMinutes` INTEGER NOT NULL DEFAULT 120,
    `cleanupMinutes` INTEGER NOT NULL DEFAULT 15,
    `holdMinutes` INTEGER NOT NULL DEFAULT 15,
    `graceMinutes` INTEGER NOT NULL DEFAULT 30,
    `serviceTimes` JSON NOT NULL,
    `closedDates` JSON NOT NULL,
    `content` JSON NOT NULL,
    `draftContent` JSON NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiningTable` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `area` VARCHAR(191) NOT NULL,
    `seats` INTEGER NOT NULL,
    `joinGroup` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DiningTable_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reservation` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `requestKey` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `guests` INTEGER NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `holdUntil` DATETIME(3) NULL,
    `status` ENUM('CALL_PENDING', 'PAYMENT_PENDING', 'PROVISIONAL', 'RESERVED', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'NO_SHOW') NOT NULL DEFAULT 'CALL_PENDING',
    `method` ENUM('ON_SITE', 'ONLINE') NOT NULL,
    `paymentStatus` ENUM('ON_SITE_DUE', 'PENDING', 'FAILED', 'PAID', 'REFUND_PENDING', 'REFUNDED') NOT NULL DEFAULT 'ON_SITE_DUE',
    `callStatus` ENUM('TO_CALL', 'NO_ANSWER', 'CONFIRMED', 'CANCEL_REQUESTED') NOT NULL DEFAULT 'TO_CALL',
    `amount` INTEGER NOT NULL DEFAULT 0,
    `discountPercent` INTEGER NOT NULL DEFAULT 0,
    `discountAmount` INTEGER NOT NULL DEFAULT 0,
    `paidAmount` INTEGER NOT NULL DEFAULT 0,
    `note` TEXT NULL,
    `assignedStaffId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Reservation_reference_key`(`reference`),
    UNIQUE INDEX `Reservation_requestKey_key`(`requestKey`),
    INDEX `Reservation_startsAt_endsAt_status_idx`(`startsAt`, `endsAt`, `status`),
    INDEX `Reservation_status_holdUntil_idx`(`status`, `holdUntil`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `reservationId` VARCHAR(191) NOT NULL,
    `providerRef` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Payment_providerRef_key`(`providerRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Staff` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `job` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'HOST', 'SERVICE', 'CASHIER', 'EDITOR') NOT NULL DEFAULT 'SERVICE',
    `passwordHash` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `shift` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sessionVersion` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Staff_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MenuItem` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `image` VARCHAR(191) NULL,
    `allergens` VARCHAR(191) NULL,
    `available` BOOLEAN NOT NULL DEFAULT true,
    `position` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `image` VARCHAR(191) NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Media` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `gallery` BOOLEAN NOT NULL DEFAULT false,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Audit` (
    `id` VARCHAR(191) NOT NULL,
    `actor` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `detail` TEXT NOT NULL,
    `reservationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Audit_reservationId_createdAt_idx`(`reservationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateLimit` (
    `key` VARCHAR(191) NOT NULL,
    `hits` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DiningTableToReservation` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DiningTableToReservation_AB_unique`(`A`, `B`),
    INDEX `_DiningTableToReservation_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_assignedStaffId_fkey` FOREIGN KEY (`assignedStaffId`) REFERENCES `Staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `Reservation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Audit` ADD CONSTRAINT `Audit_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `Reservation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DiningTableToReservation` ADD CONSTRAINT `_DiningTableToReservation_A_fkey` FOREIGN KEY (`A`) REFERENCES `DiningTable`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DiningTableToReservation` ADD CONSTRAINT `_DiningTableToReservation_B_fkey` FOREIGN KEY (`B`) REFERENCES `Reservation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
