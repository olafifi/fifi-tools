import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { TOOLS } from '../data/catalog';

export function ToolGrid() {
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
              href={tool.transitionPath}
              key={tool.id}
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
    </section>
  );
}
