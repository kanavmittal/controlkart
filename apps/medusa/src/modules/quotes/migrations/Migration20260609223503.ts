import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260609223503 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "quote" ("id" text not null, "status" text check ("status" in ('requested', 'under_review', 'sent', 'accepted', 'rejected', 'expired', 'converted')) not null default 'requested', "customer_id" text null, "company_name" text not null, "gstin" text null, "contact_name" text not null, "email" text not null, "phone" text not null, "pincode" text not null, "expected_date" timestamptz null, "notes" text null, "admin_notes" text null, "quoted_total" numeric null, "valid_until" timestamptz null, "converted_order_id" text null, "raw_quoted_total" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "quote_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quote_customer_id" ON "quote" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quote_deleted_at" ON "quote" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "quote_item" ("id" text not null, "quote_id" text not null, "sku" text not null, "product_title" text null, "variant_id" text null, "quantity" integer not null, "quoted_unit_price" numeric null, "raw_quoted_unit_price" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "quote_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quote_item_quote_id" ON "quote_item" ("quote_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quote_item_deleted_at" ON "quote_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "quote_item" add constraint "quote_item_quote_id_foreign" foreign key ("quote_id") references "quote" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "quote_item" drop constraint if exists "quote_item_quote_id_foreign";`);

    this.addSql(`drop table if exists "quote" cascade;`);

    this.addSql(`drop table if exists "quote_item" cascade;`);
  }

}
