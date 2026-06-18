import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260609223502 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_document" ("id" text not null, "product_id" text not null, "title" text not null, "type" text check ("type" in ('datasheet', 'manual', 'cad', 'certificate', 'other')) not null default 'datasheet', "file_url" text not null, "file_size" integer null, "display_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_document_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_document_product_id" ON "product_document" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_document_deleted_at" ON "product_document" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_document" cascade;`);
  }

}
