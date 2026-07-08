import Link from "next/link";
import { cn } from "@/lib/utils";
import { announcement } from "@/config/site";

// Grey top bar: rotating-style message on the left, info links + (desktop
// only) socials on the right. Ported from clone `AnnouncementBar.tsx`;
// static data now comes from `config/site.ts`'s `announcement` export.
//
// The clone also renders a row of social icons here, hardcoded in the
// component (Facebook/Instagram/LinkedIn/X/YouTube), not sourced from its
// `announcement` data object. Our `AnnouncementConfig` (config/types.ts)
// only has `message` and `links` — no socials field — so per the T7 brief
// ("omit fields the clone renders that don't exist in config") the social
// icon row is omitted here. Socials already live in `footer.socials` (T13).
export function AnnouncementBar() {
  return (
    <div className={cn("w-full bg-athens-band")}>
      <div className="athens-container flex items-center justify-between py-[13px] text-[13px] leading-[20.8px] text-athens-body">
        <p>{announcement.message}</p>
        <ul className="hidden items-center gap-[24px] min-[990px]:flex">
          {announcement.links.map((link) => (
            <li key={link.label}>
              <Link href={link.href} className="hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
