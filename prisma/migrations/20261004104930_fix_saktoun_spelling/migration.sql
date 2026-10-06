-- Correct transliteration of the traditional rifle: Saktoun (الصكتون)
UPDATE "Competition" SET
  "nameEn"  = replace("nameEn", 'Saktool', 'Saktoun'),
  "nameAr"  = replace("nameAr", 'الصكتول', 'الصكتون'),
  "firearm" = replace("firearm", 'Saktool', 'Saktoun');
