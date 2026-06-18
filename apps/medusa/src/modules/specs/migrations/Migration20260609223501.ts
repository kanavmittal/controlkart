import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260609223501 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "spec_group" drop constraint if exists "spec_group_code_unique";`);
    this.addSql(`alter table if exists "spec_attribute" drop constraint if exists "spec_attribute_code_unique";`);
    this.addSql(`create table if not exists "category_spec_template" ("id" text not null, "category_id" text not null, "attribute_code" text not null, "display_order" integer not null default 0, "is_required" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "category_spec_template_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_spec_template_category_id" ON "category_spec_template" ("category_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_category_spec_template_deleted_at" ON "category_spec_template" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "spec_attribute" ("id" text not null, "name" text not null, "code" text not null, "group_code" text not null default 'general', "unit" text null, "display_order" integer not null default 0, "is_filterable" boolean not null default false, "is_comparable" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "spec_attribute_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_spec_attribute_code_unique" ON "spec_attribute" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_spec_attribute_deleted_at" ON "spec_attribute" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "spec_group" ("id" text not null, "name" text not null, "code" text not null, "display_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "spec_group_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_spec_group_code_unique" ON "spec_group" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_spec_group_deleted_at" ON "spec_group" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "spec_value" ("id" text not null, "product_id" text not null, "variant_id" text null, "attribute_code" text not null, "value" text not null, "normalized_value" real null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "spec_value_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_spec_value_product_id" ON "spec_value" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_spec_value_deleted_at" ON "spec_value" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "category_spec_template" cascade;`);

    this.addSql(`drop table if exists "spec_attribute" cascade;`);

    this.addSql(`drop table if exists "spec_group" cascade;`);

    this.addSql(`drop table if exists "spec_value" cascade;`);
  }

}
