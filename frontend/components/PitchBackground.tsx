// 실사 배경 영상 (야간 경기장). 저작권 free — Pexels License(상업적 사용·
// 무출처 허용). 자동재생 무한루프 무음, 콘텐츠(z-10) 뒤 fixed 레이어.
// 로드 시 검은 화면에서 페이드인 + 느린 줌으로 '경기 시작 인트로' 느낌.

export function PitchBackground() {
  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden bg-black">
      <video
        className="stadium-video absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/stadium-poster.jpg"
      >
        <source src="/stadium-bg.mp4" type="video/mp4" />
      </video>

      {/* 가독성 + 시네마틱 스크림 */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/60 to-black/85" />
      <div className="absolute inset-0 [background:radial-gradient(120%_90%_at_50%_30%,transparent_30%,rgba(0,0,0,0.55)_100%)]" />

      {/* 1회성 인트로: 검은 화면에서 페이드아웃 */}
      <div className="stadium-intro pointer-events-none absolute inset-0 bg-black" />
    </div>
  );
}
