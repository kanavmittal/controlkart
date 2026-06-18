import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260609223504 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "content_post" drop constraint if exists "content_post_slug_unique";`);
    this.addSql(`create table if not exists "content_post" ("id" text not null, "type" text check ("type" in ('news', 'case_study', 'guide', 'application_note')) not null default 'news', "title" text not null, "slug" text not null, "excerpt" text null, "body" text not null, "cover_image" text null, "seo_title" text null, "seo_description" text null, "related_product_ids" text null, "published_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_post_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_content_post_slug_unique" ON "content_post" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_post_deleted_at" ON "content_post" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "content_post" cascade;`);
  }

}
