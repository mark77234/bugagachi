"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Home, Map, User, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon; activePrefixes?: string[] }[] = [
  { href: "/", label: "홈", icon: Home },
  {
    href: "/eligibility",
    label: "추천",
    icon: ListChecks,
    activePrefixes: ["/eligibility", "/preferences", "/recommendations", "/housing"],
  },
  { href: "/chat", label: "AI 갈붕이", icon: Bot },
  { href: "/map", label: "갈붕지도", icon: Map },
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
      <ul className="mx-auto flex max-w-lg items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map((it) => {
          const active = it.activePrefixes
            ? it.activePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
            : pathname === it.href || (it.href !== "/" && pathname.startsWith(`${it.href}/`));
          const Icon = it.icon;
          return (
            <li key={it.label} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium",
                  active
                    ? "font-bold text-primary before:absolute before:top-0 before:h-0.5 before:w-8 before:rounded-full before:bg-primary"
                    : "text-muted",
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
