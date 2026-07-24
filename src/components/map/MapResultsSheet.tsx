"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, List } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { HousingUnit } from "@/mocks/housing";
import { HousingMapListCard } from "./HousingMapListCard";

export function MapResultsSheet({
  units,
  selectedId,
  onSelect,
}: {
  units: HousingUnit[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const selected = units.find((unit) => unit.id === selectedId);

  return (
    <motion.section
      animate={{ y: expanded ? 0 : "calc(100% - 76px)" }}
      transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
      className="absolute inset-x-2 bottom-2 z-20 flex h-[64%] min-h-[260px] flex-col overflow-hidden rounded-[var(--radius-cardlg)] border border-border bg-surface shadow-[0_-4px_20px_rgba(15,23,42,0.12)] lg:hidden"
      aria-label="현재 지도 영역의 주택 목록"
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls="mobile-map-results"
        className="flex min-h-[76px] w-full shrink-0 items-center justify-between gap-3 px-5 text-left hover:bg-surface-muted"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-bold text-navy">
            <List className="h-5 w-5 text-primary" aria-hidden />
            현재 지도 영역 {units.length}곳
          </span>
          <span className="mt-0.5 block truncate text-sm text-muted">
            {selected ? `선택: ${selected.name}` : "목록을 펼쳐 주택을 비교하세요"}
          </span>
        </span>
        {expanded ? <ChevronDown className="h-5 w-5 shrink-0" aria-hidden /> : <ChevronUp className="h-5 w-5 shrink-0" aria-hidden />}
      </button>

      {expanded && (
        <div id="mobile-map-results" className="min-h-0 flex-1 overflow-y-auto border-t border-border p-3">
          {units.length > 0 ? (
            <div className="space-y-3">
              {units.map((unit) => (
                <HousingMapListCard
                  key={unit.id}
                  unit={unit}
                  selected={unit.id === selectedId}
                  onSelect={() => onSelect(unit.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-36 items-center justify-center text-center text-sm text-muted">
              현재 지도 영역에 조건과 맞는 주택이 없어요.
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
}
