import { TOOLS } from '../data/catalog';

export function ToolGrid() {
  return (
    <section className="tool-grid" id="tools" aria-label="Fifi 网页工具">
      {TOOLS.map((tool) => (
        <a className={`tool-card tool-card--${tool.accent}`} href={tool.href} key={tool.id}>
          <span className="project-no">{tool.projectNo}</span>
          <img src={tool.mascotAsset} alt={`${tool.name} 的蛋白头像`} />
          <h2>{tool.name}</h2>
          <p>{tool.description}</p>
          <div className="tag-list" aria-label="功能标签">
            {tool.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <strong>打开工具 <span aria-hidden="true">→</span></strong>
        </a>
      ))}
    </section>
  );
}
