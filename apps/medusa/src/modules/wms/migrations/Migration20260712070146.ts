import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260712070146 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "shipment" add column if not exists "pick_state" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "shipment" drop column if exists "pick_state";`);
  }

}
