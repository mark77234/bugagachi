"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchAddress, type AddressSuggestion } from "@/mocks/addresses";
import { usePreferencesStore } from "@/features/recommendation/preferences.store";

let destSeq = 0;

/** Q2 직장·학교 단일 앵커 입력 (mock 주소 자동완성). 실제 API는 adapter로 교체. */
export function AddressSearch() {
  const { frequent, addFrequent, removeFrequent } = usePreferencesStore();
  const [label, setLabel] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<AddressSuggestion | null>(null);
  const suggestions = picked ? [] : searchAddress(query);

  const canAdd = label.trim() !== "" && picked !== null;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">장소 이름</span>
          <Input placeholder="예: 직장, 학교" value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <div className="relative">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">도로명주소</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input
                className="pl-9"
                placeholder="주소를 검색하세요 (예: 부산진구)"
                value={picked ? picked.address : query}
                onChange={(e) => {
                  setPicked(null);
                  setQuery(e.target.value);
                }}
                aria-autocomplete="list"
              />
            </span>
          </label>
          {suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-[var(--radius-input)] border border-border bg-surface shadow-[var(--shadow-card)]">
              {suggestions.map((s) => (
                <li key={s.address}>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(s);
                      setQuery(s.address);
                    }}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {s.address}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        size="md"
        className="mt-3"
        disabled={!canAdd}
        onClick={() => {
          if (!picked) return;
          addFrequent({ id: `d${++destSeq}-${frequent.length}`, label: label.trim(), address: picked.address, coord: picked.coord });
          setLabel("");
          setQuery("");
          setPicked(null);
        }}
      >
        {frequent.length > 0 ? "기준 장소 바꾸기" : "기준 장소 적용"}
      </Button>

      {frequent.length > 0 && (
        <ul className="mt-4 space-y-2">
          {frequent.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-border bg-surface p-3">
              <span className="min-w-0">
                <span className="block font-medium text-fg">{f.label}</span>
                <span className="block truncate text-sm text-muted">{f.address}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => removeFrequent(f.id)}>
                삭제
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
