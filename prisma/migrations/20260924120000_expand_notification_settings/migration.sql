ALTER TABLE "User"
ALTER COLUMN "notificationSettings"
SET DEFAULT '{"emailOnInvite": true, "emailOnDeadline": true, "emailOnProjectChange": false, "emailOnComment": true, "projectScope": "all"}';
