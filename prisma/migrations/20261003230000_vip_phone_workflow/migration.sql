ALTER TABLE `Settings` MODIFY `floorBookingEnabled` BOOLEAN NOT NULL DEFAULT true;
UPDATE `Settings` SET `floorBookingEnabled` = true WHERE `id` = 1;
ALTER TABLE `DiningTable` ADD COLUMN `vip` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Reservation`
  ADD COLUMN `vip` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `callAttempts` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `lastCalledAt` DATETIME(3) NULL,
  ADD COLUMN `nextCallAt` DATETIME(3) NULL;
UPDATE `DiningTable` SET `vip` = true WHERE `name` = 'T07';
UPDATE `Reservation` SET `vip` = true WHERE `requestedTableId` IN (SELECT `id` FROM `DiningTable` WHERE `vip` = true)
  OR `id` IN (SELECT `B` FROM `_DiningTableToReservation` WHERE `A` IN (SELECT `id` FROM `DiningTable` WHERE `vip` = true));
UPDATE `Reservation` SET `status` = 'RESERVED', `callStatus` = 'CONFIRMED' WHERE `status` = 'PROVISIONAL' AND `method` = 'ON_SITE';