-- districtId et parishId rendus nullables dans camp_participants
-- pour permettre aux sentinelles et membres de région de participer aux camps
-- sans être obligatoirement rattachés à une paroisse
ALTER TABLE "camp_participants" ALTER COLUMN "districtId" DROP NOT NULL;
ALTER TABLE "camp_participants" ALTER COLUMN "parishId" DROP NOT NULL;
