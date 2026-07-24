import { describe, expect, it } from 'vitest';
import { normalizeNickname } from '../src/nickname.js';

it('normalizes spacing, width, and Latin case for the comparison key', () => {
  expect(normalizeNickname('  ＦｉＦｉ  ')).toEqual({
    nickname: 'FiFi',
    nicknameKey: 'fifi'
  });
});

it('accepts Chinese and emoji within twelve visible characters', () => {
  expect(normalizeNickname('蛋白王🐱')).toEqual({
    nickname: '蛋白王🐱',
    nicknameKey: '蛋白王🐱'
  });
});

describe.each([
  '',
  '   ',
  '<猫>',
  '猫\u0000',
  '\u0085',
  '\u200B',
  '\uFE0F',
  '\u034F',
  '\u180B',
  '\u202E蛋白',
  '蛋\u2066白',
  '1234567890123',
  null
])('invalid nickname %j', (value) => {
  it('throws a 400 validation error', () => {
    expect(() => normalizeNickname(value)).toThrow(expect.objectContaining({ status: 400 }));
  });
});

it('allows the zero-width joiner only as part of an emoji grapheme', () => {
  expect(normalizeNickname('程序员👨‍💻')).toEqual({
    nickname: '程序员👨‍💻',
    nicknameKey: '程序员👨‍💻'
  });
  expect(normalizeNickname('爱心❤️')).toEqual({
    nickname: '爱心❤️',
    nicknameKey: '爱心❤️'
  });
  expect(() => normalizeNickname('蛋‍白')).toThrow(expect.objectContaining({ status: 400 }));
});
