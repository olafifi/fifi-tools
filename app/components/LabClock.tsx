import { useEffect, useState } from 'react';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const pad = (value: number) => String(value).padStart(2, '0');
const SEGMENTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

function clockParts(now: Date) {
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const isoDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const dateLabel = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · ${WEEKDAYS[now.getDay()]}`;
  return { time, isoDate, dateLabel };
}

export function LabClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      const delay = 1000 - new Date().getMilliseconds();
      timer = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, delay);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  const { time, isoDate, dateLabel } = clockParts(now);
  return (
    <section className="lab-clock" aria-label="FIFI Lab 数字时钟">
      <span className="lab-clock__tag" aria-hidden="true">LOCAL / 24H</span>
      <time aria-label="本地时间" className="lab-clock__time" dateTime={time}>
        <span className="visually-hidden">{time}</span>
        <span className="lab-clock__display" aria-hidden="true">
          {time.split('').map((character, index) => character === ':' ? (
            <span className="lab-clock__colon" key={`colon-${index}`} />
          ) : (
            <span className={`lab-clock__digit digit-${character}`} data-testid="clock-digit" key={`digit-${index}`}>
              {SEGMENTS.map((segment) => <i className={`segment segment--${segment}`} key={segment} />)}
            </span>
          ))}
        </span>
      </time>
      <time aria-label="今天日期" className="lab-clock__date" dateTime={isoDate}>{dateLabel}</time>
    </section>
  );
}
