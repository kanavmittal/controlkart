import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260712061957 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "agent_heartbeat" ("id" text not null, "agent_id" text not null, "last_seen" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "agent_heartbeat_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agent_heartbeat_agent_id" ON "agent_heartbeat" ("agent_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_agent_heartbeat_deleted_at" ON "agent_heartbeat" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "agent_heartbeat" cascade;`);
  }

}
