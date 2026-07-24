import { HttpError } from './errors.js';

const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
const forbidden = /[<>\p{Cc}]/u;
const invisible = /[\p{Cf}\p{Default_Ignorable_Code_Point}]/u;
const rgiEmoji = /^\p{RGI_Emoji}$/v;

export function normalizeNickname(input) {
  if (typeof input !== 'string') throw new HttpError(400, '请输入名字。');
  const nickname = input.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  const length = [...segmenter.segment(nickname)].length;
  if (length < 1 || length > 12) {
    throw new HttpError(400, '名字需要是 1–12 个字符。');
  }
  if (forbidden.test(nickname)) {
    throw new HttpError(400, '名字里不能包含控制字符或网页标签符号。');
  }
  for (const { segment } of segmenter.segment(nickname)) {
    if (invisible.test(segment) && !rgiEmoji.test(segment)) {
      throw new HttpError(400, '名字里不能包含不可见字符。');
    }
  }
  return { nickname, nicknameKey: nickname.toLocaleLowerCase('zh-CN') };
}
