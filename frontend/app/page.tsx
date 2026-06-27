"use client";

import { useMemo, useState } from "react";

// ──────────────────────────────────────────────────────────────────────
// 2026 월드컵 32강 = 12개 조 1·2위(24팀) + 조 3위 중 상위 8팀.
// 한국 A조 3위(승점3·득실-1·2득점). 확정 3위 중 4팀(스웨덴·에콰도르·보스니아·
// 파라과이)이 이미 한국 위 → 남은 6개 조에서 '한국 추월(위협)'이 3개 이하면
// 진출, 한국 순위 = 5 + 위협수. 각 조 위협/안전 경계는 최종전 전 스코어
// 완전탐색으로 검증. 기준 스냅샷 2026-06-27.
// ──────────────────────────────────────────────────────────────────────

type Third = {
  group: string;
  team: string;
  pts: number;
  gd: number;
  gf: number;
  fixed: boolean;
  korea?: boolean;
  hint?: string;
};

const FIXED: Third[] = [
  { group: "F", team: "스웨덴", pts: 4, gd: 0, gf: 7, fixed: true },
  { group: "E", team: "에콰도르", pts: 4, gd: 0, gf: 2, fixed: true },
  { group: "B", team: "보스니아", pts: 4, gd: -1, gf: 5, fixed: true },
  { group: "D", team: "파라과이", pts: 4, gd: -2, gf: 2, fixed: true },
  { group: "A", team: "한국", pts: 3, gd: -1, gf: 2, fixed: true, korea: true },
  { group: "C", team: "스코틀랜드", pts: 3, gd: -3, gf: 1, fixed: true },
];

// 조별리그 종료 후 확정된 G~L조 3위 (2026-06-28).
const PENDING_DEFAULT: Third[] = [
  { group: "G", team: "이란", pts: 3, gd: 0, gf: 3, fixed: true, hint: "G조 3위 · 한국 위" },
  { group: "H", team: "우루과이", pts: 2, gd: 0, gf: 3, fixed: true, hint: "H조 3위 · 한국 아래" },
  { group: "I", team: "세네갈", pts: 3, gd: 1, gf: 4, fixed: true, hint: "I조 3위 · 한국 위" },
  { group: "J", team: "알제리", pts: 3, gd: -2, gf: 2, fixed: true, hint: "J조 3위 · 한국 아래" },
  { group: "K", team: "콩고DR", pts: 1, gd: -1, gf: 1, fixed: true, hint: "K조 3위 · 한국 아래" },
  { group: "L", team: "크로아티아", pts: 3, gd: -1, gf: 3, fixed: true, hint: "L조 3위 · 한국 위(다득점)" },
];

const ADVANCE_SLOTS = 8;

function rank(teams: Third[]): Third[] {
  return [...teams].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// ── 결정 경기 6개 (킥오프 순서: 위→아래 = 먼저 끝남), 한국시간 근사 ──────
// fav = 한국에 유리한(그 조 3위가 한국 아래) 결과. 스코어 완전탐색으로 검증.
type Pg = { key: string; when: string; match: string; fav: string };
const PG: Pg[] = [
  { key: "I", when: "토 04:00", match: "세네갈 vs 이라크", fav: "세네갈, 이라크에 2골차+ 승 실패" },
  { key: "H", when: "토 09:00", match: "우루과이 vs 스페인", fav: "스페인 승" },
  { key: "G", when: "토 12:00", match: "이집트 vs 이란", fav: "이집트 승" },
  { key: "L", when: "일 06:00", match: "크로아티아 vs 가나", fav: "잉글랜드 승 + 가나 승" },
  { key: "K", when: "일 08:30", match: "콩고DR vs 우즈벡", fav: "콩고DR, 우즈벡에 승리 실패" },
  { key: "J", when: "일 11:00", match: "알제리 vs 오스트리아", fav: "오스트리아 승 / 알제리 2골차+ 승" },
];

// 확정 3위 4팀이 이미 한국 위 → 남은 6개 조 중 '한국 아래'가 3개면 무조건
// 진출(나머지 무관). 그래서 시나리오 = 유리 조건 3개의 조합(최소 충족).
// 킥오프상 가장 늦게 결정되는 경기 index로 정렬 → 위쪽일수록 빨리 결판.
type MinScn = { id: string; idx: number[] };
const MIN_SCENARIOS: MinScn[] = (() => {
  const n = PG.length;
  const out: MinScn[] = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++)
        out.push({ id: `${i}-${j}-${k}`, idx: [i, j, k] });
  out.sort((a, b) => {
    const am = Math.max(...a.idx),
      bm = Math.max(...b.idx);
    if (am !== bm) return am - bm;
    for (let p = 0; p < 3; p++) if (a.idx[p] !== b.idx[p]) return a.idx[p] - b.idx[p];
    return 0;
  });
  return out;
})();

export default function Page() {
  const [pending, setPending] = useState<Third[]>(
    PENDING_DEFAULT.map((t) => ({ ...t })),
  );

  const all = useMemo(() => [...FIXED, ...pending], [pending]);
  const sorted = useMemo(() => rank(all), [all]);
  const koreaRank = sorted.findIndex((t) => t.korea) + 1;
  const advancing = koreaRank <= ADVANCE_SLOTS;
  const cushion = ADVANCE_SLOTS - koreaRank;

  const korea = FIXED.find((t) => t.korea)!;
  const beats = (t: Third) =>
    t.pts > korea.pts ||
    (t.pts === korea.pts && t.gd > korea.gd) ||
    (t.pts === korea.pts && t.gd === korea.gd && t.gf > korea.gf);
  const pendingAhead = pending.filter(beats).length;
  const maxPendingAhead = ADVANCE_SLOTS - 1 - 4;

  function update(group: string, patch: Partial<Third>) {
    setPending((prev) =>
      prev.map((t) => (t.group === group ? { ...t, ...patch } : t)),
    );
  }
  function preset(kind: "now" | "best" | "worst") {
    if (kind === "now") setPending(PENDING_DEFAULT.map((t) => ({ ...t })));
    else if (kind === "best")
      setPending((prev) => prev.map((t) => ({ ...t, pts: 1, gd: -3, gf: 1 })));
    else setPending((prev) => prev.map((t) => ({ ...t, pts: 4, gd: 1, gf: 4 })));
  }

  return (
    <div className="relative z-10 mx-auto max-w-2xl px-5 pb-20 pt-8 sm:pt-12">
      {/* 헤더 */}
      <header className="mb-6">
        <div className="flex items-center gap-2 text-[13px] font-medium text-white/55">
          <span>🇰🇷 2026 월드컵</span>
          <span className="text-white/25">·</span>
          <span>조별리그 종료 · 결과 확정</span>
        </div>
        <h1
          className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}
        >
          한국, 32강 진출 확정 🎉
        </h1>
        <p
          className="mt-1.5 text-[14px] font-medium text-emerald-300"
          style={{ textShadow: "0 1px 12px rgba(0,0,0,0.6)" }}
        >
          조 3위 12팀 중 8위 — 마지막 와일드카드로 토너먼트행
        </p>
      </header>

      {/* 판정 배너 */}
      <Verdict
        advancing={advancing}
        rank={koreaRank}
        cushion={cushion}
        pendingAhead={pendingAhead}
        maxPendingAhead={maxPendingAhead}
      />

      {/* 진출 시나리오 보드 */}
      <ScenarioBoard />

      {/* 시나리오 프리셋 */}
      <div className="mt-7 mb-3 flex items-center gap-2">
        <span className="text-[13px] font-semibold text-white/60">
          정밀 조정
        </span>
        <div className="flex gap-1.5">
          <Preset onClick={() => preset("now")}>현재 예측</Preset>
          <Preset onClick={() => preset("best")}>한국 최상</Preset>
          <Preset onClick={() => preset("worst")}>한국 최악</Preset>
        </div>
      </div>

      {/* 미확정 6개 조 조정 */}
      <section className="mb-7">
        <div className="mb-2 text-[13px] font-semibold">
          G~L조 3위 확정값 (직접 바꿔 복기 가능)
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {pending.map((t) => (
            <PendingCard
              key={t.group}
              t={t}
              ahead={beats(t)}
              onPts={(v) => update(t.group, { pts: v })}
              onGd={(v) => update(t.group, { gd: clamp(v, -9, 9) })}
              onGf={(v) => update(t.group, { gf: clamp(v, 0, 15) })}
            />
          ))}
        </div>
      </section>

      {/* 3위 순위표 */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[13px] font-semibold">
            조 3위 순위표 · 상위 {ADVANCE_SLOTS}팀 진출
          </div>
          <div className="text-[12px] text-white/50">승점 → 득실 → 다득점</div>
        </div>
        <div className="glass overflow-hidden rounded-xl">
          {sorted.map((t, i) => (
            <Row key={t.group} t={t} pos={i + 1} cut={i + 1 === ADVANCE_SLOTS} />
          ))}
        </div>
      </section>

      {/* 응원 가이드 */}
      <Guide pending={pending} beats={beats} max={maxPendingAhead} />

      {/* 출처 / 푸터 */}
      <footer className="mt-12 border-t border-white/10 pt-5 text-[12px] leading-relaxed text-white/50">
        <p>
          조별리그 종료 <b className="text-white/75">2026-06-28</b> 기준. 한국은
          조 3위 8위로 32강 진출 확정. 일부 득실·다득점 수치는 보도 기준 근사.
          배경 영상 ⓒ Pexels(무료).
        </p>
        <p className="mt-2">
          참고:{" "}
          <a
            className="underline-offset-2 hover:underline"
            href="https://www.fifa.com/ko/tournaments/mens/worldcup/canadamexicousa2026/standings"
            target="_blank"
            rel="noreferrer"
          >
            FIFA 순위표
          </a>
          {" · "}
          <a
            className="underline-offset-2 hover:underline"
            href="https://sports.yahoo.com/soccer/article/world-cup-2026-standings-whos-in-whos-out-and-every-teams-path-to-the-round-of-32-164942403.html"
            target="_blank"
            rel="noreferrer"
          >
            Yahoo Sports
          </a>
        </p>
        <p className="mt-4">
          Hosted on{" "}
          <a className="hover:underline" href="https://coders.kr">
            coders.kr
          </a>
        </p>
      </footer>
    </div>
  );
}

// ── 판정 배너 ──────────────────────────────────────────────────────────
function Verdict({
  advancing,
  rank,
  cushion,
  pendingAhead,
  maxPendingAhead,
}: {
  advancing: boolean;
  rank: number;
  cushion: number;
  pendingAhead: number;
  maxPendingAhead: number;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 backdrop-blur-md ${
        advancing
          ? "border-emerald-400/30 bg-emerald-500/15"
          : "border-red-400/30 bg-red-500/15"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div
            className={`text-[12px] font-bold uppercase tracking-wide ${
              advancing ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {advancing ? "확정 · 32강 진출" : "확정 · 탈락"}
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight">
            조 3위 <span className="tabular-nums">{rank}</span>위
          </div>
        </div>
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            advancing
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-red-500/20 text-red-300"
          }`}
        >
          {advancing ? "✓" : "✕"}
        </div>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-white/80">
        {advancing ? (
          <>
            상위 8팀 안.{" "}
            {cushion > 0 ? (
              <>
                컷(8위)까지 <b>{cushion}팀</b> 여유.{" "}
              </>
            ) : (
              <>딱 마지막 진출 자리. </>
            )}
            G~L조에서 한국보다 나은 3위가 <b>{maxPendingAhead}팀</b>까지면 통과 —
            실제 <b>{pendingAhead}팀</b>(세네갈·이란·크로아티아)으로 딱 통과.
          </>
        ) : (
          <>
            상위 8팀 밖. 잔여 조에서 한국을 추월한 3위가 <b>{pendingAhead}팀</b>
            으로 한계({maxPendingAhead}팀)를 넘었다.
          </>
        )}
      </p>
    </div>
  );
}

// ── 진출 시나리오 보드 ─────────────────────────────────────────────────
// 카드 = 유리 조건 3개의 묶음(이거 다 되면 무조건 진출). 조건을 누르면
// 결과 표시: 한 번 = 달성(✓), 두 번 = 실패(✗). 실패가 끼면 카드는 흐려진다.
function ScenarioBoard() {
  // 조별리그 종료 — 실제 결과 반영(세네갈·이란·크로아티아 유리 실패, 나머지 달성).
  const [res, setRes] = useState<Record<string, "ok" | "fail">>({
    I: "fail",
    G: "fail",
    L: "fail",
    H: "ok",
    K: "ok",
    J: "ok",
  });
  const cycle = (k: string) =>
    setRes((p) => {
      const cur = p[k];
      const next = cur === undefined ? "ok" : cur === "ok" ? "fail" : undefined;
      const n = { ...p };
      if (next === undefined) delete n[k];
      else n[k] = next;
      return n;
    });

  const cards = MIN_SCENARIOS.map((s) => {
    const groups = s.idx.map((i) => PG[i]);
    const failed = groups.some((g) => res[g.key] === "fail");
    const cleared = groups.every((g) => res[g.key] === "ok");
    return { ...s, groups, failed, cleared };
  });
  const alive = cards.filter((c) => !c.failed).length;
  const clinched = cards.some((c) => c.cleared);
  const out = alive === 0;

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">진출 시나리오 · 결과 반영</span>
        <span className="text-[11.5px] text-white/50">
          실제 결과 반영됨 · 눌러서 복기 가능
        </span>
      </div>

      {(clinched || out) && (
        <div
          className={`mb-3 rounded-xl border p-3 text-[13px] font-semibold backdrop-blur-md ${
            out
              ? "border-red-400/30 bg-red-500/15 text-red-200"
              : "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
          }`}
        >
          {out
            ? "✕ 탈락 — 남은 진출 시나리오 없음"
            : "✓ 32강 진출 확정 — 조건을 모두 충족한 시나리오 성립"}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {cards.map((c) => (
          <div
            key={c.id}
            className={`glass rounded-xl p-3 transition-all ${
              c.failed
                ? "opacity-40 grayscale"
                : c.cleared
                  ? "ring-1 ring-emerald-400/50"
                  : ""
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-white/45">
                {c.failed ? "실패" : c.cleared ? "충족 → 진출" : "이 결과면 진출"}
              </span>
              {c.cleared && !c.failed && (
                <span className="text-[11px] font-bold text-emerald-300">
                  ✓ 진출
                </span>
              )}
            </div>
            <div className="space-y-1">
              {c.groups.map((g, i) => {
                const st = res[g.key];
                return (
                  <button
                    key={g.key}
                    onClick={() => cycle(g.key)}
                    className="flex w-full items-start gap-1.5 text-left"
                  >
                    <span className="mt-px w-7 shrink-0 text-[12px] font-semibold text-white/40">
                      {i === 0 ? "" : "and"}
                    </span>
                    <span
                      className={`flex-1 text-[13.5px] font-medium leading-snug ${
                        st === "fail"
                          ? "text-red-300 line-through"
                          : st === "ok"
                            ? "text-emerald-300"
                            : "text-white/85"
                      }`}
                    >
                      {g.fav}
                    </span>
                    <span
                      className={`mt-px shrink-0 text-[12px] font-bold ${
                        st === "fail"
                          ? "text-red-400"
                          : st === "ok"
                            ? "text-emerald-400"
                            : "text-white/25"
                      }`}
                    >
                      {st === "fail" ? "✗" : st === "ok" ? "✓" : "·"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(res).length > 0 && (
        <button
          onClick={() => setRes({})}
          className="mt-2 text-[11.5px] text-white/50 underline-offset-2 hover:underline"
        >
          결과 초기화
        </button>
      )}
    </section>
  );
}

// ── 시나리오 버튼 ──────────────────────────────────────────────────────
function Preset({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12.5px] font-medium backdrop-blur-sm transition-colors hover:bg-white/10 active:scale-[0.97]"
    >
      {children}
    </button>
  );
}

// ── 미확정 조 카드 ─────────────────────────────────────────────────────
function PendingCard({
  t,
  ahead,
  onPts,
  onGd,
  onGf,
}: {
  t: Third;
  ahead: boolean;
  onPts: (v: number) => void;
  onGd: (v: number) => void;
  onGf: (v: number) => void;
}) {
  return (
    <div
      className={`glass rounded-xl p-3 ${ahead ? "ring-1 ring-red-500/40" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-white/10 px-1 text-[11px] font-bold">
            {t.group}
          </span>
          <span className="text-[13px] font-semibold">{t.team}</span>
        </div>
        {ahead ? (
          <span className="text-[11px] font-semibold text-red-300">
            한국 추월
          </span>
        ) : (
          <span className="text-[11px] font-medium text-emerald-300">
            한국 아래
          </span>
        )}
      </div>
      {t.hint && (
        <div className="mt-1 truncate text-[11px] text-white/50">{t.hint}</div>
      )}
      <div className="mt-2.5 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="w-9 text-[11px] font-medium text-white/55">승점</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((p) => (
              <button
                key={p}
                onClick={() => onPts(p)}
                className={`h-6 w-6 rounded-md text-[12px] font-semibold tabular-nums transition-colors ${
                  t.pts === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/10 text-white/55 hover:bg-white/20"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Stepper label="득실" value={t.gd} onChange={onGd} signed />
          <Stepper label="득점" value={t.gf} onChange={onGf} />
        </div>
      </div>
    </div>
  );
}

// ── ± 스텝퍼 ───────────────────────────────────────────────────────────
function Stepper({
  label,
  value,
  onChange,
  signed,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  signed?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-9 text-[11px] font-medium text-white/55">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(value - 1)}
          className="h-6 w-6 rounded-md bg-white/10 text-[13px] font-bold text-white/55 hover:bg-white/20"
        >
          −
        </button>
        <span className="w-7 text-center text-[12.5px] font-semibold tabular-nums">
          {signed && value > 0 ? `+${value}` : value}
        </span>
        <button
          onClick={() => onChange(value + 1)}
          className="h-6 w-6 rounded-md bg-white/10 text-[13px] font-bold text-white/55 hover:bg-white/20"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── 순위표 한 줄 ───────────────────────────────────────────────────────
function Row({ t, pos, cut }: { t: Third; pos: number; cut: boolean }) {
  const inZone = pos <= ADVANCE_SLOTS;
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 text-[13px] ${
        t.korea
          ? "bg-emerald-500/15 font-semibold"
          : pos % 2 === 0
            ? "bg-white/[0.03]"
            : ""
      } ${cut ? "border-b-2 border-dashed border-red-400/50" : "border-b border-white/8 last:border-0"}`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-bold tabular-nums ${
          inZone
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-red-500/15 text-red-300"
        }`}
      >
        {pos}
      </span>
      <span className="flex h-5 min-w-5 items-center justify-center rounded bg-white/10 px-1 text-[10px] font-bold text-white/55">
        {t.group}
      </span>
      <span className="flex-1 truncate">
        {t.team}
        {t.korea && <span className="ml-1">🇰🇷</span>}
        {!t.fixed && (
          <span className="ml-1.5 text-[10px] font-normal text-white/45">
            예상
          </span>
        )}
      </span>
      <span className="w-8 text-right font-semibold tabular-nums">{t.pts}</span>
      <span className="w-9 text-right tabular-nums text-white/55">
        {t.gd > 0 ? `+${t.gd}` : t.gd}
      </span>
      <span className="w-6 text-right tabular-nums text-white/55">{t.gf}</span>
    </div>
  );
}

// ── 응원 가이드 ────────────────────────────────────────────────────────
function Guide({
  pending,
  beats,
  max,
}: {
  pending: Third[];
  beats: (t: Third) => boolean;
  max: number;
}) {
  const ahead = pending.filter(beats);
  return (
    <section className="glass mt-7 rounded-xl p-4">
      <div className="text-[13px] font-semibold">최종 정리</div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">
        {ahead.length === 0 ? (
          <>한국을 추월한 조가 <b>없이</b> 진출.</>
        ) : (
          <>
            G~L조에서{" "}
            <b className="text-red-300">
              {ahead.map((t) => `${t.group}조(${t.team})`).join(", ")}
            </b>
            가 한국을 넘었지만 딱 {max}팀 — 한국은 마지막 {ADVANCE_SLOTS}번째
            자리로 32강에 안착했다. 크로아티아엔 득실은 같고 다득점(3 vs 2)에서만
            밀렸을 뿐, 8위 컷은 한국 차지.
          </>
        )}
      </p>
    </section>
  );
}
