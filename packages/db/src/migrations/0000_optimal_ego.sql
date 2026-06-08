CREATE TABLE "abogados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nombre" text NOT NULL,
	"plan" text DEFAULT 'free',
	"tokens_usados" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "abogados_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"abogado_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"nit" text NOT NULL,
	"sector" text,
	"contexto_raw" text,
	"contexto_procesado" jsonb,
	"embedding" vector(1536),
	"archivos_path" text[],
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pliegos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"abogado_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"secop_id" text,
	"texto_extraido" text,
	"resumen" jsonb,
	"embedding" vector(1536),
	"archivos_path" text[],
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pliego_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"score" real,
	"resultado" jsonb,
	"anexos" jsonb[],
	"drive_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_abogado_id_abogados_id_fk" FOREIGN KEY ("abogado_id") REFERENCES "public"."abogados"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pliegos" ADD CONSTRAINT "pliegos_abogado_id_abogados_id_fk" FOREIGN KEY ("abogado_id") REFERENCES "public"."abogados"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparaciones" ADD CONSTRAINT "comparaciones_pliego_id_pliegos_id_fk" FOREIGN KEY ("pliego_id") REFERENCES "public"."pliegos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparaciones" ADD CONSTRAINT "comparaciones_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;