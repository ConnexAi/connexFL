ALTER TABLE "comparaciones" ADD COLUMN "estado_anexos" text DEFAULT 'pendiente';--> statement-breakpoint
ALTER TABLE "comparaciones" ADD COLUMN "anexos_generados" jsonb;