-- Ajout du champ restrictedWrite sur conversation_members
-- Permet à l'admin/région de restreindre l'écriture d'un membre spécifique
ALTER TABLE "conversation_members" ADD COLUMN "restrictedWrite" BOOLEAN NOT NULL DEFAULT false;
