UPDATE `activities`
SET
  `start_date` = CASE
    WHEN typeof(`start_date`) = 'integer' THEN `start_date`
    WHEN length(trim(CAST(`start_date` AS text))) > 0
      AND (
        trim(CAST(`start_date` AS text)) GLOB '-[0-9]*'
        OR trim(CAST(`start_date` AS text)) GLOB '[0-9]*'
      ) THEN
      CASE
        WHEN length(trim(CAST(`start_date` AS text))) <= 10
          THEN CAST(trim(CAST(`start_date` AS text)) AS integer) * 1000
        ELSE CAST(trim(CAST(`start_date` AS text)) AS integer)
      END
    WHEN unixepoch(CAST(`start_date` AS text)) IS NOT NULL
      THEN CAST(unixepoch(CAST(`start_date` AS text)) * 1000 AS integer)
    WHEN typeof(`created_at`) = 'integer' THEN `created_at`
    ELSE cast(unixepoch('subsecond') * 1000 as integer)
  END,
  `end_date` = CASE
    WHEN typeof(`end_date`) = 'integer' THEN `end_date`
    WHEN length(trim(CAST(`end_date` AS text))) > 0
      AND (
        trim(CAST(`end_date` AS text)) GLOB '-[0-9]*'
        OR trim(CAST(`end_date` AS text)) GLOB '[0-9]*'
      ) THEN
      CASE
        WHEN length(trim(CAST(`end_date` AS text))) <= 10
          THEN CAST(trim(CAST(`end_date` AS text)) AS integer) * 1000
        ELSE CAST(trim(CAST(`end_date` AS text)) AS integer)
      END
    WHEN unixepoch(CAST(`end_date` AS text)) IS NOT NULL
      THEN CAST(unixepoch(CAST(`end_date` AS text)) * 1000 AS integer)
    WHEN typeof(`created_at`) = 'integer' THEN `created_at`
    ELSE cast(unixepoch('subsecond') * 1000 as integer)
  END
WHERE typeof(`start_date`) != 'integer'
  OR typeof(`end_date`) != 'integer';--> statement-breakpoint

UPDATE `activities`
SET `end_date` = `start_date`
WHERE typeof(`start_date`) = 'integer'
  AND typeof(`end_date`) = 'integer'
  AND `end_date` < `start_date`;--> statement-breakpoint
