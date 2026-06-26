"use client";

import { useMemo, useState } from "react";

// ──────────────────────────────────────────────────────────────────────
// 2026 월드컵 32강 = 12개 조 1·2위(24팀) + 조 3위 중 상위 8팀.
// 한국은 A조 3위(승점3·득실-1·2득점)로 조별리그를 마쳤다. 남은 싸움은
// "조 3위 12팀 중 상위 8팀" 경쟁뿐. A~F조 3위는 확정, G~L조 3위는
// 최종전 결과에 따라 바뀌므로 아래에서 직접 조정해 경우의 수를 본다.
// 기준 스냅샷: 2026-06-27 (출처는 하단).
// ──────────────────────────────────────────────────────────────────────

type Third = {
  group: string;
  team: string;
  pts: number;
  gd: number;
  gf: number;
  fixed: boolean; // 조별리그 종료로 3위 확정
  korea?: boolean;
  hint?: string; // 미확정 조의 현재 3위 후보 메모
};

const FIXED: Third[] = [
  { group: "F", team: "스웨덴", pts: 4, gd: 0, gf: 7, fixed: true },
  { group: "E", team: "에콰도르", pts: 4, gd: 0, gf: 2, fixed: true },
  { group: "B", team: "보스니아", pts: 4, gd: -1, gf: 5, fixed: true },
  { group: "D", team: "파라과이", pts: 4, gd: -2, gf: 2, fixed: true },
  { group: "A", team: "한국", pts: 3, gd: -1, gf: 2, fixed: true, korea: true },
  { group: "C", team: "스코틀랜드", pts: 3, gd: -3, gf: 1, fixed: true },
];

// 미확정 6개 조의 "현재 예측" 3위 (최종전 전 시점 추정치). 사용자가 조정.
const PENDING_DEFAULT: Third[] = [
  { group: "G", team: "벨기에/이란", pts: 2, gd: 0, gf: 2, fixed: false, hint: "이집트 4 / 이란·벨기에 2 / 뉴질랜드 1" },
  { group: "H", team: "우루과이/카보베르데", pts: 2, gd: -1, gf: 2, fixed: false, hint: "스페인 4 / 우루과이·카보베르데 2 / 사우디 1" },
  { group: "I", team: "세네갈/이라크", pts: 3, gd: -2, gf: 2, fixed: false, hint: "프랑스·노르웨이 6 / 세네갈·이라크 0 (3위 자리 맞대결)" },
  { group: "J", team: "알제리/오스트리아", pts: 3, gd: -2, gf: 2, fixed: false, hint: "아르헨티나 6 / 오스트리아·알제리 3 / 요르단 0" },
  { group: "K", team: "콩고DR/우즈벡", pts: 2, gd: -1, gf: 1, fixed: false, hint: "콜롬비아 6 / 포르투갈 4 / 콩고DR·우즈벡 1" },
  { group: "L", team: "크로아티아", pts: 3, gd: -1, gf: 3, fixed: false, hint: "잉글랜드·가나 4 / 크로아티아 3 / 파나마 0" },
];

const ADVANCE_SLOTS = 8; // 3위 중 진출 자리

// FIFA 3위 랭킹 기준: 승점 → 득실차 → 다득점 (그 이하 기준은 단순화)
function rank(teams: Third[]): Third[] {
  return [...teams].sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf,
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export default function Page() {
  const [pending, setPending] = useState<Third[]>(
    PENDING_DEFAULT.map((t) => ({ ...t })),
  );

  const all = useMemo(() => [...FIXED, ...pending], [pending]);
  const sorted = useMemo(() => rank(all), [all]);
  const koreaRank = sorted.findIndex((t) => t.korea) + 1;
  const advancing = koreaRank <= ADVANCE_SLOTS;
  const cushion = ADVANCE_SLOTS - koreaRank; // 양수면 여유, 음수면 부족

  // 잔여 6개 조 중 "한국보다 나은 3위"가 몇 개인지 (응원 가이드용)
  const korea = FIXED.find((t) => t.korea)!;
  const beats = (t: Third) =>
    t.pts > korea.pts ||
    (t.pts === korea.pts && t.gd > korea.gd) ||
    (t.pts === korea.pts && t.gd === korea.gd && t.gf > korea.gf);
  const pendingAhead = pending.filter(beats).length;
  // 확정 4팀(4점)이 이미 앞 → 잔여에서 3팀까지는 추월당해도 8위 안.
  const maxPendingAhead = ADVANCE_SLOTS - 1 - 4; // = 3

  function update(group: string, patch: Partial<Third>) {
    setPending((prev) =>
      prev.map((t) => (t.group === group ? { ...t, ...patch } : t)),
    );
  }

  function preset(kind: "now" | "best" | "worst") {
    if (kind === "now") {
      setPending(PENDING_DEFAULT.map((t) => ({ ...t })));
    } else if (kind === "best") {
      // 잔여 3위가 전부 한국보다 약체 (승점 1, 큰 득실 마이너스)
      setPending((prev) =>
        prev.map((t) => ({ ...t, pts: 1, gd: -3, gf: 1 })),
      );
    } else {
      // 잔여 3위가 전부 한국보다 강함 (승점 4, 플러스 득실)
      setPending((prev) =>
        prev.map((t) => ({ ...t, pts: 4, gd: 1, gf: 4 })),
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pb-20 pt-8 sm:pt-12">
      {/* 헤더 */}
      <header className="mb-6">
        <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
          <span>🇰🇷 2026 월드컵</span>
          <span className="text-border">·</span>
          <span>32강 경우의 수 관제</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          한국, 32강 갈 수 있나
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          한국은 A조 3위(승점 3·득실 -1)로 마감했다. 남은 건{" "}
          <b className="text-foreground">조 3위 12팀 중 상위 8팀</b> 경쟁.
          미확정 6개 조 결과를 바꿔가며 진출 여부를 계산해 보자.
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

      {/* 진출 확정 타임라인 */}
      <ScenarioTimeline />

      {/* 시나리오 프리셋 */}
      <div className="mt-6 mb-3 flex items-center gap-2">
        <span className="text-[13px] font-semibold text-muted-foreground">
          시나리오
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
          <div className="text-[12px] text-muted-foreground">
            승점 → 득실 → 다득점
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border">
          {sorted.map((t, i) => (
            <Row key={t.group} t={t} pos={i + 1} cut={i + 1 === ADVANCE_SLOTS} />
          ))}
        </div>
      </section>

      {/* 응원 가이드 */}
      <Guide pending={pending} beats={beats} max={maxPendingAhead} />

      {/* 출처 / 푸터 */}
      <footer className="mt-12 border-t pt-5 text-[12px] leading-relaxed text-muted-foreground">
        <p>
          기준 스냅샷 <b className="text-foreground/80">2026-06-27</b>. 미확정
          조의 3위 예상치는 추정값이며, 실제 최종전 결과로 직접 바꿔 보면 된다.
          득실·다득점 외의 세부 타이브레이커(공정성 점수 등)는 단순화했다.
        </p>
        <p className="mt-2">
          참고: FIFA 공식 순위표 ·{" "}
          <a
            className="underline-offset-2 hover:underline"
            href="https://www.fifa.com/ko/tournaments/mens/worldcup/canadamexicousa2026/standings"
            target="_blank"
            rel="noreferrer"
          >
            fifa.com
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
      className={`rounded-2xl border p-5 ${
        advancing
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-red-500/30 bg-red-500/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div
            className={`text-[12px] font-bold uppercase tracking-wide ${
              advancing ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {advancing ? "32강 진출권" : "탈락권"}
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight">
            현재 조 3위 <span className="tabular-nums">{rank}</span>위
          </div>
        </div>
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            advancing
              ? "bg-emerald-500/15 text-emerald-600"
              : "bg-red-500/15 text-red-600"
          }`}
        >
          {advancing ? "✓" : "✕"}
        </div>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/80">
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
            잔여 6개 조에서 한국보다 나은 3위가{" "}
            <b>{maxPendingAhead}팀</b>까지면 통과 — 지금은{" "}
            <b>{pendingAhead}팀</b>.
          </>
        ) : (
          <>
            상위 8팀 밖. 잔여 조에서 한국을 추월한 3위가{" "}
            <b>{pendingAhead}팀</b>으로 한계({maxPendingAhead}팀)를 넘었다.
            추월 팀이 줄어야 산다.
          </>
        )}
      </p>
    </div>
  );
}

// ── 진출 확정 타임라인 ─────────────────────────────────────────────────
// 한국은 더 뛸 경기가 없다. 진출은 남은 6개 조 3위 결과로만 갈린다.
// 일정상 1일차(G·H·I) → 최종일(J·K·L). 각 윈도에서 "한국보다 위로 끝난
// 3위 수"만이 변수. 확정 4팀(4점)이 이미 앞 → 잔여 누적 3팀까지는 진출,
// 4팀째가 올라서는 순간 탈락. 왼쪽일수록 빨리 확정된다.
type WVal = "?" | 0 | 1 | 2 | 3;

type ScenarioCard = {
  key: string;
  when: string;
  title: string;
  desc: string;
  tone: "in" | "out";
  k1?: number; // 1일차 한국 위 팀 수 (IN 카드)
  k2max?: number; // 최종일 허용 상한 (IN 카드)
};

const CARDS: ScenarioCard[] = [
  {
    key: "A",
    when: "1일차 즉시",
    title: "⚡ 그날 바로 확정",
    desc: "G·H·I조 3위가 모두 한국보다 아래로 끝남",
    tone: "in",
    k1: 0,
    k2max: 99,
  },
  {
    key: "B",
    when: "최종일",
    title: "여유 확정",
    desc: "1일차 한국 위 1팀 → 최종일 한국 위 2팀 이하",
    tone: "in",
    k1: 1,
    k2max: 2,
  },
  {
    key: "C",
    when: "최종일",
    title: "빠듯한 확정",
    desc: "1일차 한국 위 2팀 → 최종일 한국 위 1팀 이하",
    tone: "in",
    k1: 2,
    k2max: 1,
  },
  {
    key: "D",
    when: "최종일",
    title: "진땀 확정",
    desc: "1일차 한국 위 3팀(전부) → 최종일 한국 위 0팀",
    tone: "in",
    k1: 3,
    k2max: 0,
  },
  {
    key: "E",
    when: "탈락 라인",
    title: "✕ 탈락",
    desc: "한국 위로 끝난 3위가 누적 4팀이 되는 순간",
    tone: "out",
  },
];

function ScenarioTimeline() {
  const [w1, setW1] = useState<WVal>("?");
  const [w2, setW2] = useState<WVal>("?");

  const n1 = w1 === "?" ? null : w1;
  const n2 = w2 === "?" ? null : w2;

  // 전체 상태
  let state: "undecided" | "in" | "out" = "undecided";
  if (n1 === 0) state = "in"; // 1일차 0팀 → 즉시 확정
  else if (n1 !== null && n2 !== null) state = n1 + n2 <= 3 ? "in" : "out";

  // 카드별 상태 계산
  type CardStat = "occurred" | "next" | "possible" | "pruned";
  const maxTotal = (n1 ?? 3) + (n2 ?? 3);

  function evalCard(c: ScenarioCard): { possible: boolean; occurred: boolean } {
    if (c.tone === "out") {
      const occurred = n1 !== null && n2 !== null && n1 + n2 >= 4;
      const possible = maxTotal >= 4; // 아직 탈락이 도달 가능한가
      return { possible, occurred };
    }
    const k1 = c.k1!;
    const k2max = c.k2max!;
    const w1ok = n1 === null || n1 === k1;
    const w2ok = n2 === null || n2 <= k2max;
    const possible = w1ok && w2ok;
    let occurred = false;
    if (c.key === "A") occurred = n1 === 0;
    else occurred = n1 === k1 && n2 !== null && n2 <= k2max;
    return { possible, occurred };
  }

  // 가장 빠른(왼쪽) 아직 가능한 IN 카드 → 현재 노려야 할 경로
  let nextKey: string | null = null;
  if (state === "undecided") {
    for (const c of CARDS) {
      if (c.tone !== "in") continue;
      const { possible, occurred } = evalCard(c);
      if (possible && !occurred) {
        nextKey = c.key;
        break;
      }
    }
  }

  return (
    <section className="mt-6">
      <div className="mb-1 text-[13px] font-semibold">
        진출 확정 타임라인
      </div>
      <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground">
        한국은 더 뛸 경기가 없다. 남은 6개 조 3위 결과로만 갈린다 — 왼쪽일수록
        빨리 확정, 오른쪽일수록 늦게/어렵게. 각 윈도 결과를 넣으면 불가능한
        시나리오가 지워진다.
      </p>

      {/* 결과 입력 */}
      <div className="mb-3 space-y-2 rounded-xl border bg-secondary/30 p-3">
        <SegRow
          label="1일차 · G·H·I"
          hint="한국보다 위로 끝난 3위"
          value={w1}
          onChange={setW1}
        />
        <SegRow
          label="최종일 · J·K·L"
          hint="한국보다 위로 끝난 3위"
          value={w2}
          onChange={setW2}
        />
        {(n1 !== null || n2 !== null) && (
          <button
            onClick={() => {
              setW1("?");
              setW2("?");
            }}
            className="text-[11.5px] text-muted-foreground underline-offset-2 hover:underline"
          >
            결과 초기화
          </button>
        )}
      </div>

      {/* 현재 상태 한 줄 */}
      <div
        className={`mb-3 rounded-lg px-3 py-2 text-[12.5px] font-medium ${
          state === "in"
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : state === "out"
              ? "bg-red-500/10 text-red-700 dark:text-red-400"
              : "bg-secondary text-muted-foreground"
        }`}
      >
        {state === "in"
          ? "✓ 32강 진출 확정 — 더 추월 불가"
          : state === "out"
            ? "✕ 탈락 확정 — 한국 위로 4팀"
            : nextKey
              ? `현재 가장 빠른 길: ${
                  CARDS.find((c) => c.key === nextKey)!.when
                } 확정 가능`
              : "결과를 입력하면 가능한 시나리오만 남는다"}
      </div>

      {/* 카드 시퀀스 (왼→오: 빠름→늦음/탈락) */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {CARDS.map((c) => {
          const { possible, occurred } = evalCard(c);
          let stat: CardStat = "possible";
          if (occurred) stat = "occurred";
          else if (!possible) stat = "pruned";
          else if (c.key === nextKey) stat = "next";
          return <TimelineCard key={c.key} c={c} stat={stat} />;
        })}
      </div>
    </section>
  );
}

function SegRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: WVal;
  onChange: (v: WVal) => void;
}) {
  const opts: WVal[] = ["?", 0, 1, 2, 3];
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-[12px] font-semibold">{label}</span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
      <div className="ml-auto flex gap-1">
        {opts.map((o) => (
          <button
            key={String(o)}
            onClick={() => onChange(o)}
            className={`h-6 min-w-7 rounded-md px-1.5 text-[12px] font-semibold tabular-nums transition-colors ${
              value === o
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-accent"
            }`}
          >
            {o === "?" ? "미정" : o}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimelineCard({
  c,
  stat,
}: {
  c: ScenarioCard;
  stat: "occurred" | "next" | "possible" | "pruned";
}) {
  const isOut = c.tone === "out";
  const base =
    "shrink-0 w-[150px] rounded-xl border p-3 transition-all select-none";
  const cls =
    stat === "pruned"
      ? "opacity-35 grayscale border-border bg-card"
      : stat === "occurred"
        ? isOut
          ? "border-red-500/50 bg-red-500/10 ring-2 ring-red-500/30"
          : "border-emerald-500/50 bg-emerald-500/10 ring-2 ring-emerald-500/30"
        : stat === "next"
          ? "border-emerald-500/40 bg-emerald-500/[0.06] ring-1 ring-emerald-500/30"
          : isOut
            ? "border-red-500/25 bg-red-500/[0.03]"
            : "border-border bg-card";
  return (
    <div className={`${base} ${cls}`}>
      <div
        className={`text-[10.5px] font-bold uppercase tracking-wide ${
          isOut ? "text-red-500" : "text-emerald-600"
        }`}
      >
        {c.when}
      </div>
      <div className="mt-0.5 text-[14px] font-bold tracking-tight">
        {c.title}
      </div>
      <div className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">
        {c.desc}
      </div>
      {stat === "occurred" && (
        <div className="mt-2 text-[10.5px] font-semibold">
          {isOut ? "현재 시나리오" : "확정"}
        </div>
      )}
      {stat === "next" && (
        <div className="mt-2 text-[10.5px] font-semibold text-emerald-600">
          가장 빠른 길
        </div>
      )}
      {stat === "pruned" && (
        <div className="mt-2 text-[10.5px] font-semibold text-muted-foreground">
          불가능
        </div>
      )}
    </div>
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
      className="rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors hover:bg-accent active:scale-[0.97]"
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
      className={`rounded-xl border p-3 ${
        ahead ? "border-red-500/30 bg-red-500/[0.04]" : "bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-secondary px-1 text-[11px] font-bold">
            {t.group}
          </span>
          <span className="text-[13px] font-semibold">{t.team}</span>
        </div>
        {ahead ? (
          <span className="text-[11px] font-semibold text-red-600">
            한국 추월
          </span>
        ) : (
          <span className="text-[11px] font-medium text-emerald-600">
            한국 아래
          </span>
        )}
      </div>
      {t.hint && (
        <div className="mt-1 truncate text-[11px] text-muted-foreground">
          {t.hint}
        </div>
      )}
      <div className="mt-2.5 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="w-9 text-[11px] font-medium text-muted-foreground">
            승점
          </span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((p) => (
              <button
                key={p}
                onClick={() => onPts(p)}
                className={`h-6 w-6 rounded-md text-[12px] font-semibold tabular-nums transition-colors ${
                  t.pts === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-accent"
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
      <span className="w-9 text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(value - 1)}
          className="h-6 w-6 rounded-md bg-secondary text-[13px] font-bold text-muted-foreground hover:bg-accent"
        >
          −
        </button>
        <span className="w-7 text-center text-[12.5px] font-semibold tabular-nums">
          {signed && value > 0 ? `+${value}` : value}
        </span>
        <button
          onClick={() => onChange(value + 1)}
          className="h-6 w-6 rounded-md bg-secondary text-[13px] font-bold text-muted-foreground hover:bg-accent"
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
          ? "bg-emerald-500/10 font-semibold"
          : pos % 2 === 0
            ? "bg-secondary/30"
            : ""
      } ${cut ? "border-b-2 border-dashed border-red-400/50" : "border-b border-border/60 last:border-0"}`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-bold tabular-nums ${
          inZone
            ? "bg-emerald-500/15 text-emerald-600"
            : "bg-red-500/10 text-red-500"
        }`}
      >
        {pos}
      </span>
      <span className="flex h-5 min-w-5 items-center justify-center rounded bg-secondary px-1 text-[10px] font-bold text-muted-foreground">
        {t.group}
      </span>
      <span className="flex-1 truncate">
        {t.team}
        {t.korea && <span className="ml-1">🇰🇷</span>}
        {!t.fixed && (
          <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
            예상
          </span>
        )}
      </span>
      <span className="w-8 text-right font-semibold tabular-nums">{t.pts}</span>
      <span className="w-9 text-right tabular-nums text-muted-foreground">
        {t.gd > 0 ? `+${t.gd}` : t.gd}
      </span>
      <span className="w-6 text-right tabular-nums text-muted-foreground">
        {t.gf}
      </span>
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
    <section className="mt-7 rounded-xl border bg-secondary/30 p-4">
      <div className="text-[13px] font-semibold">응원 가이드</div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        한국이 사는 길은 잔여 G~L조에서 <b className="text-foreground">3위가
        약하게</b> 나오는 것 — 승점이 적거나 득실이 나쁜 3위.{" "}
        {ahead.length === 0 ? (
          <>
            지금 설정에선 한국을 추월하는 조가 <b>없다</b>. 더할 나위 없음.
          </>
        ) : (
          <>
            지금은{" "}
            <b className="text-red-600">
              {ahead.map((t) => `${t.group}조(${t.team})`).join(", ")}
            </b>
            가 한국을 추월 중. {max}팀까지는 버틴다.
          </>
        )}
      </p>
    </section>
  );
}
