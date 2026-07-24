export function AboutFifi() {
  return (
    <>
      <section className="next-experiment" aria-label="下一项实验">
        <div>
          <span className="eyebrow">NEXT EXPERIMENT</span>
          <h2>下一件顺手的小工具，正在路上。</h2>
          <p>这里会慢慢长大。想到什么好用的小玩意，就做一个放进来。</p>
        </div>
        <img src={`${import.meta.env.BASE_URL}danbai/expect.png`} alt="期待新工具的蛋白" />
      </section>
      <section className="about-fifi" id="about">
        <div>
          <span className="eyebrow">ABOUT FIFI</span>
          <h2>把真实需求，做成打开就能用的小东西。</h2>
        </div>
        <a href="https://github.com/olafifi">去 GitHub 看看 <span aria-hidden="true">↗</span></a>
      </section>
    </>
  );
}
