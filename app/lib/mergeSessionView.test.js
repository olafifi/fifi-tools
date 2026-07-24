import { beforeEach, describe, expect, it } from 'vitest';
import { applyGameOverView, resetGameOverView } from '../../public/games/merge-danbai/session-view.js';

function setup() {
  document.body.innerHTML = `
    <div data-guide></div><div data-panel hidden></div>
    <strong data-score></strong><p data-status></p>`;
  return {
    guide: document.querySelector('[data-guide]'),
    panel: document.querySelector('[data-panel]'),
    finalScore: document.querySelector('[data-score]'),
    status: document.querySelector('[data-status]')
  };
}

describe('merge session view', () => {
  beforeEach(() => document.body.replaceChildren());

  it('shows a frozen final score and hides the drop guide', () => {
    const nodes = setup();
    applyGameOverView(nodes, 9000);
    expect(nodes.guide.hidden).toBe(true);
    expect(nodes.panel.hidden).toBe(false);
    expect(nodes.finalScore).toHaveTextContent('9000');
    expect(nodes.status).toHaveTextContent('本局结束');
  });

  it('restores the ready view for a new run', () => {
    const nodes = setup();
    applyGameOverView(nodes, 9000);
    resetGameOverView(nodes);
    expect(nodes.guide.hidden).toBe(false);
    expect(nodes.panel.hidden).toBe(true);
    expect(nodes.status).toHaveTextContent('移动蛋白');
  });
});
