(function (scope) {
  'use strict';
  function number(value) {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  function round(n) { return Math.round((n + Number.EPSILON) * 10000) / 10000; }
  function evaluate(config, data = {}) {
    const value = number(data.value);
    if (value === null) return { valid: false, score: 0, reason: '请先填写本项内容' };
    if (config.type === 'count' && !Number.isInteger(value)) return { valid: false, score: 0, reason: '次数请填写非负整数' };
    if (config.type === 'csp' && (!Number.isInteger(value) || value > 500)) return { valid: false, score: 0, reason: 'CSP成绩须为0至500的整数' };
    if (config.type === 'choice' && !config.options.some(x => x[0] === String(data.value))) return { valid: false, score: 0, reason: '请选择符合实际的情况' };
    if (config.type === 'dorm') {
      const inspections = number(data.inspections), failures = number(data.failures);
      if (inspections === null || failures === null || !Number.isInteger(inspections) || !Number.isInteger(failures)) return { valid: false, score: 0, reason: '请填写整数检查次数与不合格次数' };
      if (failures > inspections) return { valid: false, score: 0, reason: '不合格次数不能多于检查次数' };
      if (value > 50) return { valid: false, score: 0, reason: '平均评价得分不能超过50分' };
      if (failures >= 2) return { valid: true, score: 0, zeroLabor: true };
      if (inspections < 8) return { valid: false, score: 0, reason: '原文要求检查至少8次；不足8次的计分需学院确认' };
    }
    let score = value;
    if (config.type === 'count' || config.type === 'hours') score = config.threshold ? (value >= config.threshold ? config.award : 0) : value * config.rate;
    if (config.type === 'csp') score = value >= 400 ? 10 : value >= 300 ? 5 : 0;
    if (['score','dorm'].includes(config.type) && config.cap !== null && value > config.cap) return { valid: false, score: 0, reason: '本项得分不能超过' + config.cap + '分' };
    if (config.cap !== null && config.cap !== undefined) score = Math.min(score, config.cap);
    return { valid: true, score: round(score) };
  }
  function aggregate(id, model, records) {
    const node = model.nodes[id];
    if (!node) return { score: 0, submitted: 0, total: 0, state: 'empty', raw: 0 };
    const children = node.nav || [];
    if (!children.length) {
      const rec = records[id];
      const result = evaluate(node.input, rec && rec.data);
      const committed = !!(rec && rec.submitted && result.valid);
      return { score: committed ? result.score : 0, raw: committed ? result.score : 0, submitted: committed ? 1 : 0, total: 1, state: committed ? 'done' : rec ? 'draft' : 'empty' };
    }
    const parts = children.map(child => aggregate(child, model, records));
    const raw = round(node.mode === 'max' ? Math.max(0, ...parts.map(x => x.score)) : parts.reduce((s, x) => s + x.score, 0));
    const score = node.cap === null || node.cap === undefined ? raw : Math.min(raw, node.cap);
    const submitted = parts.reduce((s, x) => s + x.submitted, 0), total = parts.reduce((s, x) => s + x.total, 0);
    return { score: round(score), raw, submitted, total, state: submitted === total ? 'done' : submitted > 0 ? 'partial' : parts.some(x => x.state === 'draft') ? 'draft' : 'empty' };
  }
  function total(model, records, grades, professional) {
    const cats = model.categories;
    const missing = cats.filter(c => number(grades[c.id]) === null || Number(grades[c.id]) > 100);
    const laborRec = records['item-136'];
    const laborResult = laborRec && laborRec.submitted ? evaluate(model.nodes['item-136'].input, laborRec.data) : null;
    const academicRec = records['item-63'];
    const zeroIntellect = !!(academicRec && academicRec.submitted && academicRec.data.value === '0');
    const zeroLabor = !!(laborResult && laborResult.valid && laborResult.zeroLabor);
    const effective = { ...grades };
    if (zeroIntellect) effective['item-56'] = 0;
    if (zeroLabor) effective['item-133'] = 0;
    const effectiveMissing = missing.filter(c => !(c.id === 'item-56' && zeroIntellect) && !(c.id === 'item-133' && zeroLabor));
    const quality = effectiveMissing.length ? null : round(cats.reduce((s, c) => s + Number(effective[c.id]) * c.weight, 0));
    const p = number(professional);
    return { quality, overall: quality === null || p === null || p > 100 ? null : round(p * .8 + quality * .2), missing: effectiveMissing.length, zeroIntellect, zeroLabor, effective };
  }
  const api = { number, evaluate, aggregate, total, round };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.ScoreEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
