// グラフ（SVG）。外部ライブラリなしで、オフラインでも動くようにしている。
import { addDays, dayKey, fmtShortDate } from './logic.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 340;

function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

function niceStep(range, targetTicks = 4) {
  const rough = range / targetTicks;
  const power = 10 ** Math.floor(Math.log10(rough || 1));
  const multiple = [1, 2, 2.5, 5, 10].find((m) => m * power >= rough) ?? 10;
  return multiple * power;
}

function frame({ height, left, top, bottom, min, max, step, start, count, ariaLabel }) {
  const plotWidth = WIDTH - left - 4;
  const plotHeight = height - top - bottom;
  const x = (index) => left + (index / count) * plotWidth;
  const y = (value) => top + ((max - value) / (max - min)) * plotHeight;
  const root = svg('svg', { viewBox: `0 0 ${WIDTH} ${height}`, class: 'chart', role: 'img', 'aria-label': ariaLabel });

  const labelStep = Math.ceil(count / 5);
  for (let i = 0; i < count; i += labelStep) {
    const label = svg('text', { x: x(i + 0.5), y: height - 6, class: 'chart-axis', 'text-anchor': 'middle' });
    label.textContent = fmtShortDate(addDays(start, i));
    root.append(label);
  }
  for (let value = Math.ceil(min / step) * step; value <= max + step / 1000; value += step) {
    const rounded = Math.round(value * 1000) / 1000;
    root.append(svg('line', { x1: left, x2: WIDTH - 4, y1: y(rounded), y2: y(rounded), class: 'chart-grid' }));
    const label = svg('text', { x: left - 6, y: y(rounded) + 4, class: 'chart-axis', 'text-anchor': 'end' });
    label.textContent = rounded.toLocaleString('ja-JP');
    root.append(label);
  }
  return { root, x, y, plotWidth };
}

/** 端だけ丸めた棒。基準線の側は角のままにする。 */
function barPath(x, y0, y1, width, radius) {
  const up = y1 < y0;
  const r = Math.min(radius, width / 2, Math.abs(y1 - y0));
  const sign = up ? 1 : -1;
  return `M${x} ${y0}V${y1 + sign * r}Q${x} ${y1} ${x + r} ${y1}H${x + width - r}Q${x + width} ${y1} ${x + width} ${y1 + sign * r}V${y0}Z`;
}

/** カロリー収支の棒グラフ。棒をタップすると onSelect を呼ぶ。 */
export function balanceChart({ days, target, onSelect }) {
  const logged = days.filter((d) => d.hasMeals);
  const values = [0, target, ...logged.map((d) => d.balance)];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const step = niceStep(Math.max(high - low, 100));
  const min = Math.floor(low / step) * step;
  const max = Math.ceil(high / step) * step || step;
  const count = days.length;
  const { root, x, y, plotWidth } = frame({
    height: 200, left: 44, top: 8, bottom: 24, min, max: max === min ? min + step : max, step,
    start: days[0].date, count, ariaLabel: 'カロリー収支の棒グラフ。数値は下の日別の表でも確認できます。',
  });

  const slot = plotWidth / count;
  const barWidth = Math.max(Math.min(slot - 2, 26), 2);
  const bars = new Map();
  let selected = null;
  const refresh = () => {
    for (const [key, bar] of bars) bar.setAttribute('opacity', selected === null || selected === key ? 1 : 0.35);
  };

  days.forEach((day, index) => {
    if (!day.hasMeals) return;
    const key = dayKey(day.date);
    const y0 = y(0);
    const y1 = y(day.balance);
    const bar = svg('path', {
      d: barPath(x(index) + (slot - barWidth) / 2, y0, Math.abs(y1 - y0) < 1 ? y0 + (day.balance > 0 ? -1 : 1) : y1, barWidth, 3),
      class: day.balance > 0 ? 'bar-surplus' : 'bar-deficit',
    });
    bars.set(key, bar);
    root.append(bar);
  });

  root.append(svg('line', { x1: 44, x2: WIDTH - 4, y1: y(0), y2: y(0), class: 'chart-baseline' }));
  if (target !== 0) root.append(svg('line', { x1: 44, x2: WIDTH - 4, y1: y(target), y2: y(target), class: 'chart-target' }));

  // 棒より広い範囲をタップできるようにする
  days.forEach((day, index) => {
    if (!day.hasMeals) return;
    const key = dayKey(day.date);
    const hit = svg('rect', { x: x(index), y: 0, width: slot, height: 176, class: 'chart-hit' });
    hit.addEventListener('click', () => {
      selected = selected === key ? null : key;
      refresh();
      onSelect(selected === null ? null : day);
    });
    root.append(hit);
  });
  return root;
}

/** 体重や推定1RMの折れ線。点をタップすると onSelect を呼ぶ。 */
export function lineChart({ points, start, count, unit, ariaLabel, onSelect }) {
  const values = points.map((p) => p.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const step = niceStep(Math.max(high - low, 1));
  const min = Math.floor(low / step) * step - (low === high ? step : 0);
  const max = Math.ceil(high / step) * step + (low === high ? step : 0);
  const { root, x, y } = frame({
    height: 170, left: 44, top: 22, bottom: 24, min, max, step, start, count, ariaLabel,
  });

  const indexOf = (date) => Math.round((new Date(dayKey(date) + 'T12:00').getTime() - new Date(dayKey(start) + 'T12:00').getTime()) / 86400000);
  const placed = points.map((p) => ({ ...p, px: x(indexOf(p.date) + 0.5), py: y(p.value) }));
  if (placed.length > 1) {
    root.append(svg('polyline', { points: placed.map((p) => `${p.px},${p.py}`).join(' '), class: 'chart-line' }));
  }

  const dots = placed.map((p) => {
    const dot = svg('circle', { cx: p.px, cy: p.py, r: 4, class: 'chart-dot' });
    root.append(dot);
    return dot;
  });
  const last = placed[placed.length - 1];
  // 線と重ならないよう、下がってきたときは点の下に置く
  const before = placed[placed.length - 2];
  const labelBelow = before && before.py < last.py && last.py + 18 < 146;
  const label = svg('text', {
    x: Math.min(last.px, WIDTH - 6), y: labelBelow ? last.py + 18 : Math.max(last.py - 10, 12), class: 'chart-label',
    'text-anchor': last.px > WIDTH - 50 ? 'end' : 'middle',
  });
  label.textContent = `${Math.round(last.value * 10) / 10} ${unit}`;
  root.append(label);

  let selected = null;
  placed.forEach((p, index) => {
    const hit = svg('circle', { cx: p.px, cy: p.py, r: 20, class: 'chart-hit' });
    hit.addEventListener('click', () => {
      selected = selected === index ? null : index;
      dots.forEach((dot, i) => dot.setAttribute('r', i === selected ? 6 : 4));
      onSelect(selected === null ? null : points[index]);
    });
    root.append(hit);
  });
  return root;
}
