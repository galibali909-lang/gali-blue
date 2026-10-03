UPDATE `Settings` SET `content` = JSON_SET(`content`, '$.chefName', 'Salma Benali')
WHERE JSON_EXTRACT(`content`, '$.chefName') IS NULL;
UPDATE `Settings` SET `content` = JSON_SET(`content`, '$.storyImage', '/images/chef-demo.jpg')
WHERE JSON_UNQUOTE(JSON_EXTRACT(`content`, '$.storyImage')) = '/images/interior.jpg';
UPDATE `Settings` SET `content` = JSON_SET(`content`, '$.storySignature', 'J''aime les assiettes qui donnent envie de se retrouver. Un beau produit, un geste juste et le plaisir de vous recevoir : c''est ainsi que j''imagine ma cuisine.')
WHERE JSON_EXTRACT(`content`, '$.storySignature') IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(`content`, '$.storySignature')) = 'Le plaisir de recevoir, jusque dans l''assiette.';
UPDATE `Settings` SET `content` = JSON_SET(`content`, '$.storyCaption', 'Photo d''illustration')
WHERE JSON_EXTRACT(`content`, '$.storyCaption') IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(`content`, '$.storyCaption')) = 'LE GESTE. LE GOUT. LE PARTAGE.';

UPDATE `Settings` SET `draftContent` = JSON_SET(`draftContent`, '$.chefName', 'Salma Benali')
WHERE JSON_TYPE(`draftContent`) = 'OBJECT' AND JSON_EXTRACT(`draftContent`, '$.chefName') IS NULL;
UPDATE `Settings` SET `draftContent` = JSON_SET(`draftContent`, '$.storyImage', '/images/chef-demo.jpg')
WHERE JSON_UNQUOTE(JSON_EXTRACT(`draftContent`, '$.storyImage')) = '/images/interior.jpg';
UPDATE `Settings` SET `draftContent` = JSON_SET(`draftContent`, '$.storySignature', 'J''aime les assiettes qui donnent envie de se retrouver. Un beau produit, un geste juste et le plaisir de vous recevoir : c''est ainsi que j''imagine ma cuisine.')
WHERE JSON_TYPE(`draftContent`) = 'OBJECT' AND (JSON_EXTRACT(`draftContent`, '$.storySignature') IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(`draftContent`, '$.storySignature')) = 'Le plaisir de recevoir, jusque dans l''assiette.');
UPDATE `Settings` SET `draftContent` = JSON_SET(`draftContent`, '$.storyCaption', 'Photo d''illustration')
WHERE JSON_TYPE(`draftContent`) = 'OBJECT' AND (JSON_EXTRACT(`draftContent`, '$.storyCaption') IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(`draftContent`, '$.storyCaption')) = 'LE GESTE. LE GOUT. LE PARTAGE.');