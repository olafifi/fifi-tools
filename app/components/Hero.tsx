export function Hero() {
  return (
    <header className="hero" id="top">
      <div className="hero-copy">
        <span className="eyebrow">FIFI LAB · WEB EXPERIMENTS</span>
        <h1>一些能让生活<br />省点力气的小实验。</h1>
        <p>我把自己用得上的网页工具做出来，也分享给碰巧需要它们的人。</p>
        <span className="free-sticker">全部免费 · 打开即用</span>
      </div>
      <div className="hero-mascot" aria-label="蛋白站长在这里欢迎你">
        <span className="tape" aria-hidden="true" />
        <img src={`${import.meta.env.BASE_URL}danbai/doge.png`} alt="蛋白站长" />
        <small>今日值班：蛋白</small>
      </div>
    </header>
  );
}
