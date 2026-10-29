import assert from 'node:assert/strict';
import { splitEsliteTitle } from './sources/eslite.mjs';

const cases = [
  ['變形卡夫卡 Franz', { zh: '變形卡夫卡', en: 'Franz' }],
  ['進擊的鼓手 4K重映 Whiplash', { zh: '進擊的鼓手 4K重映', en: 'Whiplash' }],
  ['東尼瀧谷:4K數位修復版－早安！周日經典電影院 Tony Takitani', {
    zh: '東尼瀧谷:4K數位修復版－早安！周日經典電影院',
    en: 'Tony Takitani'
  }],
  ['歐威爾:2+2=5 Orwell: 2+2=5', { zh: '歐威爾:2+2=5', en: 'Orwell: 2+2=5' }],
  ['(法) Jim Queen：肌情四射 Jim Queen', { zh: '(法) Jim Queen：肌情四射', en: 'Jim Queen' }],
  ['幸福路上 On Happiness Road', { zh: '幸福路上', en: 'On Happiness Road' }],
  ['只有中文片名', { zh: '只有中文片名', en: null }]
];

for (const [input, expected] of cases) {
  assert.deepEqual(splitEsliteTitle(input), expected, input);
}

console.log(`Eslite title split regression: ${cases.length} cases passed`);
