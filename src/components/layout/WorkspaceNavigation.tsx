"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Map, UsersRound, UserRound, WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/map", label: "지도", icon: Map },
  { href: "/recommendations", label: "상세추천", icon: WandSparkles },
  { href: "/community", label: "커뮤니티", icon: UsersRound },
  { href: "/mypage", label: "마이", icon: UserRound },
];

export function WorkspaceNavigation() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[82px] border-r border-border bg-surface md:flex md:flex-col md:items-center">
      <Link
        href="/"
        aria-label="부가가치 홈"
        className="mt-4 flex h-11 w-11 items-center justify-center overflow-hidden rounded-[var(--radius-input)] bg-surface shadow-[var(--shadow-card)]"
      >
        <Image
          src="/assets/logo/ic_logo.png"
          alt=""
          width={185}
          height={229}
          className="h-10 w-auto object-contain"
          aria-hidden
        />
      </Link>
      <nav className="mt-6 flex w-full flex-1 flex-col items-center gap-2" aria-label="추천 탐색 메뉴">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[60px] w-[64px] flex-col items-center justify-center gap-1 rounded-[var(--radius-input)] text-[11px] font-semibold transition-colors",
                active ? "bg-primary-subtle text-primary" : "text-muted hover:bg-surface-muted hover:text-fg",
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
