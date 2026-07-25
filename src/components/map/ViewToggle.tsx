"use client";

import Link from "next/link";
import { Map as MapIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** 지도 ↔ 상세 추천 전환 토글. 지도 페이지에서는 플로팅으로 사용한다. */
export function ViewToggle({ current, floating = false }: { current: "map" | "recommendations"; floating?: boolean }) {
  const items = [
    { key: "map" as const, href: "/map", label: "지도", Icon: MapIcon },
    { key: "recommendations" as const, href: "/recommendations", label: "상세 추천", Icon: Sparkles },
  ];

  return (
    <div
      role="tablist"
      aria-label="화면 전환"
      className={cn(
        "flex items-center gap-1 rounded-full border border-border p-1",
        floating ? "bg-surface/95 shadow-[var(--shadow-card)] backdrop-blur" : "bg-surface-muted/70",
      )}
    >
      {items.map(({ key, href, label, Icon }) => {
        const active = key === current;
        return active ? (
          <span
            key={key}
            role="tab"
            aria-selected
            className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm font-bold text-white"
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </span>
        ) : (
          <Link
            key={key}
            href={href}
            role="tab"
            aria-selected={false}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
