CREATE TABLE "licitaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"abogado_id" uuid NOT NULL,
	"secop_id" text,
	"entidad_contratante" text,
	"nombre" text NOT NULL,
	"estado" text DEFAULT 'activa' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "licitacion_fases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"licitacion_id" uuid NOT NULL,
	"tipo_fase" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"fecha" timestamp,
	"documentos_path" text[],
	"texto_extraido" text,
	"analisis_claude" jsonb,
	"resumen_ejecutivo" text,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "pliegos" ADD COLUMN "licitacion_id" uuid;--> statement-breakpoint
ALTER TABLE "pliegos" ADD COLUMN "fase_id" uuid;--> statement-breakpoint
ALTER TABLE "licitaciones" ADD CONSTRAINT "licitaciones_abogado_id_abogados_id_fk" FOREIGN KEY ("abogado_id") REFERENCES "public"."abogados"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licitacion_fases" ADD CONSTRAINT "licitacion_fases_licitacion_id_licitaciones_id_fk" FOREIGN KEY ("licitacion_id") REFERENCES "public"."licitaciones"("id") ON DELETE cascade ON UPDATE no action;