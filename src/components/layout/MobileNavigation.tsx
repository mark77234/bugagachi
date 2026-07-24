"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bookmark, Users, User, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/recommendations", label: "추천", icon: ListChecks },
  { href: "/community", label: "커뮤니티", icon: Users },
  { href: "/mypage", label: "저장", icon: Bookmark },
  { href: "/mypage", label: "마이", icon: User },
];

/** 결과·앱 화면용 하단 내비게이션(모바일). 설문 flow에서는 렌더하지 않는다. */
export function MobileNavigation() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden"
      aria-label="하단 내비게이션"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {ITEMS.map((it) => {
          const active = pathname === it.href;
          const Icon = it.icon;
          return (
            <li key={it.label} className="flex-1">
              <Link
                href={it.href}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium",
                  active ? "text-primary" : "text-muted",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
