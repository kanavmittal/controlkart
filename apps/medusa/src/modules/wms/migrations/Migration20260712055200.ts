import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260712055200 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "stock_take_session" ("id" text not null, "session_id" text not null, "staff_id" text not null, "serial_count" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_take_session_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_take_session_deleted_at" ON "stock_take_session" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stock_take_session_session_id" ON "stock_take_session" ("session_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stock_take_session" cascade;`);
  }

}
