import { resolveTool } from './open-tool-config.js';

const tool = resolveTool(new URLSearchParams(window.location.search).get('tool'));
const root = document.documentElement;

if (!tool) {
  root.dataset.state = 'error';
  document.title = '没有找到这个工具 · FIFI Lab';
} else {
  document.querySelectorAll('[data-tool-name]').forEach((node) => {
    node.textContent = tool.name;
  });
  const fallbackLink = document.querySelector('[data-fallback-link]');
  if (fallbackLink instanceof HTMLAnchorElement) fallbackLink.href = tool.href;
  document.title = `正在打开 ${tool.name} · FIFI Lab`;
  root.dataset.state = 'traveling';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.dataset.motion = reduced ? 'reduced' : 'full';
  window.setTimeout(() => window.location.replace(tool.href), reduced ? 820 : 1500);
}
