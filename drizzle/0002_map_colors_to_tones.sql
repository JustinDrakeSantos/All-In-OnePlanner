-- Colors used to be stored as hex values from a rainbow palette. They are now
-- tone names (glacier, navy, lemon, slate) whose colors adapt to light and dark
-- mode. Map the old values to the nearest tone; anything unknown becomes glacier.
UPDATE `events` SET `color` = CASE upper(`color`)
  WHEN '#2563EB' THEN 'glacier'
  WHEN '#5C7FA3' THEN 'slate'
  WHEN '#7C3AED' THEN 'navy'
  WHEN '#EA580C' THEN 'lemon'
  WHEN '#E11D48' THEN 'lemon'
  WHEN '#16A34A' THEN 'slate'
  ELSE 'glacier'
END
WHERE `color` NOT IN ('glacier', 'navy', 'lemon', 'slate');--> statement-breakpoint
UPDATE `task_lists` SET `color` = CASE upper(`color`)
  WHEN '#2563EB' THEN 'glacier'
  WHEN '#5C7FA3' THEN 'glacier'
  WHEN '#7C3AED' THEN 'lemon'
  WHEN '#EA580C' THEN 'navy'
  WHEN '#E11D48' THEN 'lemon'
  WHEN '#16A34A' THEN 'slate'
  ELSE 'glacier'
END
WHERE `color` NOT IN ('glacier', 'navy', 'lemon', 'slate');--> statement-breakpoint
UPDATE `habits` SET `color` = CASE upper(`color`)
  WHEN '#16A34A' THEN 'glacier'
  WHEN '#2563EB' THEN 'navy'
  WHEN '#7C3AED' THEN 'slate'
  WHEN '#EA580C' THEN 'lemon'
  WHEN '#E11D48' THEN 'lemon'
  ELSE 'glacier'
END
WHERE `color` NOT IN ('glacier', 'navy', 'lemon', 'slate');
