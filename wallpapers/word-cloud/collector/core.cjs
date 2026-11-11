'use strict';
const STOP = new Set('的 了 是 在 和 与 及 或 而 也 就 都 很 啊 呢 吗 吧 哦 嗯 一个 这个 那个 这些 那些 我 你 他 她 它 我们 你们 他们 the a an and or to of in is are it for on with'.split(' '));
const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
function inserted(before, after) {
  let start = 0, end = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  while (end < before.length - start && end < after.length - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
  return after.slice(start, after.length - end);
}
function tokenize(text) {
  return [...segmenter.segment(text.normalize('NFKC').toLowerCase())]
    .filter(x => x.isWordLike).map(x => x.segment)
    .filter(w => w.length <= 24 && !/^\d+$/.test(w) && !STOP.has(w));
}
class Tracker {
  constructor(onText) { this.onText = onText; this.reset(); }
  reset() { this.id = null; this.base = ''; this.latest = ''; this.changedAt = 0; }
  sample(sample, now = Date.now()) {
    if (!sample.supported || typeof sample.text !== 'string' || sample.text.length > 32768) { this.reset(); return; }
    if (sample.id !== this.id) {
      // Existing content on focus is a baseline, never historical input.
      this.id = sample.id; this.base = this.latest = sample.text; this.changedAt = now; return;
    }
    if (sample.text !== this.latest) { this.latest = sample.text; this.changedAt = now; return; }
    if (this.latest !== this.base && now - this.changedAt >= 900) {
      const delta = inserted(this.base, this.latest);
      this.base = this.latest;
      if (delta) this.onText(delta);
    }
  }
}
module.exports = { Tracker, tokenize, inserted };
