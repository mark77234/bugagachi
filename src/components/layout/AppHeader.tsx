"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/eligibility", label: "맞춤 추천" },
  { href: "/chat", label: "AI 갈붕이" },
  { href: "/map", label: "전체 지도" },
  { href: "/community", label: "커뮤니티" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/eligibility") {
    return ["/eligibility", "/preferences", "/recommendations", "/housing"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">
      <Image
        src="/assets/logo/bugagachi_website_logo.png"
        alt=""
        width={40}
        height={40}
        priority
        className="h-10 w-10 shrink-0 object-contain"
        aria-hidden
      />
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
          {NAV.map((n) => {
            const active = isActivePath(pathname, n.href);
            return (
              <Link
                key={n.label}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-muted",
                  active
                    ? "bg-primary-subtle/60 font-bold text-primary after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-primary"
                    : "text-fg",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/mypage"
            aria-current={isActivePath(pathname, "/mypage") ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium hover:bg-surface-muted",
              isActivePath(pathname, "/mypage") ? "bg-primary-subtle/60 font-bold text-primary" : "text-fg",
            )}
          >
            마이페이지
          </Link>
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
            {[...NAV, { href: "/mypage", label: "마이페이지" }].map((n) => {
              const active = isActivePath(pathname, n.href);
              return (
                <li key={n.label}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-3 text-base font-medium hover:bg-surface-muted",
                      active ? "bg-primary-subtle text-primary" : "text-fg",
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
