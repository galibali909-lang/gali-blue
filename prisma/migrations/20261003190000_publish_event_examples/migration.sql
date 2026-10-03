UPDATE `Event`
SET `published` = true,
    `position` = CASE `id`
      WHEN 'draft-oussamabk-01' THEN 0
      WHEN 'draft-oussamabk-02' THEN 1
      ELSE 2 END,
    `title` = CASE `id`
      WHEN 'draft-oussamabk-01' THEN 'Soiree live (exemple)'
      WHEN 'draft-oussamabk-02' THEN 'Concert (exemple)'
      ELSE 'Session musicale (exemple)' END,
    `description` = 'Evenement de demonstration : photo, date et horaire d''illustration. Cet exemple ne constitue pas une annonce de programmation reelle.'
WHERE `id` IN ('draft-oussamabk-01', 'draft-oussamabk-02', 'draft-oussamabk-03');

UPDATE `Event` SET `position` = 3 WHERE `id` = 'demo-blue-sessions';