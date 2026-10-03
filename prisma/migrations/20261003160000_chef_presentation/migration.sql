UPDATE `Settings` SET `content` = JSON_SET(`content`, '$.storyEyebrow', 'LA CHEFFE')
WHERE JSON_UNQUOTE(JSON_EXTRACT(`content`, '$.storyEyebrow')) = 'UN LIEU, MILLE INSTANTS';
UPDATE `Settings` SET `content` = JSON_SET(`content`, '$.storyTitle', CONCAT('Une cuisine de coeur.', CHAR(10), 'Une signature singuliere.'))
WHERE JSON_UNQUOTE(JSON_EXTRACT(`content`, '$.storyTitle')) = CONCAT('On vient pour la cuisine.', CHAR(10), 'On reste pour l''instant.');
UPDATE `Settings` SET `content` = JSON_SET(`content`, '$.storyText', 'Derriere chaque assiette, notre cheffe imagine une cuisine genereuse, attentive aux produits et au plaisir de partager. Des premieres inspirations a la derniere touche, elle donne a la table GALI BLUE son caractere et sa sensibilite.')
WHERE JSON_UNQUOTE(JSON_EXTRACT(`content`, '$.storyText')) = 'Une table que l''on partage, des saveurs qui voyagent, un dernier verre qui se prolonge. GALI BLUE imagine des moments simples et des soirees qui comptent, au rythme de Casablanca.';
UPDATE `Settings` SET `content` = JSON_SET(`content`, '$.eventTitle', CONCAT('L''heure', CHAR(10), 'bleue.'))
WHERE JSON_UNQUOTE(JSON_EXTRACT(`content`, '$.eventTitle')) = 'La nuit a son adresse.';

UPDATE `Settings` SET `draftContent` = JSON_SET(`draftContent`, '$.storyEyebrow', 'LA CHEFFE')
WHERE JSON_UNQUOTE(JSON_EXTRACT(`draftContent`, '$.storyEyebrow')) = 'UN LIEU, MILLE INSTANTS';
UPDATE `Settings` SET `draftContent` = JSON_SET(`draftContent`, '$.storyTitle', CONCAT('Une cuisine de coeur.', CHAR(10), 'Une signature singuliere.'))
WHERE JSON_UNQUOTE(JSON_EXTRACT(`draftContent`, '$.storyTitle')) = CONCAT('On vient pour la cuisine.', CHAR(10), 'On reste pour l''instant.');
UPDATE `Settings` SET `draftContent` = JSON_SET(`draftContent`, '$.storyText', 'Derriere chaque assiette, notre cheffe imagine une cuisine genereuse, attentive aux produits et au plaisir de partager. Des premieres inspirations a la derniere touche, elle donne a la table GALI BLUE son caractere et sa sensibilite.')
WHERE JSON_UNQUOTE(JSON_EXTRACT(`draftContent`, '$.storyText')) = 'Une table que l''on partage, des saveurs qui voyagent, un dernier verre qui se prolonge. GALI BLUE imagine des moments simples et des soirees qui comptent, au rythme de Casablanca.';
UPDATE `Settings` SET `draftContent` = JSON_SET(`draftContent`, '$.eventTitle', CONCAT('L''heure', CHAR(10), 'bleue.'))
WHERE JSON_UNQUOTE(JSON_EXTRACT(`draftContent`, '$.eventTitle')) = 'La nuit a son adresse.';