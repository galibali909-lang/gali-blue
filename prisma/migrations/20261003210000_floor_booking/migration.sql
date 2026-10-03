ALTER TABLE `Settings`
  ADD COLUMN `classicBookingEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `floorBookingEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `floorPlanImage` VARCHAR(191) NOT NULL DEFAULT '/images/floor-plan-demo.jpg';
ALTER TABLE `DiningTable` ADD COLUMN `planX` DOUBLE NULL, ADD COLUMN `planY` DOUBLE NULL;
ALTER TABLE `Reservation` ADD COLUMN `requestedTableId` VARCHAR(191) NULL;
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_requestedTableId_fkey` FOREIGN KEY (`requestedTableId`) REFERENCES `DiningTable`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
UPDATE `DiningTable` SET `planX` = 21.8, `planY` = 19.4 WHERE `name` = 'T01';
UPDATE `DiningTable` SET `planX` = 31.3, `planY` = 19.4 WHERE `name` = 'T02';
UPDATE `DiningTable` SET `planX` = 23.7, `planY` = 43.4 WHERE `name` = 'T03';
UPDATE `DiningTable` SET `planX` = 34, `planY` = 43.4 WHERE `name` = 'T04';
UPDATE `DiningTable` SET `planX` = 84, `planY` = 39.5 WHERE `name` = 'T05';
UPDATE `DiningTable` SET `planX` = 92.5, `planY` = 39.5 WHERE `name` = 'T06';
UPDATE `DiningTable` SET `planX` = 53.8, `planY` = 34.4 WHERE `name` = 'T07';
UPDATE `DiningTable` SET `planX` = 29.4, `planY` = 31 WHERE `name` = 'T08';