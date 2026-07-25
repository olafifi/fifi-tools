import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LabClock } from './LabClock';

describe('LabClock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders local 24-hour time and advances on the next second boundary', () => {
    vi.setSystemTime(new Date(2026, 6, 26, 14, 8, 9, 250));
    render(<LabClock />);

    expect(screen.getByLabelText('本地时间')).toHaveTextContent('14:08:09');
    expect(screen.getByLabelText('今天日期')).toHaveTextContent('2026年7月26日 · 星期日');

    act(() => vi.advanceTimersByTime(750));
    expect(screen.getByLabelText('本地时间')).toHaveTextContent('14:08:10');
  });
});
