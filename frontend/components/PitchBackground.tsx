// 저작권 걱정 없는 자체 CSS 축구 배경. 잔디 스트라이프가 천천히 흐르고
// 공(이모지)이 굴러간다. prefers-reduced-motion이면 정지. 모두 fixed 레이어로
// 콘텐츠(z-10) 뒤에 깔린다.

const BALLS = [
  { top: "10%", size: 36, dur: 19, delay: 0, op: 0.1 },
  { top: "28%", size: 22, dur: 27, delay: -6, op: 0.08 },
  { top: "46%", size: 52, dur: 23, delay: -13, op: 0.09 },
  { top: "64%", size: 18, dur: 31, delay: -3, op: 0.07 },
  { top: "80%", size: 30, dur: 21, delay: -16, op: 0.1 },
  { top: "92%", size: 26, dur: 25, delay: -9, op: 0.08 },
];

export function PitchBackground() {
  return (
    <>
      <div
        aria-hidden
        className="pitch-anim fixed inset-0 z-0 overflow-hidden"
      >
        {/* 스타디움 그린 베이스 + 스포트라이트 */}
        <div className="pitch-base absolute inset-0" />
        {/* 잔디 줄무늬 (흐름) */}
        <div className="pitch-stripes absolute inset-0" />
        {/* 센터서클 / 하프라인 */}
        <svg
          className="absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
          viewBox="0 0 100 100"
          fill="none"
          stroke="white"
          strokeWidth="0.4"
        >
          <line x1="0" y1="50" x2="100" y2="50" />
          <circle cx="50" cy="50" r="13" />
          <circle cx="50" cy="50" r="0.8" fill="white" stroke="none" />
        </svg>
        {/* 굴러가는 공 */}
        {BALLS.map((b, i) => (
          <span
            key={i}
            className="pitch-ball absolute left-0 select-none"
            style={{
              top: b.top,
              fontSize: b.size,
              opacity: b.op,
              animationDuration: `${b.dur}s`,
              animationDelay: `${b.delay}s`,
            }}
          >
            ⚽
          </span>
        ))}
      </div>
      {/* 가독성 스크림 (테마색 반투명) */}
      <div aria-hidden className="fixed inset-0 z-0 bg-background/72" />
    </>
  );
}
