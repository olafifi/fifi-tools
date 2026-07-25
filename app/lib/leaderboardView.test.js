import { beforeEach, describe, expect, it } from 'vitest';
import { createLeaderboardView } from '../../public/games/merge-danbai/leaderboard-view.js';

function setup() {
  document.body.innerHTML = `
    <div data-status></div><ol data-list></ol>
    <button data-retry hidden></button>
    <form data-form hidden><input data-input><button data-submit></button><div data-submit-status></div></form>`;
  return createLeaderboardView({
    status: document.querySelector('[data-status]'),
    list: document.querySelector('[data-list]'),
    form: document.querySelector('[data-form]'),
    input: document.querySelector('[data-input]'),
    submit: document.querySelector('[data-submit]'),
    submitStatus: document.querySelector('[data-submit-status]'),
    retry: document.querySelector('[data-retry]')
  });
}

describe('leaderboard view', () => {
  beforeEach(() => document.body.replaceChildren());

  it('renders nicknames as text instead of markup', () => {
    const view = setup();
    view.render([{ rank: 1, nickname: '<img src=x>', score: 99 }]);
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('[data-list]')).toHaveTextContent('<img src=x>');
  });

  it('shows the form only for a qualifying score', () => {
    const view = setup();
    expect(view.showQualification({ available: true, entryCount: 10, cutoffScore: 100, score: 99 })).toBe(false);
    expect(view.showQualification({ available: true, entryCount: 10, cutoffScore: 100, score: 100 })).toBe(true);
  });

  it('keeps retry information visible across pending, failure, and concurrent rank loss', () => {
    const view = setup();
    view.setSubmitPending(true);
    expect(document.querySelector('[data-submit]')).toBeDisabled();
    view.setSubmitError('请重试');
    expect(document.querySelector('[data-input]')).toBeEnabled();
    expect(document.querySelector('[data-submit]')).toBeEnabled();
    expect(document.querySelector('[data-submit-status]')).toHaveTextContent('请重试');
    view.setSubmitResult(12);
    expect(document.querySelector('[data-submit-status]')).toHaveTextContent('暂未进入前 10');
  });

  it('keeps controls locked after a successful submission', () => {
    const view = setup();
    view.setSubmitPending(true);
    view.setSubmitResult(3);
    expect(document.querySelector('[data-input]')).toBeDisabled();
    expect(document.querySelector('[data-submit]')).toBeDisabled();
    expect(document.querySelector('[data-submit-status]')).toHaveTextContent('第 3 名');
  });

  it('resets submission controls for a new game', () => {
    const view = setup();
    view.setSubmitPending(true);
    view.setSubmitResult(3);
    view.resetSubmission();
    expect(document.querySelector('[data-input]')).toBeEnabled();
    expect(document.querySelector('[data-submit]')).toBeEnabled();
    expect(document.querySelector('[data-submit-status]')).toHaveTextContent('');
  });

  it('shows a successful top-ten rank after submission', () => {
    const view = setup();
    view.showQualification({ available: true, entryCount: 10, cutoffScore: 100, score: 9000 });
    view.setSubmitResult(10);
    expect(document.querySelector('[data-submit-status]')).toHaveTextContent('第 10 名');
  });

  it('hides qualification when the service is unavailable', () => {
    const view = setup();
    view.showQualification({ available: true, entryCount: 0, cutoffScore: 0, score: 10 });
    view.setUnavailable();
    expect(document.querySelector('[data-form]').hidden).toBe(true);
    expect(document.querySelector('[data-retry]').hidden).toBe(false);
    expect(document.querySelector('[data-status]')).toHaveTextContent('游戏仍然可以继续');
  });

  it('hides retry while loading and when the service is not configured', () => {
    const view = setup();
    view.setUnavailable(false);
    expect(document.querySelector('[data-retry]').hidden).toBe(true);
    view.setUnavailable();
    view.setLoading();
    expect(document.querySelector('[data-retry]').hidden).toBe(true);
  });
});
