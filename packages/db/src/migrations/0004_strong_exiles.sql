ALTER TABLE "comparaciones" ADD COLUMN "ronda" text DEFAULT 'definitivo';--> statement-breakpoint
ALTER TABLE "comparaciones" ADD COLUMN "seleccionada" boolean DEFAULT false;