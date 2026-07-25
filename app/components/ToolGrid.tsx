import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { useState } from 'react';
import { TOOLS } from '../data/catalog';

function transitionPage(name: string, image: string, href: string, tone: string) {
  const safeName = name.replace(/[<>&"']/g, '');
  const safeImage = JSON.stringify(image);
  const safeHref = JSON.stringify(href);
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeName}</title><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${tone};font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif}.target{position:fixed;inset:0;width:100%;height:100%;border:0;background:${tone};opacity:0;transition:opacity .48s ease}.veil{position:fixed;z-index:2;inset:0;display:grid;place-items:center;background:${tone};transition:opacity .52s ease,filter .52s ease}.shot{width:min(340px,72vw);height:220px;object-fit:cover;object-position:center 62%;border:4px solid #090806;border-radius:18px;box-shadow:12px 12px 0 #090806,18px 18px 0 #a43828;animation:expand .9s cubic-bezier(.18,.78,.18,1) forwards;transition:opacity .52s ease,filter .52s ease,transform .52s ease}.label{position:fixed;z-index:3;left:50%;bottom:6vh;transform:translateX(-50%);padding:8px 11px;border:2px solid #171411;background:#efe3c9;color:#171411;font-size:15px;font-weight:1000;white-space:nowrap;transition:opacity .32s ease}.ready .target{opacity:1}.ready .veil{opacity:0;filter:blur(10px);pointer-events:none}.ready .shot{opacity:0;filter:blur(12px);transform:scale(1.025)}.ready .label{opacity:0}@keyframes expand{0%{width:min(340px,72vw);height:220px;border-radius:18px}72%{width:min(1120px,88vw);height:min(720px,82vh);border-radius:13px}100%{width:min(1240px,94vw);height:min(790px,90vh);border-radius:8px;filter:saturate(.82) brightness(.94)}}@media(prefers-reduced-motion:reduce){.shot{width:94vw;height:90vh;animation:none}.veil,.target,.shot{transition-duration:.18s}}</style></head><body><iframe class="target" src=${safeHref} title="${safeName}" onload="setTimeout(()=>document.body.classList.add('ready'),760)"></iframe><div class="veil"><img class="shot" src=${safeImage} alt=""></div><div class="label">${safeName} · 正在展开工作区</div></div></body></html>`;
}

export function ToolGrid() {
  const [blocked, setBlocked] = useState(false);

  const track = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.classList.add('is-tracking');
    card.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
    card.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
    card.style.setProperty('--scan-x', `${Math.round((x + 0.5) * (rect.width + 150))}px`);
  };

  const openTool = (event: ReactMouseEvent<HTMLAnchorElement>, tool: typeof TOOLS[number]) => {
    const tab = window.open('about:blank', '_blank');
    if (!tab) {
      event.preventDefault();
      setBlocked(true);
      window.setTimeout(() => setBlocked(false), 2600);
      return;
    }
    event.preventDefault();
    tab.opener = null;
    tab.document.open();
    tab.document.write(transitionPage(
      tool.name,
      new URL(tool.thumbnailAsset, window.location.href).href,
      tool.href,
      tool.id === 'rich-text' ? '#f1f3ff' : '#e7ece4'
    ));
    tab.document.close();
  };

  return (
    <section className="tool-cluster" id="tools" aria-label="FIFI Lab 网页工具">
      <div className="section-label"><span>TOOLS / REAL PREVIEW</span></div>
      <div className="tool-grid">
        {TOOLS.map((tool) => {
          const title = tool.id === 'image-processor'
            ? <><span>FiFi 图片</span><span>处理工具</span></>
            : <><span>FiFi 富文本</span><span>转换</span></>;
          return (
            <a
              aria-label={tool.name}
              className={`tool-card tool-card--${tool.accent}`}
              href={tool.href}
              key={tool.id}
              onClick={(event) => openTool(event, tool)}
              onMouseLeave={(event) => event.currentTarget.classList.remove('is-tracking')}
              onMouseMove={track}
              rel="noopener noreferrer"
              style={{ '--tool-edge': tool.accent === 'red' ? '#a43828' : '#376b61' } as CSSProperties}
              target="_blank"
            >
              <span className="tool-thumb"><img src={tool.thumbnailAsset} alt={`${tool.name}网页缩略图`} /></span>
              <span className="tool-title"><b>{title}</b><i aria-hidden="true">↗</i></span>
            </a>
          );
        })}
      </div>
      {blocked && (
        <div className="tool-toast show" role="status">
          浏览器阻止了新标签页，请允许弹出窗口后重试。
        </div>
      )}
    </section>
  );
}
