ALTER TABLE "pliegos" ADD COLUMN "analisis" jsonb;--> statement-breakpoint
ALTER TABLE "pliegos" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "comparaciones" ADD COLUMN "justificacion" text;--> statement-breakpoint
ALTER TABLE "comparaciones" ADD COLUMN "fortalezas_relevantes" jsonb;--> statement-breakpoint
ALTER TABLE "comparaciones" ADD COLUMN "riesgos" jsonb;--> statement-breakpoint
ALTER TABLE "comparaciones" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "pliegos" DROP COLUMN "embedding";