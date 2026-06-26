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

const PENDING_DEFAULT: Third[] = [
  { group: "G", team: "벨기에/이란", pts: 2, gd: 0, gf: 2, fixed: false, hint: "이집트 4 / 이란·벨기에 2 / 뉴질랜드 1" },
  { group: "H", team: "우루과이/카보베르데", pts: 2, gd: -1, gf: 2, fixed: false, hint: "스페인 4 / 우루과이·카보베르데 2 / 사우디 1" },
  { group: "I", team: "세네갈/이라크", pts: 3, gd: -2, gf: 2, fixed: false, hint: "프랑스·노르웨이 6 / 세네갈·이라크 0" },
  { group: "J", team: "알제리/오스트리아", pts: 3, gd: -2, gf: 2, fixed: false, hint: "아르헨티나 6 / 오스트리아·알제리 3 / 요르단 0" },
  { group: "K", team: "콩고DR/우즈벡", pts: 2, gd: -1, gf: 1, fixed: false, hint: "콜롬비아 6 / 포르투갈 4 / 콩고DR·우즈벡 1" },
  { group: "L", team: "크로아티아", pts: 3, gd: -1, gf: 3, fixed: false, hint: "잉글랜드·가나 4 / 크로아티아 3 / 파나마 0" },
];

const ADVANCE_SLOTS = 8;

function rank(teams: Third[]): Third[] {
  return [...teams].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// ── 결정 경기 6개 (킥오프 순서: 왼→오 = 먼저 끝남), 한국시간 근사 ──────
type Pg = {
  key: string;
  no: string;
  when: string;
  match: string;
  safe: string;
  threat: string;
  short: string; // 위협 한 줄 요약
};
const PG: Pg[] = [
  { key: "I", no: "①", when: "토 04:00", match: "세네갈 vs 이라크", safe: "세네갈이 2골차+ 승 못 하면", threat: "세네갈 2골차 이상 승", short: "세네갈 2골차+승" },
  { key: "H", no: "②", when: "토 09:00", match: "우루과이 vs 스페인", safe: "스페인 승", threat: "우루과이 무 또는 승", short: "우루과이 무·승" },
  { key: "G", no: "③", when: "토 12:00", match: "이집트 vs 이란", safe: "이집트 승", threat: "이란 무 또는 승", short: "이란 무·승" },
  { key: "L", no: "④", when: "일 06:00", match: "크로아티아 vs 가나", safe: "잉글랜드 승 & 가나 승", threat: "그 외 결과", short: "L조 이변" },
  { key: "K", no: "⑤", when: "일 08:30", match: "콩고DR vs 우즈벡", safe: "콩고 무 또는 패", threat: "콩고 승", short: "콩고 승" },
  { key: "J", no: "⑥", when: "일 11:00", match: "알제리 vs 오스트리아", safe: "오스트리아 승 / 알제리 2골차+승", threat: "무 또는 알제리 1골차 승", short: "알제리 1골차승·무" },
];

// 진출 시나리오 = 위협 ≤ 3 인 모든 조합. 한국 순위 = 5 + 위협수.
// 킥오프 순서(I가 최상위 자릿값)로 정렬 → 왼쪽 경기부터 가지치기.
type Scn = { id: number; rank: number; threats: number; outcome: ("safe" | "threat")[] };
const SCENARIOS: Scn[] = (() => {
  const n = PG.length;
  const out: Scn[] = [];
  for (let m = 0; m < 1 << n; m++) {
    let t = 0;
    const oc: ("safe" | "threat")[] = [];
    for (let i = 0; i < n; i++) {
      const th = ((m >> i) & 1) === 1;
      oc.push(th ? "threat" : "safe");
      if (th) t++;
    }
    if (t > 3) continue;
    out.push({ id: m, rank: 5 + t, threats: t, outcome: oc });
  }
  out.sort((a, b) => {
    for (let i = 0; i < n; i++) {
      const av = a.outcome[i] === "safe" ? 0 : 1;
      const bv = b.outcome[i] === "safe" ? 0 : 1;
      if (av !== bv) return av - bv;
    }
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
          <span>32강 경우의 수 관제</span>
        </div>
        <h1
          className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}
        >
          한국, 32강 갈 수 있나
        </h1>
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
          남은 변수 · G~L조 3위 (최종전 미정)
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
          기준 스냅샷 <b className="text-white/75">2026-06-27</b>. 미확정 조의
          3위 예상치는 추정값이며 실제 결과로 바꿔 보면 된다. 세부
          타이브레이커(공정성 점수 등)는 단순화. 배경 영상 ⓒ Pexels(무료).
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
            {advancing ? "현재 예측 · 32강 진출권" : "현재 예측 · 탈락권"}
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
            잔여 6개 조에서 한국보다 나은 3위가 <b>{maxPendingAhead}팀</b>까지면
            통과 — 지금은 <b>{pendingAhead}팀</b>.
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
function ScenarioBoard() {
  const [res, setRes] = useState<Record<string, "safe" | "threat">>({});
  const toggle = (k: string, v: "safe" | "threat") =>
    setRes((p) => {
      if (p[k] === v) {
        const n = { ...p };
        delete n[k];
        return n;
      }
      return { ...p, [k]: v };
    });

  const threatsResolved = PG.filter((g) => res[g.key] === "threat").length;
  const undecided = PG.filter((g) => !res[g.key]).length;
  const clinchIn = threatsResolved + undecided <= 3;
  const clinchOut = threatsResolved >= 4;

  const survives = (s: Scn) =>
    PG.every((g, i) => !res[g.key] || res[g.key] === s.outcome[i]);
  const live = SCENARIOS.filter(survives);
  const best = live.length ? Math.min(...live.map((s) => s.rank)) : null;
  const worst = live.length ? Math.max(...live.map((s) => s.rank)) : null;
  const resolved = PG.length - undecided;

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">진출 시나리오</span>
        <span className="text-[11.5px] text-white/50">
          왼쪽 경기부터 결정 · 깨진 경우는 사라짐
        </span>
      </div>

      {/* 결정 경기 결과 입력 (킥오프 순서) */}
      <div className="glass mb-3 rounded-xl p-1.5">
        {PG.map((g) => (
          <div
            key={g.key}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
          >
            <span className="w-4 shrink-0 text-center text-[12px] font-bold text-white/55">
              {g.no}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold">
                {g.match}
                <span className="ml-1.5 text-[10px] font-normal text-white/40">
                  {g.when}
                </span>
              </div>
              <div className="truncate text-[10.5px] text-white/55">
                <span className="text-emerald-300">유리</span> {g.safe}
                <span className="mx-1 text-white/25">·</span>
                <span className="text-red-300">위협</span> {g.threat}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <SegBtn active={res[g.key] === "safe"} tone="safe" onClick={() => toggle(g.key, "safe")}>
                유리
              </SegBtn>
              <SegBtn active={res[g.key] === "threat"} tone="threat" onClick={() => toggle(g.key, "threat")}>
                위협
              </SegBtn>
            </div>
          </div>
        ))}
      </div>

      {/* 현재 상태 */}
      <div
        className={`mb-3 rounded-xl border p-3 text-[13px] backdrop-blur-md ${
          clinchOut || live.length === 0
            ? "border-red-400/30 bg-red-500/15 text-red-200"
            : clinchIn
              ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
              : "border-white/12 bg-white/[0.05] text-white/80"
        }`}
      >
        {clinchOut || live.length === 0 ? (
          <span className="font-semibold">
            ✕ 탈락 — 남은 진출 경우의 수 0
          </span>
        ) : clinchIn ? (
          <span className="font-semibold">
            ✓ 32강 진출 확정 — 한국 {best === worst ? `${best}위` : `${best}~${worst}위`}
          </span>
        ) : (
          <>
            가능한 진출 경우의 수 <b className="tabular-nums">{live.length}</b>개 ·
            한국 <b>{best === worst ? `${best}위` : `${best}~${worst}위`}</b> ·{" "}
            <span className="text-white/55">남은 경기 {undecided}개</span>
          </>
        )}
      </div>

      {/* 시나리오 카드 (왼→오: 킥오프 순서) */}
      {live.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {live.map((s) => {
            const threatLabels = PG.filter(
              (_, i) => s.outcome[i] === "threat",
            ).map((g) => g.short);
            return (
              <div
                key={s.id}
                className="glass flex w-[156px] shrink-0 flex-col rounded-xl p-3"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-bold tracking-tight text-emerald-300">
                    한국 {s.rank}위
                  </span>
                  <span className="text-[10px] font-medium text-emerald-300/60">
                    진출
                  </span>
                </div>
                <div className="mt-1 min-h-[30px] text-[10.5px] leading-snug">
                  {threatLabels.length ? (
                    <span className="text-red-300">
                      이변 허용: {threatLabels.join(" · ")}
                    </span>
                  ) : (
                    <span className="text-emerald-300/85">
                      전 경기 한국에 유리
                    </span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-6 gap-1">
                  {s.outcome.map((o, i) => (
                    <span
                      key={i}
                      title={`${PG[i].match} — ${o === "safe" ? "유리" : "위협"}`}
                      className={`flex h-6 items-center justify-center rounded text-[9.5px] font-bold ${
                        o === "safe"
                          ? "bg-emerald-500/25 text-emerald-200"
                          : "bg-red-500/35 text-red-100"
                      }`}
                    >
                      {PG[i].key}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-red-400/20 bg-red-500/5 p-4 text-[13px] text-red-200">
          입력한 결과로는 한국이 32강에 갈 경우의 수가 없다.
        </div>
      )}

      {resolved > 0 && (
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

function SegBtn({
  children,
  active,
  tone,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  tone: "safe" | "threat";
  onClick: () => void;
}) {
  const on =
    tone === "safe" ? "bg-emerald-500 text-white" : "bg-red-500 text-white";
  return (
    <button
      onClick={onClick}
      className={`h-7 w-11 rounded-md text-[11px] font-semibold transition-colors ${
        active ? on : "bg-white/10 text-white/55 hover:bg-white/20"
      }`}
    >
      {children}
    </button>
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
      <div className="text-[13px] font-semibold">응원 가이드</div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">
        한국이 사는 길은 잔여 G~L조에서{" "}
        <b className="text-white">3위가 약하게</b> 나오는 것 — 승점이 적거나
        득실이 나쁜 3위.{" "}
        {ahead.length === 0 ? (
          <>지금 설정에선 한국을 추월하는 조가 <b>없다</b>. 더할 나위 없음.</>
        ) : (
          <>
            지금은{" "}
            <b className="text-red-300">
              {ahead.map((t) => `${t.group}조(${t.team})`).join(", ")}
            </b>
            가 한국을 추월 중. {max}팀까지는 버틴다.
          </>
        )}
      </p>
    </section>
  );
}
