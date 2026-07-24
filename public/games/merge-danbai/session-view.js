export function applyGameOverView({ guide, panel, finalScore, status }, score) {
  guide.hidden = true;
  panel.hidden = false;
  finalScore.textContent = String(score);
  status.textContent = '本局结束，可以直接再来一局。';
}

export function resetGameOverView({ guide, panel, finalScore, status }) {
  guide.hidden = false;
  panel.hidden = true;
  finalScore.textContent = '0';
  status.textContent = '移动蛋白，点击或轻触投放。两个相同蛋白会合成。';
}
