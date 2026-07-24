"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/recommendations", label: "주택 추천" },
  { href: "/recommendations?status=open", label: "모집공고" },
  { href: "/community", label: "커뮤니티" },
  { href: "/mypage", label: "저장한 주택" },
  { href: "/mypage", label: "마이페이지" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-white">
        <Home className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="text-lg font-extrabold tracking-tight text-navy">부가가치</span>
    </Link>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="주요 메뉴">
          {NAV.slice(0, 3).map((n) => {
            const active = pathname === n.href.split("?")[0];
            return (
              <Link
                key={n.label}
                href={n.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-muted",
                  active ? "text-primary" : "text-fg",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/mypage" className="rounded-md px-3 py-2 text-sm font-medium text-fg hover:bg-surface-muted">
            마이페이지
          </Link>
          <Button variant="outline" size="sm" aria-label="로그인 (준비 중)">
            로그인
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-fg hover:bg-surface-muted md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-surface md:hidden" aria-label="모바일 메뉴">
          <ul className="px-4 py-2">
            {NAV.map((n) => (
              <li key={n.label}>
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-3 text-base font-medium text-fg hover:bg-surface-muted"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
