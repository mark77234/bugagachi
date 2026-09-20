"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePreferencesStore } from "@/features/recommendation/preferences.store";
import {
  MIN_KEYWORD_LENGTH,
  searchPlaces,
  shouldSearchKeyword,
  toFrequentDestination,
  type KakaoPlace,
} from "@/lib/kakao-sdk";

/** 입력 중 자동 검색 간격. 기존 자동완성 UX 를 유지하면서 호출 수를 줄인다. */
const DEBOUNCE_MS = 400;

const LISTBOX_ID = "address-search-results";
const optionId = (index: number) => `${LISTBOX_ID}-option-${index}`;

type SearchState =
  | { phase: "idle"; keyword: string }
  | { phase: "loading"; keyword: string }
  | { phase: "done"; keyword: string; places: KakaoPlace[] }
  | { phase: "empty"; keyword: string }
  | { phase: "error"; keyword: string; message: string };

const ERROR_MESSAGE = {
  error: "장소 검색 중 문제가 발생했어요. 다시 시도해 주세요.",
  "sdk-error": "지도 서비스를 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.",
} as const;

/** Q2 직장·학교 단일 앵커 입력. Kakao Maps SDK 의 장소 검색(services.Places)을 쓴다. */
export function AddressSearch() {
  const { frequent, addFrequent, removeFrequent } = usePreferencesStore();
  const [alias, setAlias] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<KakaoPlace | null>(null);
  const [search, setSearch] = useState<SearchState>({ phase: "idle", keyword: "" });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [saveError, setSaveError] = useState("");

  // Kakao SDK 는 콜백 방식이라 AbortController 가 듣지 않는다.
  // 요청마다 번호를 매겨, 늦게 도착한 오래된 응답이 최신 결과를 덮어쓰지 못하게 한다.
  const requestIdRef = useRef(0);
  const dispatchedKeywordRef = useRef("");
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const keyword = query.trim();
  const canSearch = !picked && shouldSearchKeyword(keyword);

  const runSearch = useCallback((target: string, force = false) => {
    // 같은 검색어를 디바운스와 Enter 가 겹쳐 두 번 보내지 않도록 막는다.
    if (!force && dispatchedKeywordRef.current === target) return;
    dispatchedKeywordRef.current = target;
    const requestId = ++requestIdRef.current;
    setSearch({ phase: "loading", keyword: target });
    setActiveIndex(-1);

    void searchPlaces(target).then((outcome) => {
      // 언마운트 후이거나 이미 더 새로운 검색이 나갔으면 버린다.
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      if (outcome.status === "ok") setSearch({ phase: "done", keyword: target, places: outcome.places });
      else if (outcome.status === "empty") setSearch({ phase: "empty", keyword: target });
      else setSearch({ phase: "error", keyword: target, message: ERROR_MESSAGE[outcome.status] });
    });
  }, []);

  useEffect(() => {
    if (!canSearch) return;
    const timer = setTimeout(() => runSearch(keyword), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keyword, canSearch, runSearch]);

  const places = search.phase === "done" && search.keyword === keyword ? search.places : [];

  function choose(place: KakaoPlace) {
    setPicked(place);
    setQuery(place.place_name);
    setActiveIndex(-1);
    setSaveError("");
  }

  function apply() {
    if (!picked) return;
    const destination = toFrequentDestination(picked, alias);
    if (!destination) {
      // Kakao 가 좌표를 주지 않은 예외적인 경우. 임의 좌표로 채우지 않는다.
      setSaveError("이 장소는 좌표 정보가 없어 저장할 수 없어요. 다른 장소를 선택해 주세요.");
      return;
    }
    addFrequent(destination);
    setAlias("");
    setQuery("");
    setPicked(null);
    setSaveError("");
    dispatchedKeywordRef.current = "";
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // 한글 조합 중 Enter 는 글자 확정용이라 검색으로 쓰지 않는다.
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" && places.length > 0) {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % places.length);
    } else if (event.key === "ArrowUp" && places.length > 0) {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? places.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && places[activeIndex]) choose(places[activeIndex]);
      else if (canSearch) runSearch(keyword);
    } else if (event.key === "Escape") {
      setSearch({ phase: "idle", keyword });
      setActiveIndex(-1);
    }
  }

  // 검색어가 짧은 상태와 결과 상태를 구분해서 그린다. 검색어가 바뀐 직후에는 이전 결과를 그리지 않는다.
  const tooShort = !picked && keyword.length > 0 && keyword.length < MIN_KEYWORD_LENGTH;
  const view = !picked && search.keyword === keyword && search.phase !== "idle" ? search : null;
  const staleDestination = frequent.find((f) => !f.coord);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg">장소 이름</span>
          <Input
            placeholder="예: 직장, 학교"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
          />
        </label>
        <div className="relative">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg">장소·주소 검색</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input
                className="pl-9 pr-9"
                placeholder="예: 부산대학교, 서면역, 금곡대로 271"
                value={query}
                onChange={(e) => {
                  setPicked(null);
                  setSaveError("");
                  setQuery(e.target.value);
                }}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded={places.length > 0}
                aria-controls={LISTBOX_ID}
                aria-autocomplete="list"
                aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
              />
              {view?.phase === "loading" && (
                <Loader2
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted"
                  aria-hidden
                />
              )}
            </span>
          </label>

          {(tooShort || view) && (
            <div
              className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto overscroll-contain rounded-[var(--radius-input)] border border-border bg-surface shadow-[var(--shadow-card)]"
              aria-live="polite"
            >
              {tooShort && <p className="px-3 py-3 text-sm text-muted">두 글자 이상 입력해 주세요.</p>}

              {view?.phase === "loading" && <p className="px-3 py-3 text-sm text-muted">장소를 찾는 중이에요…</p>}

              {view?.phase === "empty" && (
                <p className="px-3 py-3 text-sm text-muted">
                  검색 결과가 없어요. 장소명이나 주소를 조금 더 자세히 입력해 주세요.
                </p>
              )}

              {view?.phase === "error" && (
                <div className="flex items-center justify-between gap-3 px-3 py-3">
                  <p className="text-sm text-muted">{view.message}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 whitespace-nowrap"
                    onClick={() => runSearch(keyword, true)}
                  >
                    <RefreshCw className="h-4 w-4" /> 다시 시도
                  </Button>
                </div>
              )}

              {places.length > 0 && (
                <ul id={LISTBOX_ID} role="listbox" aria-label="장소 검색 결과">
                  {places.map((place, index) => (
                    <li key={place.id} id={optionId(index)} role="option" aria-selected={index === activeIndex}>
                      <button
                        type="button"
                        tabIndex={-1}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => choose(place)}
                        className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm focus-visible:outline-none ${
                          index === activeIndex ? "bg-surface-muted" : "hover:bg-surface-muted"
                        }`}
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <span className="min-w-0">
                          <span className="block font-medium text-fg">{place.place_name}</span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {place.road_address_name || place.address_name}
                          </span>
                          {place.road_address_name && place.address_name && (
                            <span className="mt-0.5 block text-xs text-muted">지번 {place.address_name}</span>
                          )}
                          {place.category_group_name && (
                            <span className="mt-0.5 block text-xs text-muted">{place.category_group_name}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <Button variant="outline" size="md" className="mt-3" disabled={!picked} onClick={apply}>
        {frequent.length > 0 ? "기준 장소 바꾸기" : "기준 장소 적용"}
      </Button>
      {picked && !alias.trim() && (
        <p className="mt-2 text-xs text-muted">장소 이름을 비워 두면 「{picked.place_name}」으로 저장돼요.</p>
      )}
      {saveError && <p className="mt-2 text-xs font-medium text-error" role="alert">{saveError}</p>}

      {frequent.length > 0 && (
        <ul className="mt-4 space-y-2">
          {frequent.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-border bg-surface p-3">
              <span className="min-w-0">
                <span className="block font-medium text-fg">{f.label}</span>
                <span className="block truncate text-sm text-muted">{f.address}</span>
              </span>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={() => removeFrequent(f.id)}>
                삭제
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* 예전 주소 검색으로 저장돼 좌표가 없는 데이터. 임의 좌표로 보정하지 않고 다시 고르게 안내한다. */}
      {staleDestination && (
        <p className="mt-2 text-xs text-muted">
          이 장소는 좌표 정보가 없어 거리 점수에 반영되지 않아요. 삭제한 뒤 다시 검색해 주세요.
        </p>
      )}
    </div>
  );
}
