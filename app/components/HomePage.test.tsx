import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GAMES } from '../data/catalog';
import { GameStation } from './GameStation';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses the approved FIFI Lab site brand and slogan', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: /FIFI Lab/ })).toBeInTheDocument();
    expect(screen.getByText('菲菲实验站')).toBeInTheDocument();
    expect(screen.getByText('一些能让生活省点力气的小实验。')).toBeInTheDocument();
  });

  it('shows both production tools and five games', () => {
    render(<HomePage />);

    expect(screen.getByRole('link', { name: /FiFi 图片处理工具/ })).toHaveAttribute(
      'href',
      'https://olafifi.github.io/ui-image-processor/'
    );
    expect(screen.getByRole('link', { name: /FiFi 富文本转换/ })).toHaveAttribute(
      'href',
      'https://olafifi.github.io/rich-text-translator/'
    );
    for (const name of ['2048', '数独', '俄罗斯方块', '贪吃蛇', '合成大蛋白']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.queryByText('三消')).not.toBeInTheDocument();
  });

  it('tracks total and completed todo items and caps the list at eight', async () => {
    render(<HomePage />);

    const toggle = screen.getByRole('button', { name: '拉开 To-Do List' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('我有 3 条待办 · 0 条完成')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '待办内容' })).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: '收回 To-Do List' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    await userEvent.click(screen.getAllByRole('button', { name: '标记为已完成' })[0]);
    expect(screen.getByText('我有 3 条待办 · 1 条完成')).toBeInTheDocument();

    const add = screen.getByRole('button', { name: '新增任务' });
    for (let i = 0; i < 5; i += 1) await userEvent.click(add);

    expect(screen.getByText('我有 8 条待办 · 1 条完成')).toBeInTheDocument();
    expect(add).toBeDisabled();
    expect(screen.getAllByRole('textbox', { name: '待办内容' })).toHaveLength(8);
  });

  it('passes the selected game to the host', async () => {
    const onOpenGame = vi.fn();
    render(<GameStation onOpenGame={onOpenGame} />);

    await userEvent.click(screen.getByRole('button', { name: '合成大蛋白' }));
    expect(onOpenGame).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'merge-danbai' })
    );
  });

  it('opens one labelled game dialog and restores focus on close', async () => {
    render(<HomePage />);
    const trigger = screen.getByRole('button', { name: '2048' });

    await userEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: '2048' })).toBeInTheDocument();
    const frame = screen.getByTitle('2048 游戏区域');
    const gameUrl = new URL(frame.getAttribute('src')!, window.location.origin);
    expect(gameUrl.pathname).toBe('/games/2048/index.html');
    const revision = gameUrl.searchParams.get('v');
    expect(revision).not.toBeNull();
    if (revision) expect(revision).toMatch(/^[a-z0-9-]+$/);

    await userEvent.click(screen.getByRole('button', { name: '关闭 2048' }));

    expect(screen.queryByRole('dialog', { name: '2048' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('waits for the selected game to be ready before enabling restart', async () => {
    render(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: '2048' }));

    const frame = screen.getByTitle('2048 游戏区域') as HTMLIFrameElement;
    const postMessage = vi.spyOn(frame.contentWindow!, 'postMessage');
    vi.spyOn(frame.contentWindow!, 'focus').mockImplementation(() => undefined);
    const restart = screen.getByRole('button', { name: '重新开始 2048' });
    expect(restart).toBeDisabled();

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { source: 'fifi-game', type: 'ready', gameId: '2048' },
        origin: window.location.origin,
        source: frame.contentWindow
      }));
    });

    expect(restart).toBeEnabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(postMessage).toHaveBeenCalledWith(
      { source: 'fifi-tools', type: 'focus' },
      window.location.origin
    );
  });

  it('uses one approved window size for every game', () => {
    for (const game of GAMES) {
      expect(game.preferredWidth).toBe(820);
      expect(game.preferredHeight).toBe(760);
    }
  });

  it('shows a useful retry action when a game cannot load', () => {
    vi.useFakeTimers();
    try {
      render(<HomePage />);
      fireEvent.click(screen.getByRole('button', { name: '2048' }));

      act(() => vi.advanceTimersByTime(8000));

      expect(screen.getByRole('alert')).toHaveTextContent('游戏没有成功加载');
      fireEvent.click(screen.getByRole('button', { name: '重新加载 2048' }));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '重新开始 2048' })).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('starts a fresh loading session when the same game is reopened', async () => {
    render(<HomePage />);
    const trigger = screen.getByRole('button', { name: '2048' });
    await userEvent.click(trigger);

    const firstFrame = screen.getByTitle('2048 游戏区域') as HTMLIFrameElement;
    vi.spyOn(firstFrame.contentWindow!, 'focus').mockImplementation(() => undefined);
    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { source: 'fifi-game', type: 'ready', gameId: '2048' },
        origin: window.location.origin,
        source: firstFrame.contentWindow
      }));
    });
    expect(screen.getByRole('button', { name: '重新开始 2048' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: '关闭 2048' }));
    await userEvent.click(trigger);

    expect(screen.getByRole('button', { name: '重新开始 2048' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('蛋白正在准备游戏');
  });
});
