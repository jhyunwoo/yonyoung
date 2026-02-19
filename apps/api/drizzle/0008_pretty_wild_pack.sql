ALTER TABLE `user` ADD `latest_generation_sort_order` integer;
UPDATE `user`
SET `latest_generation_sort_order` = (
  SELECT MAX(`sort_order`)
  FROM `generations`
  WHERE `deleted_at` IS NULL
);

DROP TRIGGER IF EXISTS `user_fill_latest_generation_sort_order_on_insert`;
CREATE TRIGGER `user_fill_latest_generation_sort_order_on_insert`
AFTER INSERT ON `user`
BEGIN
  UPDATE `user`
  SET `latest_generation_sort_order` = (
    SELECT MAX(`sort_order`)
    FROM `generations`
    WHERE `deleted_at` IS NULL
  )
  WHERE `id` = NEW.`id`;
END;

DROP TRIGGER IF EXISTS `user_refresh_latest_generation_sort_order_on_generation_insert`;
CREATE TRIGGER `user_refresh_latest_generation_sort_order_on_generation_insert`
AFTER INSERT ON `generations`
BEGIN
  UPDATE `user`
  SET `latest_generation_sort_order` = (
    SELECT MAX(`sort_order`)
    FROM `generations`
    WHERE `deleted_at` IS NULL
  )
  WHERE `deleted_at` IS NULL;
END;

DROP TRIGGER IF EXISTS `user_refresh_latest_generation_sort_order_on_generation_update`;
CREATE TRIGGER `user_refresh_latest_generation_sort_order_on_generation_update`
AFTER UPDATE OF `sort_order`, `deleted_at` ON `generations`
BEGIN
  UPDATE `user`
  SET `latest_generation_sort_order` = (
    SELECT MAX(`sort_order`)
    FROM `generations`
    WHERE `deleted_at` IS NULL
  )
  WHERE `deleted_at` IS NULL;
END;

DROP TRIGGER IF EXISTS `user_refresh_latest_generation_sort_order_on_generation_delete`;
CREATE TRIGGER `user_refresh_latest_generation_sort_order_on_generation_delete`
AFTER DELETE ON `generations`
BEGIN
  UPDATE `user`
  SET `latest_generation_sort_order` = (
    SELECT MAX(`sort_order`)
    FROM `generations`
    WHERE `deleted_at` IS NULL
  )
  WHERE `deleted_at` IS NULL;
END;
