import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260712054312 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "purchase_order" add column if not exists "metadata" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "purchase_order" drop column if exists "metadata";`);
  }

}
