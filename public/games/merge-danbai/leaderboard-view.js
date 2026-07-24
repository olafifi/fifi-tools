export function createLeaderboardView({ status, list, form, input, submit, submitStatus, retry }) {
  return {
    render(entries) {
      list.replaceChildren(...entries.map((entry) => {
        const item = document.createElement('li');
        const rank = document.createElement('span');
        const name = document.createElement('span');
        const points = document.createElement('strong');
        rank.textContent = String(entry.rank);
        name.textContent = entry.nickname;
        points.textContent = String(entry.score);
        item.append(rank, name, points);
        return item;
      }));
    },
    setLoading() {
      status.textContent = '排行榜加载中…';
      retry.hidden = true;
    },
    setReady() {
      status.textContent = '';
      retry.hidden = true;
    },
    setUnavailable(retryable = true) {
      status.textContent = '排行榜暂时休息，游戏仍然可以继续。';
      form.hidden = true;
      retry.hidden = !retryable;
    },
    showQualification({ available, entryCount, cutoffScore, score }) {
      const qualifies = available && (entryCount < 10 || score >= cutoffScore);
      form.hidden = !qualifies;
      return qualifies;
    },
    setSubmitPending(pending) {
      submit.disabled = pending;
      input.disabled = pending;
      if (pending) submitStatus.textContent = '正在提交…';
    },
    setSubmitError(message) {
      submit.disabled = false;
      input.disabled = false;
      submitStatus.textContent = message;
    },
    setSubmitResult(rank) {
      submit.disabled = false;
      input.disabled = false;
      submitStatus.textContent = rank <= 10
        ? `已进入第 ${rank} 名！`
        : '成绩已记录，本次暂未进入前 10。';
    }
  };
}
