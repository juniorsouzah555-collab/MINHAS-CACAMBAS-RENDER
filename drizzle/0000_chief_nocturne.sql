CREATE TABLE "bota_foras" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"cnpj" text NOT NULL,
	"telefone" text NOT NULL,
	"endereco" text NOT NULL,
	"valor_padrao_descarte" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dispatches" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"driver_name" text NOT NULL,
	"client_name" text NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"payload_type" text NOT NULL,
	"weight" real NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fuel_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"quantidade_litros" real NOT NULL,
	"km_inicial" integer,
	"km_final" integer,
	"valor_pago" real NOT NULL,
	"data" text NOT NULL,
	"driver" text,
	"media_km_l" real,
	"tipo" text,
	"is_retirada_diversa" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"client_name" text NOT NULL,
	"entity_code" text NOT NULL,
	"service_desc" text NOT NULL,
	"issue_date" text NOT NULL,
	"due_date" text NOT NULL,
	"amount" real NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lancamentos" (
	"id" text PRIMARY KEY NOT NULL,
	"bota_fora_id" text NOT NULL,
	"bota_fora_nome" text NOT NULL,
	"quantidade_cacambas" integer NOT NULL,
	"valor" real NOT NULL,
	"data" text NOT NULL,
	"driver_name" text,
	"vehicle_id" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"time_ago" text NOT NULL,
	"severity" text NOT NULL,
	"type" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'Operador de Frota',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"efficiency" real NOT NULL,
	"fuel_used" real NOT NULL,
	"cost_per_km" real NOT NULL,
	"driver" text NOT NULL,
	"trend" text,
	"last_maintenance_date" text,
	"speed" integer,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"type" text,
	"initial_km" integer
);
