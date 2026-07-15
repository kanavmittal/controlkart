import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260711230231 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "pack_record" ("id" text not null, "shipment_id" text not null, "photo_file_id" text not null, "photo_url" text not null, "packed_by" text not null, "packed_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pack_record_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pack_record_shipment_id" ON "pack_record" ("shipment_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pack_record_deleted_at" ON "pack_record" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "print_job" ("id" text not null, "shipment_id" text null, "label_url" text not null, "status" text check ("status" in ('pending', 'released', 'printing', 'done', 'failed')) not null default 'pending', "attempts" integer not null default 0, "released_at" timestamptz null, "printed_at" timestamptz null, "error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "print_job_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_print_job_deleted_at" ON "print_job" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "purchase_order" ("id" text not null, "display_id" integer not null, "supplier_id" text not null, "status" text check ("status" in ('draft', 'open', 'partially_received', 'received', 'cancelled')) not null default 'draft', "expected_date" timestamptz null, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "purchase_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_supplier_id" ON "purchase_order" ("supplier_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_deleted_at" ON "purchase_order" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "purchase_order_line" ("id" text not null, "purchase_order_id" text not null, "variant_id" text not null, "sku" text not null, "title" text not null, "quantity_ordered" integer not null, "quantity_received" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "purchase_order_line_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_line_purchase_order_id" ON "purchase_order_line" ("purchase_order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_line_variant_id" ON "purchase_order_line" ("variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_line_deleted_at" ON "purchase_order_line" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "serial_unit" ("id" text not null, "variant_id" text not null, "serial" text not null, "status" text check ("status" in ('in_stock', 'shipped', 'removed')) not null default 'in_stock', "purchase_order_id" text null, "order_id" text null, "received_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "serial_unit_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_serial_unit_deleted_at" ON "serial_unit" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_serial_unit_variant_id_serial" ON "serial_unit" ("variant_id", "serial") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "shift_config" ("id" text not null, "weekday" integer not null, "start_time" text not null, "end_time" text not null, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shift_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shift_config_deleted_at" ON "shift_config" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "shipment" ("id" text not null, "order_id" text not null, "shiprocket_order_id" text null, "awb" text null, "label_url" text null, "status" text check ("status" in ('pending', 'label_ready', 'picked', 'packed', 'fulfilled', 'cancelled')) not null default 'pending', "courier" text null, "tracking_status" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipment_order_id" ON "shipment" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipment_awb" ON "shipment" ("awb") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipment_deleted_at" ON "shipment" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "staff" ("id" text not null, "name" text not null, "email" text not null, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "staff_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_staff_email" ON "staff" ("email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_staff_deleted_at" ON "staff" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "supplier" ("id" text not null, "name" text not null, "barcode_template" text not null, "delimiter" text null, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_deleted_at" ON "supplier" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "purchase_order_line" add constraint "purchase_order_line_purchase_order_id_foreign" foreign key ("purchase_order_id") references "purchase_order" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "purchase_order_line" drop constraint if exists "purchase_order_line_purchase_order_id_foreign";`);

    this.addSql(`drop table if exists "pack_record" cascade;`);

    this.addSql(`drop table if exists "print_job" cascade;`);

    this.addSql(`drop table if exists "purchase_order" cascade;`);

    this.addSql(`drop table if exists "purchase_order_line" cascade;`);

    this.addSql(`drop table if exists "serial_unit" cascade;`);

    this.addSql(`drop table if exists "shift_config" cascade;`);

    this.addSql(`drop table if exists "shipment" cascade;`);

    this.addSql(`drop table if exists "staff" cascade;`);

    this.addSql(`drop table if exists "supplier" cascade;`);
  }

}
