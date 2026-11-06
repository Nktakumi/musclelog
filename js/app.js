// 画面の組み立て。ユーザーの入力は textContent / value でのみ描画し、HTMLとして解釈しない。
import { EXERCISES, FOODS } from './catalog.js';
import { balanceChart, lineChart } from './charts.js';
import {
  ACTIVITY, CARDIO, EQUIPMENT, PROTEIN_LEVELS, REST_OPTIONS, activityDays, fmtTimer, monthGrid, proteinIntake,
  proteinTarget, remainingSeconds, FOOD_CATEGORIES, FOOD_UNITS, GOALS, INTENSITY, MEAL_TYPES, MUSCLE_GROUPS, SEX,
  addDays, ageOn, allPersonalBests, balanceSummary, bmr, cardioBurn, cardioDistanceKm, dateFromKey, dayBalance, dayBalances, dayKey, displayNumber,
  fmtBests, fmtDate, fmtKcal, fmtKg, fmtPace, fmtSet, fmtSigned, foodNutrition, foodStep, isEmptyWorkout, matchesSearch, mealAmountLabel,
  muscleSummary, newId, normalizeData, oneRepMaxHistory, paceMinutesPerKm, parseDecimal, parseInteger, personalBests, previousPerformance, recentMeals, recordWeight,
  recordedSets, sameDay, setCountOf, setMealAmount, startOfDay, toDate, usedExerciseNames, volumeOf, weeklyWeightChange,
  weightOn, workoutBurn, workoutRecords,
} from './logic.js';
import { createStore } from './store.js';

// ---------- 小さな道具 ----------

function h(tag, props, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'class') node.className = value;
    else if (key === 'value' || key === 'checked' || key === 'disabled' || key === 'selected') node[key] = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false) node.append(child);
  }
  return node;
}

const button = (label, onclick, cls = '', extra = {}) => h('button', { type: 'button', class: cls, onclick, ...extra }, label);

function icon(name) {
  const span = document.createElement('span');
  span.className = 'icon';
  // 固定の文字列だけを使う
  span.innerHTML = ICONS[name];
  return span;
}

const stroke = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const ICONS = {
  today: stroke('<path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 16 4-5"/><path d="M3 20h18"/>'),
  workout: stroke('<path d="M3 9v6M6.5 6.5v11M17.5 6.5v11M21 9v6M6.5 12h11"/>'),
  meal: stroke('<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-2 1-3 4-3 7 0 2 1 3 3 3zm0 10v8"/>'),
  trends: stroke('<path d="M4 4v16h16"/><path d="m8 15 3.5-4 3 2.5L20 7"/>'),
  settings: stroke('<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>'),
  timer: stroke('<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 3h5"/>'),
  star: stroke('<path d="m12 4 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>'),
  plus: stroke('<path d="M12 5v14M5 12h14"/>'),
  minus: stroke('<path d="M5 12h14"/>'),
  close: stroke('<path d="m6 6 12 12M18 6 6 18"/>'),
  left: stroke('<path d="m15 5-7 7 7 7"/>'),
  right: stroke('<path d="m9 5 7 7-7 7"/>'),
  search: stroke('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
};

const iconButton = (name, label, onclick, cls = '', extra = {}) =>
  h('button', { type: 'button', class: `icon-btn ${cls}`, 'aria-label': label, onclick, ...extra }, icon(name));

/** 入力途中の文字列を保ったまま数値へ反映する欄。全角数字も受け付ける。 */
function numberField({ value, placeholder = '0', integer = false, label, onChange, cls = '' }) {
  const display = (v) => (v ? displayNumber(v) : '');
  const parse = integer ? parseInteger : parseDecimal;
  const input = h('input', {
    type: 'text', class: `num ${cls}`, inputmode: integer ? 'numeric' : 'decimal', placeholder, autocomplete: 'off',
    'aria-label': label, value: display(value),
    oninput: () => {
      const text = input.value.trim();
      if (!text) {
        input.removeAttribute('aria-invalid');
        onChange(0);
        return;
      }
      const parsed = parse(text);
      if (parsed === null) input.setAttribute('aria-invalid', 'true');
      else {
        input.removeAttribute('aria-invalid');
        onChange(parsed);
      }
    },
    onblur: () => {
      const parsed = parse(input.value.trim());
      if (parsed !== null) input.value = display(parsed);
    },
  });
  input.setNumber = (v) => {
    input.value = display(v);
    input.removeAttribute('aria-invalid');
  };
  return input;
}

const row = (label, control, unit) =>
  h('label', { class: 'row' }, h('span', { class: 'row-label' }, label), control, unit ? h('span', { class: 'unit' }, unit) : null);

function select(options, value, onChange, label) {
  return h('select', { 'aria-label': label, onchange: (e) => onChange(e.target.value) },
    Object.entries(options).map(([key, text]) => h('option', { value: key, selected: key === String(value ?? '') }, text)));
}

const labelsOf = (table) => Object.fromEntries(Object.entries(table).map(([k, v]) => [k, v.label]));

function segmented(options, value, onChange, label) {
  const group = h('div', { class: 'segmented', role: 'group', 'aria-label': label });
  for (const [key, text] of Object.entries(options)) {
    const active = String(value) === key;
    group.append(button(text, () => onChange(key), active ? 'active' : '', { 'aria-pressed': active ? 'true' : 'false' }));
  }
  return group;
}

const section = (title, ...children) =>
  h('section', { class: 'section' }, title ? h('h2', { class: 'section-title' }, title) : null, h('div', { class: 'group' }, children));
const empty = (title, detail) => h('div', { class: 'empty' }, h('strong', null, title), detail ? h('p', null, detail) : null);
const footnote = (text) => h('p', { class: 'footnote' }, text);

// ---------- 状態 ----------

const store = createStore({ onError: () => toast('記録を保存できませんでした。容量を確認してください。') });
const state = {
  tab: 'today',
  /** タブの上に重なる画面。ブラウザの戻る操作と連動する。 */
  stack: [],
  mealDate: new Date(),
  period: 7,
  /** 運動タブのカレンダーで表示している月（その月の1日）と、選んだ日 */
  calendarMonth: null,
  calendarDay: null,
  exerciseName: null,
  scroll: {},
};
const { stack } = state;
const data = () => store.data;
const commit = () => store.save();

function push(view) {
  saveScroll();
  stack.push(view);
  history.pushState({ depth: stack.length }, '');
  render();
}

function pop(count = 1) {
  history.go(-Math.min(count, stack.length));
}

window.addEventListener('popstate', () => {
  const depth = history.state?.depth ?? 0;
  const removed = stack.splice(depth);
  removed.forEach((view) => view.onClose?.());
  if (removed.length) render();
});

function currentKey() {
  return stack.length ? `stack-${stack.length}` : `tab-${state.tab}`;
}

function saveScroll() {
  const screen = document.querySelector('.screen');
  if (screen) state.scroll[currentKey()] = screen.scrollTop;
}

function toast(message) {
  document.querySelector('.toast')?.remove();
  const node = h('div', { class: 'toast', role: 'status' }, message);
  document.body.append(node);
  setTimeout(() => node.remove(), 3500);
}

/** 確認の小窓。OSのconfirmは見た目を揃えられないので使わない。 */
function confirmDialog({ message, confirmLabel, destructive = true, onConfirm }) {
  const close = () => overlay.remove();
  const confirmBtn = button(confirmLabel, () => {
    close();
    onConfirm();
  }, destructive ? 'danger' : 'primary');
  const overlay = h('div', { class: 'overlay', onclick: (e) => e.target === overlay && close() },
    h('div', { class: 'dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': message },
      h('p', null, message),
      h('div', { class: 'dialog-actions' }, button('キャンセル', close), confirmBtn)));
  document.body.append(overlay);
  confirmBtn.focus();
}

function page({ title, left, right, content }) {
  return h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      h('div', { class: 'header-side' }, left),
      h('h1', null, title),
      h('div', { class: 'header-side end' }, right)),
    h('main', { class: 'screen' }, h('div', { class: 'content' }, content)));
}

const backButton = () => h('button', { type: 'button', class: 'link back', onclick: () => pop() }, icon('left'), '戻る');
const cancelButton = (count = 1) => button('キャンセル', () => pop(count), 'link');

// ---------- 今日 ----------

function todayView() {
  const now = new Date();
  const balance = dayBalance(data(), now);
  const workouts = data().workouts.filter((w) => sameDay(w.date, now) && !isEmptyWorkout(w));
  const cardio = data().cardio.filter((c) => sameDay(c.date, now));
  const weight = weightOn(data(), now);
  return page({
    title: fmtDate(now),
    content: [
      backupNotice(),
      installNotice(),
      balance ? balanceCard(balance) : null,
      proteinCard(now),
      h('div', { class: 'card' },
        h('h2', null, '今日の運動'),
        workouts.length + cardio.length === 0 ? h('p', { class: 'muted' }, 'まだ記録がありません。運動タブから記録できます。') : null,
        cardio.map((c) => h('div', { class: 'stack-sm' }, h('p', null, CARDIO[c.type]), h('p', { class: 'muted small' }, cardioSummary(c)))),
        workouts.map((w) => h('div', { class: 'stack-sm' },
          h('p', null, w.exercises.map((e) => e.name).join('、') || '種目なし'),
          h('p', { class: 'muted small' }, `${setCountOf(w)}セット・総負荷 ${fmtKcal(volumeOf(w))} kg・${w.durationMinutes}分`),
          recordLine(w)))),
      h('div', { class: 'card card-row' },
        h('div', null, h('h2', null, '体重'), h('p', { class: 'value' }, weight === null ? '未記録' : `${fmtKg(weight)} kg`)),
        button('記録する', () => push({ type: 'weightEntry' }), 'tonal')),
    ],
  });
}

/** このトレーニングで更新した自己ベストの数。なければ何も出さない。 */
function recordLine(workout) {
  const { exerciseCount } = workoutRecords(data(), workout);
  return exerciseCount ? h('span', { class: 'record small' }, icon('star'), `自己ベスト更新 ${exerciseCount}種目`) : null;
}

function balanceCard(b) {
  const percent = b.targetIntake > 0 ? Math.min(b.intake / b.targetIntake, 1) * 100 : 100;
  const line = (label, value, strong) =>
    h('div', { class: `line ${strong ? 'strong' : ''}` }, h('span', null, label), h('span', { class: 'tnum' }, `${fmtKcal(value)} kcal`));
  const remaining = b.remaining >= 0
    ? `目標 ${fmtKcal(b.targetIntake)} kcal まで、あと ${fmtKcal(b.remaining)} kcal`
    : `目標 ${fmtKcal(b.targetIntake)} kcal を ${fmtKcal(-b.remaining)} kcal 超えています`;
  return h('div', { class: 'card' },
    h('h2', null, 'カロリー収支'),
    b.hasMeals
      ? [
        h('p', { class: 'hero tnum' }, fmtSigned(b.balance), h('span', { class: 'hero-unit' }, ' kcal')),
        h('p', { class: 'muted small' }, b.balance > 0 ? '摂取が消費を上回っています' : '消費が摂取を上回っています'),
      ]
      : h('p', { class: 'hero-text' }, '食事がまだ記録されていません'),
    h('div', {
      class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(percent), 'aria-label': '目標の摂取量に対する割合',
    }, widthBar(percent)),
    h('p', { class: 'small' }, remaining),
    h('hr'),
    line('摂取', b.intake),
    line('基礎代謝', b.basal),
    line('日常の活動', b.dailyActivity),
    line('筋トレ', b.workoutBurn),
    b.cardioBurn > 0 ? line('ウォーキング・ランニング', b.cardioBurn) : null,
    line('消費の合計', b.expenditure, true),
    h('p', { class: 'muted tiny' }, '消費は1日全体の推定値です。'));
}

function proteinCard(date) {
  const target = proteinTarget(data(), date);
  if (!target) return null;
  const intake = proteinIntake(data(), date);
  const percent = Math.min(intake / target, 1) * 100;
  const left = target - intake;
  return h('div', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h2', null, 'たんぱく質'),
      h('span', { class: 'tnum' }, h('strong', null, fmtKg(intake)), ` / ${fmtKcal(target)} g`)),
    h('div', {
      class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(percent), 'aria-label': 'たんぱく質の目標に対する割合',
    }, widthBar(percent)),
    h('p', { class: 'small' }, left > 0 ? `目標まで、あと ${fmtKg(left)} g` : '目標に届きました'),
    h('p', { class: 'muted tiny' }, `目標は${PROTEIN_LEVELS[String(data().settings.proteinPerKg)]}。たんぱく質を入力した食事だけを数えます。`));
}

function widthBar(percent) {
  const bar = h('div', { class: 'progress-bar' });
  bar.style.width = `${percent}%`;
  return bar;
}

function backupNotice() {
  const { lastBackupAt, workouts, meals } = data();
  if (workouts.length + meals.length < 5) return null;
  const days = lastBackupAt ? (Date.now() - new Date(lastBackupAt).getTime()) / 86400000 : Infinity;
  if (days < 14) return null;
  return h('div', { class: 'notice' },
    h('p', null, lastBackupAt ? `最後のバックアップから${Math.floor(days)}日たちました。` : 'まだバックアップがありません。'),
    button('バックアップする', exportData, 'tonal'));
}

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function installNotice() {
  if (isStandalone()) return null;
  return h('div', { class: 'notice' },
    h('p', null, '記録を消えにくくするため、ホーム画面に追加して使ってください。Safariの共有ボタンから「ホーム画面に追加」を選びます。'));
}

function weightEntryView() {
  const draft = { kg: weightOn(data(), new Date()) ?? 0, date: dayKey(new Date()) };
  const save = button('保存', () => {
    recordWeight(data(), draft.kg, dateFromKey(draft.date));
    commit();
    pop();
  }, 'link strong', { disabled: !(draft.kg > 0) });
  return page({
    title: '体重を記録',
    left: cancelButton(),
    right: save,
    content: section(null,
      row('日付', h('input', {
        type: 'date', value: draft.date, max: dayKey(new Date()),
        onchange: (e) => { draft.date = e.target.value || draft.date; e.target.value = draft.date; },
      })),
      row('体重', numberField({
        value: draft.kg, label: '体重', onChange: (v) => { draft.kg = v; save.disabled = !(v > 0); },
      }), 'kg')),
  });
}

// ---------- 筋トレ ----------

/** 例: 8,000歩・約5.6km・40分・消費 196 kcal */
function cardioSummary(entry) {
  const profile = data().profile;
  const weight = weightOn(data(), entry.date) ?? 0;
  const km = cardioDistanceKm(entry, profile?.heightCm ?? 0);
  const pace = entry.type === 'run' ? fmtPace(paceMinutesPerKm(entry, profile?.heightCm ?? 0)) : null;
  return [
    entry.type === 'walk' ? `${fmtKcal(entry.steps)}歩` : null,
    `${entry.type === 'walk' ? '約' : ''}${fmtKg(km)}km`,
    entry.durationMinutes > 0 ? `${displayNumber(entry.durationMinutes)}分` : null,
    pace,
    `消費 ${fmtKcal(cardioBurn(entry, weight, profile?.heightCm ?? 0))} kcal`,
  ].filter(Boolean).join('・');
}

function chooseActivity() {
  const close = () => overlay.remove();
  const choice = (label, action) => button(label, () => { close(); action(); }, 'tonal wide');
  const overlay = h('div', { class: 'overlay', onclick: (e) => e.target === overlay && close() },
    h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': '記録する運動' },
      h('p', null, '何を記録しますか？'),
      choice('筋トレ', startWorkout),
      choice('ウォーキング', () => push({ type: 'cardio', draft: newCardio('walk'), isNew: true })),
      choice('ランニング', () => push({ type: 'cardio', draft: newCardio('run'), isNew: true })),
      button('キャンセル', close, 'link')));
  document.body.append(overlay);
}

const newCardio = (type) => ({
  id: newId(), date: new Date().toISOString(), type, steps: type === 'walk' ? 0 : null,
  distanceKm: type === 'run' ? 0 : null, durationMinutes: 0, note: '',
});

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function calendarCard() {
  const today = new Date();
  const month = state.calendarMonth ?? new Date(today.getFullYear(), today.getMonth(), 1);
  const year = month.getFullYear();
  const index = month.getMonth();
  const marks = activityDays(data(), year, index);
  const strengthDays = [...marks.values()].filter((m) => m.strength).length;
  const activeDays = marks.size;
  const isCurrent = year === today.getFullYear() && index === today.getMonth();
  const move = (delta) => {
    state.calendarMonth = new Date(year, index + delta, 1);
    state.calendarDay = null;
    render();
  };

  const cell = (date) => {
    if (!date) return h('span', { class: 'cal-cell', 'aria-hidden': 'true' });
    const key = dayKey(date);
    const mark = marks.get(key);
    const kinds = [mark?.strength ? '筋トレ' : null, mark?.cardio ? 'ウォーキング・ランニング' : null].filter(Boolean);
    const classes = ['cal-cell', 'cal-day',
      mark?.strength ? 'has-strength' : '', mark?.cardio ? 'has-cardio' : '',
      sameDay(date, today) ? 'is-today' : '', state.calendarDay === key ? 'is-selected' : ''].join(' ');
    return h('button', {
      type: 'button', class: classes, 'aria-pressed': state.calendarDay === key ? 'true' : 'false',
      'aria-label': `${index + 1}月${date.getDate()}日${kinds.length ? `、${kinds.join('と')}` : ''}`,
      onclick: () => {
        state.calendarDay = state.calendarDay === key ? null : key;
        render();
      },
    }, h('span', { class: 'cal-num tnum' }, date.getDate()), h('span', { class: 'cal-dot', 'aria-hidden': 'true' }));
  };

  return h('div', { class: 'card calendar' },
    h('div', { class: 'cal-head' },
      iconButton('left', '前の月', () => move(-1)),
      h('div', { class: 'cal-title' },
        h('h2', null, `${year}年${index + 1}月`),
        h('p', { class: 'muted small tnum' }, `筋トレ ${strengthDays}日・運動した日 ${activeDays}日`)),
      iconButton('right', '次の月', () => move(1), '', { disabled: isCurrent })),
    h('div', { class: 'cal-grid', role: 'group', 'aria-label': `${year}年${index + 1}月のカレンダー` },
      WEEK_LABELS.map((w) => h('span', { class: 'cal-week', 'aria-hidden': 'true' }, w)),
      monthGrid(year, index).map(cell)),
    h('div', { class: 'legend' },
      h('span', null, h('span', { class: 'swatch strength' }), '筋トレ'),
      h('span', null, h('span', { class: 'swatch cardio' }), 'ウォーキング・ランニング')));
}

function workoutsView() {
  const all = [
    ...data().workouts.map((w) => ({ kind: 'workout', date: w.date, item: w })),
    ...data().cardio.map((c) => ({ kind: 'cardio', date: c.date, item: c })),
  ].sort((a, b) => toDate(b.date) - toDate(a.date));
  const selected = state.calendarDay;
  const items = selected ? all.filter((entry) => dayKey(entry.date) === selected) : all;
  const cardioRow = (c) => h('button', {
    type: 'button', class: 'list-row', onclick: () => push({ type: 'cardio', draft: structuredClone(c), isNew: false }),
  },
  h('span', { class: 'list-main' },
    h('strong', null, `${fmtDate(c.date)}　${CARDIO[c.type]}`),
    h('span', { class: 'muted small' }, cardioSummary(c))),
  icon('right'));
  return page({
    title: '運動',
    right: iconButton('plus', '運動を記録', chooseActivity, 'accent'),
    content: [
      calendarCard(),
      selected ? h('div', { class: 'filter-bar' },
        h('span', null, `${fmtDate(dateFromKey(selected))}の記録`),
        button('すべて表示', () => { state.calendarDay = null; render(); }, 'link small')) : null,
      items.length === 0 && selected ? empty('この日の記録はありません') : null,
      items.length === 0 && !selected
        ? [empty('運動の記録はまだありません', '下のボタンから記録を始めましょう。'), button('記録する', chooseActivity, 'primary wide')]
        : null,
      items.length ? section(null, items.map(({ kind, item: w }) => (kind === 'cardio' ? cardioRow(w) : h('button', {
        type: 'button', class: 'list-row', onclick: () => push(workoutPage(w.id)),
      },
      h('span', { class: 'list-main' },
        h('strong', null, fmtDate(w.date)),
        h('span', { class: 'clamp' }, w.exercises.map((e) => e.name).join('、') || 'メモのみ'),
        h('span', { class: 'muted small' }, `${setCountOf(w)}セット・総負荷 ${fmtKcal(volumeOf(w))} kg`),
        recordLine(w)),
      icon('right'))))) : null,
    ],
  });
}

function cardioView(view) {
  const entry = view.draft;
  const isWalk = entry.type === 'walk';
  const profile = data().profile;
  const estimate = h('p', { class: 'footnote tnum' });
  const valid = () => (isWalk ? entry.steps > 0 : entry.distanceKm > 0);
  const saveBtn = button('保存', () => {
    const list = data().cardio;
    const index = list.findIndex((c) => c.id === entry.id);
    if (index >= 0) list[index] = entry;
    else list.push(entry);
    commit();
    pop();
  }, 'link strong');
  const refresh = () => {
    saveBtn.disabled = !valid();
    estimate.textContent = valid() ? cardioSummary(entry) : '';
  };
  refresh();
  const set = (key) => (value) => { entry[key] = value; refresh(); };

  return page({
    title: CARDIO[entry.type],
    left: cancelButton(),
    right: saveBtn,
    content: [
      section(null,
        row('日付', h('input', {
          type: 'date', value: dayKey(entry.date), max: dayKey(new Date()),
          onchange: (e) => {
            const date = dateFromKey(e.target.value);
            if (date) entry.date = date.toISOString();
            else e.target.value = dayKey(entry.date);
          },
        })),
        isWalk
          ? row('歩数', numberField({ value: entry.steps, integer: true, label: '歩数', onChange: (v) => set('steps')(Math.min(v, 200000)) }), '歩')
          : row('距離', numberField({ value: entry.distanceKm, label: '距離', onChange: (v) => set('distanceKm')(Math.min(v, 500)) }), 'km'),
        row('時間（任意）', numberField({ value: entry.durationMinutes, label: '時間', onChange: (v) => set('durationMinutes')(Math.min(v, 1440)) }), '分')),
      estimate,
      footnote(isWalk
        ? `距離は身長から歩幅（${Math.round((profile?.heightCm ?? 0) * 0.45)}cm）を推定して計算します。普段の生活で歩いた分は「日常の活動」に含まれるので、運動として歩いた分だけを入れてください。`
        : '消費は距離と体重から計算します。走る速さによる差は小さいため、時間はペースの表示にだけ使います。'),
      section('メモ', h('textarea', {
        rows: 2, placeholder: 'コースや調子など', 'aria-label': 'メモ', value: entry.note,
        oninput: (e) => { entry.note = e.target.value; },
      })),
      view.isNew ? null : button('この記録を削除', () => confirmDialog({
        message: 'この記録を削除しますか？',
        confirmLabel: '削除',
        onConfirm: () => {
          data().cardio = data().cardio.filter((c) => c.id !== entry.id);
          commit();
          pop();
        },
      }), 'danger-text wide'),
    ],
  });
}

function startWorkout() {
  const workout = {
    id: newId(), date: new Date().toISOString(), durationMinutes: 60, intensity: 'moderate', note: '', exercises: [],
  };
  data().workouts.push(workout);
  commit();
  push(workoutPage(workout.id));
}

function workoutPage(id) {
  return {
    type: 'workout',
    id,
    // 何も入力せずに戻ったら記録を残さない
    onClose: () => {
      const workout = data().workouts.find((w) => w.id === id);
      if (workout && isEmptyWorkout(workout)) {
        data().workouts = data().workouts.filter((w) => w.id !== id);
        commit();
      }
    },
  };
}

function nextSet(exercise, date) {
  const source = exercise.sets[exercise.sets.length - 1]
    ?? (previousPerformance(data(), exercise.name, date) && recordedSets(previousPerformance(data(), exercise.name, date))[0]);
  return { id: newId(), weightKg: source?.weightKg ?? 0, reps: source?.reps ?? 0 };
}

function workoutDetailView(view) {
  const workout = data().workouts.find((w) => w.id === view.id);
  if (!workout) return page({ title: 'トレーニング', left: backButton(), content: empty('この記録は削除されました') });

  const summary = h('p', { class: 'footnote' });
  const refresh = () => {
    const weight = weightOn(data(), workout.date) ?? 0;
    summary.textContent = `推定消費 ${fmtKcal(workoutBurn(workout, weight))} kcal・総負荷 ${fmtKcal(volumeOf(workout))} kg`;
  };
  const badgeRefreshers = [];
  const change = () => {
    refresh();
    badgeRefreshers.forEach((update) => update());
    commit();
  };
  refresh();

  const duration = h('span', { class: 'tnum' }, `${workout.durationMinutes}分`);
  const adjustDuration = (delta) => {
    workout.durationMinutes = Math.min(Math.max(workout.durationMinutes + delta, 5), 300);
    duration.textContent = `${workout.durationMinutes}分`;
    change();
  };

  return page({
    title: 'トレーニング',
    left: backButton(),
    right: h('button', { type: 'button', class: 'link strong timer-btn', onclick: () => startRest() }, icon('timer'), '休憩'),
    content: [
      section(null,
        row('日付', h('input', {
          type: 'date', value: dayKey(workout.date), max: dayKey(new Date()),
          onchange: (e) => {
            const date = dateFromKey(e.target.value);
            if (!date) { e.target.value = dayKey(workout.date); return; }
            workout.date = date.toISOString();
            commit();
            render();
          },
        })),
        h('div', { class: 'row' }, h('span', { class: 'row-label' }, '時間'),
          h('div', { class: 'stepper' },
            iconButton('minus', '5分減らす', () => adjustDuration(-5)),
            duration,
            iconButton('plus', '5分増やす', () => adjustDuration(5)))),
        h('div', { class: 'row' }, h('span', { class: 'row-label' }, '強度'),
          segmented(labelsOf(INTENSITY), workout.intensity, (key) => {
            workout.intensity = key;
            commit();
            render();
          }, '強度'))),
      summary,
      workout.exercises.map((exercise) => exerciseBlock(workout, exercise, change, badgeRefreshers)),
      button('種目を追加', () => push({
        type: 'exercisePicker',
        onSelect: (definition) => {
          const exercise = { id: newId(), name: definition.name, group: definition.group, sets: [] };
          exercise.sets.push(nextSet(exercise, workout.date));
          workout.exercises.push(exercise);
          commit();
        },
      }), 'primary wide'),
      section('メモ', h('textarea', {
        rows: 3, placeholder: '調子や気づきなど', 'aria-label': 'メモ', value: workout.note,
        oninput: (e) => { workout.note = e.target.value; commit(); },
      })),
      button('この記録を削除', () => confirmDialog({
        message: 'この記録を削除しますか？',
        confirmLabel: '削除',
        onConfirm: () => {
          data().workouts = data().workouts.filter((w) => w.id !== workout.id);
          commit();
          pop();
        },
      }), 'danger-text wide'),
    ],
  });
}

function exerciseBlock(workout, exercise, change, badgeRefreshers) {
  const previous = previousPerformance(data(), exercise.name, workout.date);
  const bests = fmtBests(personalBests(data(), exercise.name, { until: workout.date, excludeId: workout.id }));
  const rows = h('div', { class: 'sets' });
  const badges = new Map();
  const refreshBadges = () => {
    const { bySet } = workoutRecords(data(), workout);
    for (const [id, badge] of badges) {
      const labels = bySet.get(id);
      badge.hidden = !labels;
      badge.lastChild.textContent = labels ? `自己ベスト更新：${labels.join('・')}` : '';
    }
  };
  badgeRefreshers.push(refreshBadges);
  const recordBadge = (set) => {
    const badge = h('div', { class: 'record set-record', role: 'status' }, icon('star'), h('span'));
    badges.set(set.id, badge);
    return badge;
  };
  const drawSets = () => {
    badges.clear();
    rows.replaceChildren(
      h('div', { class: 'set-row set-head', 'aria-hidden': 'true' }, h('span', null, 'セット'), h('span', null, 'kg'), h('span', null, '回'), h('span')),
      ...exercise.sets.flatMap((set, index) => [h('div', { class: 'set-row' },
        h('span', { class: 'set-no tnum' }, index + 1),
        numberField({
          value: set.weightKg, placeholder: '自重', label: `${index + 1}セット目の重量`,
          onChange: (v) => { set.weightKg = v; change(); },
        }),
        numberField({
          value: set.reps, integer: true, label: `${index + 1}セット目の回数`,
          onChange: (v) => { set.reps = Math.min(v, 9999); change(); },
        }),
        iconButton('close', `${index + 1}セット目を削除`, () => {
          exercise.sets = exercise.sets.filter((s) => s.id !== set.id);
          drawSets();
          change();
        }, 'quiet')), recordBadge(set)]),
    );
    refreshBadges();
  };
  drawSets();
  return h('section', { class: 'section' },
    h('div', { class: 'section-head' },
      h('h2', { class: 'exercise-name' }, exercise.name),
      button('種目を削除', () => confirmDialog({
        message: `${exercise.name}を削除しますか？`,
        confirmLabel: '削除',
        onConfirm: () => {
          workout.exercises = workout.exercises.filter((e) => e.id !== exercise.id);
          commit();
          render();
        },
      }), 'danger-text small')),
    h('div', { class: 'group pad' },
      rows,
      h('button', {
        type: 'button', class: 'add-row',
        onclick: () => {
          const set = nextSet(exercise, workout.date);
          exercise.sets.push(set);
          drawSets();
          change();
          // 次のセットを足すのは前のセットが終わったとき、なので休憩を始める
          if (data().settings.restAutoStart) startRest();
        },
      }, icon('plus'), 'セットを追加')),
    previous ? footnote(`前回: ${recordedSets(previous).map(fmtSet).join('、')}`) : null,
    bests ? footnote(`これまでのベスト: ${bests}`) : null);
}

function allExercises() {
  const all = [...EXERCISES, ...data().customExercises];
  const names = new Set(all.map((e) => e.name));
  // 一覧にない名前でも、記録に残っていれば選べるようにする
  for (const exercise of data().workouts.flatMap((w) => w.exercises)) {
    if (!names.has(exercise.name)) {
      names.add(exercise.name);
      all.push({ name: exercise.name, group: exercise.group });
    }
  }
  return all;
}

function exercisePickerView(view) {
  view.query ??= '';
  view.group ??= '';
  view.equipment ??= '';
  view.newGroup ??= 'other';
  view.newEquipment ??= 'other';

  const choose = (definition) => {
    view.onSelect(definition);
    pop();
  };
  const exerciseRow = (item) => h('button', { type: 'button', class: 'list-row', onclick: () => choose(item) },
    h('span', { class: 'list-main' }, h('span', null, item.name),
      item.target || item.equipment ? h('span', { class: 'muted small' }, item.target ?? EQUIPMENT[item.equipment]) : null));

  const results = h('div');
  const draw = () => {
    const query = view.query.trim();
    const all = allExercises();
    const items = all.filter((item) => (!view.group || item.group === view.group)
      && (!view.equipment || item.equipment === view.equipment)
      && matchesSearch(item.name, query));
    const recent = usedExerciseNames(data()).map((name) => items.find((i) => i.name === name)).filter(Boolean).slice(0, 5);
    const exists = all.some((e) => e.name === query);
    results.replaceChildren(...[
      query && !exists ? section('新しい種目として追加',
        row('部位', select(MUSCLE_GROUPS, view.newGroup, (v) => { view.newGroup = v; }, '部位')),
        row('器具', select(EQUIPMENT, view.newEquipment, (v) => { view.newEquipment = v; }, '器具')),
        h('button', {
          type: 'button', class: 'add-row',
          onclick: () => {
            const definition = { id: newId(), name: query, group: view.newGroup, equipment: view.newEquipment, target: null };
            data().customExercises.push(definition);
            commit();
            choose(definition);
          },
        }, icon('plus'), `「${query}」を追加`)) : null,
      recent.length ? section('最近使った種目', recent.map(exerciseRow)) : null,
      ...Object.entries(MUSCLE_GROUPS).map(([group, label]) => {
        const list = items.filter((i) => i.group === group);
        return list.length ? section(label, list.map(exerciseRow)) : null;
      }),
      items.length === 0 && !query ? empty('条件に合う種目はありません', '部位や器具の絞り込みを変えてみてください。') : null,
    ].filter(Boolean));
  };
  draw();

  return page({
    title: '種目を選ぶ',
    left: cancelButton(),
    content: [
      searchBox('種目を検索、または新しく入力', view.query, (v) => { view.query = v; draw(); }),
      section(null,
        row('部位', select({ '': 'すべて', ...MUSCLE_GROUPS }, view.group, (v) => { view.group = v; draw(); }, '部位で絞り込む')),
        row('器具', select({ '': 'すべて', ...EQUIPMENT }, view.equipment, (v) => { view.equipment = v; draw(); }, '器具で絞り込む'))),
      results,
    ],
  });
}

function searchBox(placeholder, value, onInput) {
  return h('label', { class: 'search' }, icon('search'),
    h('input', {
      type: 'search', placeholder, value, 'aria-label': placeholder, autocomplete: 'off', enterkeyhint: 'search',
      oninput: (e) => onInput(e.target.value),
    }));
}

// ---------- 食事 ----------

function mealsView() {
  const date = state.mealDate;
  const isToday = sameDay(date, new Date());
  const meals = data().meals.filter((m) => sameDay(m.date, date)).sort((a, b) => toDate(a.date) - toDate(b.date));
  const balance = dayBalance(data(), date);
  const sum = (key) => meals.reduce((total, m) => total + (m[key] ?? 0), 0);
  const pfc = sum('proteinG') + sum('fatG') + sum('carbsG');
  const shift = (days) => {
    state.mealDate = addDays(date, days);
    render();
  };

  return page({
    title: '食事',
    content: [
      h('div', { class: 'date-switch' },
        iconButton('left', '前の日', () => shift(-1)),
        h('input', {
          type: 'date', 'aria-label': '日付', value: dayKey(date), max: dayKey(new Date()),
          onchange: (e) => {
            const picked = dateFromKey(e.target.value);
            if (picked) { state.mealDate = picked; render(); } else e.target.value = dayKey(date);
          },
        }),
        iconButton('right', '次の日', () => shift(1), '', { disabled: isToday })),
      balance ? h('div', { class: 'card' },
        h('div', { class: 'line strong' },
          h('span', { class: 'tnum' }, `摂取 ${fmtKcal(balance.intake)} kcal`),
          balance.hasMeals ? h('span', { class: 'tnum' }, `収支 ${fmtSigned(balance.balance)}`) : null),
        h('p', { class: 'muted small tnum' }, [
          `たんぱく質 ${fmtKg(sum('proteinG'))}${proteinTarget(data(), date) ? ` / ${fmtKcal(proteinTarget(data(), date))}` : ''}g`,
          pfc > 0 ? `脂質 ${fmtKg(sum('fatG'))}g` : null,
          pfc > 0 ? `炭水化物 ${fmtKg(sum('carbsG'))}g` : null,
        ].filter(Boolean).join('・'))) : null,
      Object.entries(MEAL_TYPES).map(([type, label]) => section(label,
        meals.filter((m) => m.type === type).map((meal) => h('button', {
          type: 'button', class: 'list-row',
          onclick: () => push({ type: 'mealEditor', draft: structuredClone(meal), isNew: false, closeCount: 1 }),
        },
        h('span', { class: 'list-main' }, h('span', null, meal.name || label),
          mealAmountLabel(meal) ? h('span', { class: 'muted small' }, mealAmountLabel(meal)) : null),
        h('span', { class: 'muted tnum nowrap' }, `${fmtKcal(meal.kcal)} kcal`))),
        h('button', {
          type: 'button', class: 'add-row',
          onclick: () => push({ type: 'foodPicker', mealType: type, date: mealDateFor(date) }),
        }, icon('plus'), '追加'))),
    ],
  });
}

/** 同じ区分の中で入力順に並ぶよう、今日なら現在時刻を使う */
function mealDateFor(date) {
  if (sameDay(date, new Date())) return new Date().toISOString();
  const noon = startOfDay(date);
  noon.setHours(12);
  return noon.toISOString();
}

const newMeal = (type, date) => ({
  id: newId(), date, type, name: '', kcal: 0, proteinG: null, fatG: null, carbsG: null, food: null, amount: null,
});

function foodPickerView(view) {
  view.query ??= '';
  const makeDraft = (food) => {
    const meal = newMeal(view.mealType, view.date);
    meal.name = food.name;
    meal.food = structuredClone(food);
    setMealAmount(meal, food.defaultAmount);
    return meal;
  };
  const open = (draft) => push({ type: 'mealEditor', draft, isNew: true, closeCount: 2 });
  const detail = (amount, n) => {
    const values = `${fmtKcal(n.kcal)} kcal・P${fmtKg(n.proteinG ?? 0)} F${fmtKg(n.fatG ?? 0)} C${fmtKg(n.carbsG ?? 0)}`;
    return amount ? `${amount}・${values}` : values;
  };
  const foodRow = (food, extra) => h('div', { class: 'list-line' },
    h('button', { type: 'button', class: 'list-row', onclick: () => open(makeDraft(food)) },
      h('span', { class: 'list-main' }, h('span', null, food.name),
        h('span', { class: 'muted small tnum' }, detail(`${displayNumber(food.defaultAmount)}${food.unit}`, foodNutrition(food, food.defaultAmount))))),
    extra);

  const results = h('div');
  const manualLabel = h('span');
  const draw = () => {
    const query = view.query.trim();
    manualLabel.textContent = query ? `「${query}」を自分で入力する` : '自分で入力する';
    const recent = recentMeals(data()).filter((m) => matchesSearch(m.name, query));
    const custom = data().customFoods.filter((f) => matchesSearch(f.name, query));
    results.replaceChildren(...[
      recent.length ? section('最近', recent.map((source) => h('button', {
        type: 'button', class: 'list-row',
        onclick: () => {
          const meal = structuredClone(source);
          meal.id = newId();
          meal.date = view.date;
          meal.type = view.mealType;
          open(meal);
        },
      }, h('span', { class: 'list-main' }, h('span', null, source.name),
        h('span', { class: 'muted small tnum' }, detail(mealAmountLabel(source), source)))))) : null,
      custom.length ? section('マイ食品', custom.map((food) => foodRow(food, iconButton('close', `${food.name}を削除`, () => confirmDialog({
        message: `マイ食品から「${food.name}」を削除しますか？ 過去の記録は残ります。`,
        confirmLabel: '削除',
        onConfirm: () => {
          data().customFoods = data().customFoods.filter((f) => f.id !== food.id);
          commit();
          draw();
        },
      }), 'quiet')))) : null,
      ...Object.entries(FOOD_CATEGORIES).map(([category, label]) => {
        const foods = FOODS.filter((f) => f.category === category && matchesSearch(f.name, query));
        return foods.length ? section(label, foods.map((f) => foodRow(f))) : null;
      }),
    ].filter(Boolean));
  };
  draw();

  return page({
    title: `${MEAL_TYPES[view.mealType]}を追加`,
    left: cancelButton(),
    content: [
      searchBox('食品を検索', view.query, (v) => { view.query = v; draw(); }),
      section(null, h('button', {
        type: 'button', class: 'add-row',
        onclick: () => {
          const meal = newMeal(view.mealType, view.date);
          meal.name = view.query.trim();
          open(meal);
        },
      }, icon('plus'), manualLabel)),
      footnote('よく食べるものは、入力時に「マイ食品」へ登録すると次回から選べます。'),
      results,
    ],
  });
}

function mealEditorView(view) {
  const meal = view.draft;
  view.saveFood ??= false;
  view.foodAmount ??= 1;
  view.foodUnit ??= '食';
  view.foodCategory ??= 'other';

  const fields = {};
  const nutritionField = (key, label, unit, placeholder) => {
    fields[key] = numberField({
      value: meal[key] ?? 0, placeholder, label,
      onChange: (v) => {
        if (key === 'kcal') meal.kcal = v;
        else meal[key] = v === 0 ? null : v;
        refreshSave();
      },
    });
    return row(label, fields[key], unit);
  };
  const trimmedName = () => meal.name.trim();
  const canSave = () => meal.kcal > 0 && (!view.saveFood || (trimmedName() !== '' && view.foodAmount > 0));
  const saveBtn = button('保存', () => {
    meal.name = trimmedName();
    if (view.saveFood) {
      const food = {
        id: newId(), name: meal.name, category: view.foodCategory, baseAmount: view.foodAmount, unit: view.foodUnit, defaultAmount: view.foodAmount,
        nutrition: { kcal: meal.kcal, proteinG: meal.proteinG ?? 0, fatG: meal.fatG ?? 0, carbsG: meal.carbsG ?? 0 },
      };
      // 同じ名前のマイ食品は上書きする
      const index = data().customFoods.findIndex((f) => f.name === food.name);
      if (index >= 0) {
        food.id = data().customFoods[index].id;
        data().customFoods[index] = food;
      } else data().customFoods.push(food);
      meal.food = structuredClone(food);
      meal.amount = view.foodAmount;
    }
    const index = data().meals.findIndex((m) => m.id === meal.id);
    if (index >= 0) data().meals[index] = meal;
    else data().meals.push(meal);
    commit();
    pop(view.closeCount);
  }, 'link strong');
  const refreshSave = () => { saveBtn.disabled = !canSave(); };

  let amountSection = null;
  if (meal.food) {
    const { food } = meal;
    const step = foodStep(food.unit);
    const applyAmount = (amount) => {
      setMealAmount(meal, amount);
      for (const key of ['kcal', 'proteinG', 'fatG', 'carbsG']) fields[key].setNumber(meal[key] ?? 0);
      refreshSave();
    };
    const amountInput = numberField({ value: meal.amount ?? 0, label: '量', onChange: applyAmount });
    const nudge = (delta) => {
      const next = Math.max(Math.round(((meal.amount ?? 0) + delta) * 100) / 100, 0);
      amountInput.setNumber(next);
      applyAmount(next);
    };
    amountSection = [
      section(null, h('div', { class: 'row' }, h('span', { class: 'row-label' }, '量'),
        amountInput, h('span', { class: 'unit' }, food.unit),
        iconButton('minus', '減らす', () => nudge(-step)),
        iconButton('plus', '増やす', () => nudge(step)))),
      footnote(`${displayNumber(food.baseAmount)}${food.unit}あたり ${fmtKcal(food.nutrition.kcal)} kcal。量を変えると自動で計算します。`),
    ];
  }

  const registerBody = h('div', { class: 'nested' });
  const drawRegister = () => {
    registerBody.replaceChildren(...(view.saveFood ? [
      h('div', { class: 'row' }, h('span', { class: 'row-label' }, '上の栄養値の量'),
        numberField({ value: view.foodAmount, placeholder: '1', label: '基準の量', onChange: (v) => { view.foodAmount = v; refreshSave(); } }),
        select(Object.fromEntries(FOOD_UNITS.map((u) => [u, u])), view.foodUnit, (v) => { view.foodUnit = v; }, '単位')),
      row('分類', select(FOOD_CATEGORIES, view.foodCategory, (v) => { view.foodCategory = v; }, '分類')),
    ] : []));
  };
  drawRegister();

  const content = [
    section(null,
      row('区分', select(MEAL_TYPES, meal.type, (v) => { meal.type = v; }, '区分')),
      h('input', {
        type: 'text', class: 'text-row', placeholder: '食事名', 'aria-label': '食事名', value: meal.name,
        oninput: (e) => { meal.name = e.target.value; refreshSave(); },
      })),
    amountSection,
    section('栄養',
      nutritionField('kcal', 'カロリー', 'kcal'),
      nutritionField('proteinG', 'たんぱく質', 'g'),
      nutritionField('fatG', '脂質', 'g'),
      nutritionField('carbsG', '炭水化物', 'g')),
    footnote(meal.food ? '自動で入力した値は目安です。商品のラベルに合わせて変更できます。' : 'たんぱく質・脂質・炭水化物の入力は任意です。'),
    !meal.food && view.isNew ? section(null,
      h('label', { class: 'row' }, h('span', { class: 'row-label' }, 'マイ食品に登録する'),
        h('input', {
          type: 'checkbox', role: 'switch', class: 'switch', checked: view.saveFood,
          onchange: (e) => { view.saveFood = e.target.checked; drawRegister(); refreshSave(); },
        })),
      registerBody) : null,
    view.isNew ? null : button('この食事を削除', () => confirmDialog({
      message: 'この食事を削除しますか？',
      confirmLabel: '削除',
      onConfirm: () => {
        data().meals = data().meals.filter((m) => m.id !== meal.id);
        commit();
        pop();
      },
    }), 'danger-text wide'),
  ];
  refreshSave();

  return page({
    title: view.isNew ? '食事を追加' : '食事を編集',
    left: view.closeCount > 1 ? backButton() : cancelButton(),
    right: saveBtn,
    content,
  });
}

// ---------- 推移 ----------

function trendsView() {
  const now = new Date();
  const start = addDays(now, -(state.period - 1));
  const days = dayBalances(data(), state.period, now);
  const inPeriod = (p) => toDate(p.date).getTime() >= start.getTime();
  const weightPoints = data().weights
    .map((w) => ({ date: toDate(w.date), value: w.kg }))
    .filter(inPeriod)
    .sort((a, b) => a.date - b.date);
  const names = usedExerciseNames(data());
  const exercise = names.includes(state.exerciseName) ? state.exerciseName : names[0] ?? null;
  const rmPoints = exercise ? oneRepMaxHistory(data(), exercise).filter(inPeriod) : [];

  return page({
    title: '推移',
    content: [
      segmented({ 7: '7日', 30: '30日', 90: '90日' }, state.period, (key) => {
        state.period = Number(key);
        render();
      }, '期間'),
      balanceTrendCard(days),
      muscleCard(start),
      lineCard({
        title: '体重',
        action: button('記録一覧', () => push({ type: 'weightHistory' }), 'link small'),
        points: weightPoints, start, emptyTitle: 'この期間の体重の記録はありません', emptyDetail: '今日タブから記録できます。',
      }),
      lineCard({
        title: '推定1RM',
        action: names.length ? select(Object.fromEntries(names.map((n) => [n, n])), exercise, (v) => { state.exerciseName = v; render(); }, '種目') : null,
        points: rmPoints, start, emptyTitle: 'この期間の記録はありません', emptyDetail: '重量と回数を記録すると表示されます。',
      }),
      bestsCard(),
    ],
  });
}

/** 部位別のセット数。バーは1色で、数値を横に直接書く。 */
function muscleCard(start) {
  const summary = muscleSummary(data(), start);
  const total = summary.reduce((sum, g) => sum + g.sets, 0);
  const head = h('h2', null, '部位別のセット数');
  if (!total) return h('div', { class: 'card' }, head, empty('この期間のトレーニングの記録はありません', '回数を入力したセットを集計します。'));
  const max = Math.max(...summary.map((g) => g.sets));
  // 全身とその他は、記録がなければ行を出さない
  const rows = summary.filter((g) => g.sets > 0 || !['fullBody', 'other'].includes(g.key));
  return h('div', { class: 'card' },
    head,
    h('p', { class: 'muted small tnum' }, `合計 ${total}セット`),
    h('div', { class: 'muscle-list' }, rows.map((g) => {
      const bar = h('span', { class: 'muscle-bar' });
      bar.style.width = `${(g.sets / max) * 100}%`;
      return h('div', { class: 'muscle-row' },
        h('span', { class: 'muscle-name' }, g.label),
        h('span', { class: 'muscle-track' }, bar),
        h('span', { class: 'muscle-value tnum' }, `${g.sets}セット`));
    })),
    h('details', { class: 'daily' },
      h('summary', null, '総負荷も見る'),
      h('table', null,
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, '部位'), h('th', { scope: 'col' }, 'セット'), h('th', { scope: 'col' }, '総負荷'))),
        h('tbody', null, rows.map((g) => h('tr', null,
          h('td', null, g.label), h('td', { class: 'tnum' }, g.sets), h('td', { class: 'tnum' }, `${fmtKcal(g.volume)} kg`)))))));
}

/** 全期間の自己ベスト。期間の切り替えには連動しない。 */
function bestsCard() {
  const all = allPersonalBests(data());
  const head = h('h2', null, '自己ベスト（全期間）');
  if (!all.length) return h('div', { class: 'card' }, head, empty('まだ記録がありません', '回数を入力すると表示されます。'));
  const dateOf = (b) => b.oneRepMax?.date ?? b.reps?.date;
  const item = (b) => h('div', { class: 'best-row' },
    h('p', null, b.name),
    h('p', { class: 'muted small tnum' }, fmtBests(b)),
    h('p', { class: 'muted tiny tnum' }, `${fmtDate(dateOf(b))}に達成`));
  return h('div', { class: 'card' },
    head,
    all.slice(0, 5).map(item),
    all.length > 5 ? h('details', { class: 'daily' }, h('summary', null, `残り${all.length - 5}種目を見る`), all.slice(5).map(item)) : null);
}

function balanceTrendCard(days) {
  const logged = days.filter((d) => d.hasMeals);
  const summary = balanceSummary(days);
  const target = days[days.length - 1]?.target ?? 0;
  if (!logged.length) {
    return h('div', { class: 'card' }, h('h2', null, 'カロリー収支'), empty('この期間の食事の記録はありません', '食事を記録した日だけ集計します。'));
  }
  const title = h('p', { class: 'readout tnum' });
  const sub = h('p', { class: 'muted small tnum' });
  const showSummary = () => {
    const weekly = weeklyWeightChange(summary.averageBalance);
    title.textContent = `平均 ${fmtSigned(summary.averageBalance)} kcal/日`;
    sub.textContent = `記録 ${summary.loggedDays}/${days.length}日・このペースだと週 ${weekly >= 0 ? '+' : ''}${weekly.toFixed(2)} kg の目安`;
  };
  showSummary();
  const chart = balanceChart({
    days, target,
    onSelect: (day) => {
      if (!day) { showSummary(); return; }
      title.textContent = `${fmtDate(day.date)}：${fmtSigned(day.balance)} kcal`;
      sub.textContent = `摂取 ${fmtKcal(day.intake)}・消費 ${fmtKcal(day.expenditure)} kcal`;
    },
  });
  const swatch = (cls) => h('span', { class: `swatch ${cls}` });
  return h('div', { class: 'card' },
    h('h2', null, 'カロリー収支'),
    title, sub, chart,
    h('div', { class: 'legend' },
      h('span', null, swatch('deficit'), '消費が多い'),
      h('span', null, swatch('surplus'), '摂取が多い'),
      target !== 0 ? h('span', null, swatch('target'), `目標 ${fmtSigned(target)}`) : null),
    h('details', { class: 'daily' },
      h('summary', null, '日別の数値'),
      h('table', null,
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, '日付'), h('th', { scope: 'col' }, '摂取'), h('th', { scope: 'col' }, '収支'))),
        h('tbody', null, [...logged].reverse().map((d) => h('tr', null,
          h('td', null, fmtDate(d.date)), h('td', { class: 'tnum' }, fmtKcal(d.intake)), h('td', { class: 'tnum' }, fmtSigned(d.balance))))))));
}

function lineCard({ title, action, points, start, emptyTitle, emptyDetail }) {
  const head = h('div', { class: 'card-head' }, h('h2', null, title), action);
  if (!points.length) return h('div', { class: 'card' }, head, empty(emptyTitle, emptyDetail));
  const readout = h('p', { class: 'muted small tnum' }, '点をタップすると数値を表示します');
  const chart = lineChart({
    points, start, count: state.period, unit: 'kg', ariaLabel: `${title}の折れ線グラフ`,
    onSelect: (point) => {
      readout.textContent = point ? `${fmtDate(point.date)}：${fmtKg(point.value)} kg` : '点をタップすると数値を表示します';
    },
  });
  return h('div', { class: 'card' }, head, chart, readout);
}

function weightHistoryView() {
  const entries = [...data().weights].sort((a, b) => toDate(b.date) - toDate(a.date));
  return page({
    title: '体重の記録',
    left: backButton(),
    content: entries.length === 0 ? empty('体重の記録はまだありません') : section(null, entries.map((entry) => h('div', { class: 'row' },
      h('span', { class: 'row-label' }, fmtDate(entry.date)),
      h('span', { class: 'tnum' }, `${fmtKg(entry.kg)} kg`),
      iconButton('close', `${fmtDate(entry.date)}の記録を削除`, () => confirmDialog({
        message: `${fmtDate(entry.date)}の体重を削除しますか？`,
        confirmLabel: '削除',
        onConfirm: () => {
          data().weights = data().weights.filter((w) => w.id !== entry.id);
          commit();
          render();
        },
      }), 'quiet')))),
  });
}

// ---------- 設定 ----------

function profileForm({ onboarding }) {
  const defaultBirth = new Date();
  defaultBirth.setFullYear(defaultBirth.getFullYear() - 30);
  const draft = data().profile ? { ...data().profile } : {
    sex: 'male', birthDate: defaultBirth.toISOString(), heightCm: 170, weightKg: 65, activity: 'light', goal: 'maintain',
  };
  const estimates = h('div');
  const saveBtn = button('保存', () => {
    const weightChanged = data().profile?.weightKg !== draft.weightKg;
    data().profile = { ...draft };
    if (weightChanged) recordWeight(data(), draft.weightKg, new Date());
    commit();
    store.flush();
    store.requestPersistence();
    if (onboarding) render();
    else toast('保存しました');
  }, 'primary wide');
  const refresh = () => {
    const valid = draft.heightCm > 0 && draft.weightKg > 0;
    saveBtn.disabled = !valid;
    if (!valid) { estimates.replaceChildren(); return; }
    const basal = bmr({ sex: draft.sex, weightKg: draft.weightKg, heightCm: draft.heightCm, age: ageOn(draft.birthDate, new Date()) });
    const daily = basal * ACTIVITY[draft.activity].factor;
    const line = (label, value) => h('div', { class: 'row' }, h('span', { class: 'row-label' }, label), h('span', { class: 'muted tnum' }, `${fmtKcal(value)} kcal`));
    estimates.replaceChildren(section('推定値',
      line('基礎代謝', basal), line('筋トレなしの日の消費', daily), line('目標の摂取量', daily + GOALS[draft.goal].balance)));
  };
  refresh();
  const set = (key) => (value) => { draft[key] = value; refresh(); };

  return [
    section('からだ',
      row('性別（代謝の計算用）', select(SEX, draft.sex, set('sex'), '性別')),
      row('生年月日', h('input', {
        type: 'date', value: dayKey(draft.birthDate), max: dayKey(new Date()),
        onchange: (e) => {
          const date = dateFromKey(e.target.value);
          if (date) set('birthDate')(date.toISOString());
          else e.target.value = dayKey(draft.birthDate);
        },
      })),
      row('身長', numberField({ value: draft.heightCm, label: '身長', onChange: set('heightCm') }), 'cm'),
      row('体重', numberField({ value: draft.weightKg, label: '体重', onChange: set('weightKg') }), 'kg')),
    section('活動量と目標',
      row('普段の生活', select(labelsOf(ACTIVITY), draft.activity, set('activity'), '普段の生活')),
      row('目標', select(labelsOf(GOALS), draft.goal, set('goal'), '目標'))),
    footnote('筋トレの消費は記録から別に加算するので、普段の生活はトレーニングを除いて選んでください。'),
    estimates,
    saveBtn,
  ];
}

function settingsView() {
  const { lastBackupAt } = data();
  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', class: 'visually-hidden', 'aria-label': 'バックアップファイルを選ぶ', onchange: importData,
  });
  return page({
    title: '設定',
    content: [
      profileForm({ onboarding: false }),
      section('トレーニング',
        row('休憩時間', select(REST_OPTIONS, data().settings.restSeconds, (v) => {
          data().settings.restSeconds = Number(v);
          commit();
        }, '休憩時間')),
        h('label', { class: 'row' }, h('span', { class: 'row-label' }, 'セットを追加したら休憩を始める'),
          h('input', {
            type: 'checkbox', role: 'switch', class: 'switch', checked: data().settings.restAutoStart,
            onchange: (e) => { data().settings.restAutoStart = e.target.checked; commit(); },
          }))),
      footnote('トレーニング画面の右上の「休憩」からも始められます。'),
      section('たんぱく質の目標',
        row('1日の目標', select(PROTEIN_LEVELS, String(data().settings.proteinPerKg), (v) => {
          data().settings.proteinPerKg = Number(v);
          commit();
          render();
        }, 'たんぱく質の目標')),
        h('div', { class: 'row' }, h('span', { class: 'row-label' }, '今日の目標量'),
          h('span', { class: 'muted tnum' }, `${fmtKcal(proteinTarget(data(), new Date()) ?? 0)} g`))),
      footnote('体重はその日時点の記録を使います。持病がある場合などは、医師の指示を優先してください。'),
      section('バックアップ',
        h('div', { class: 'row' }, h('span', { class: 'row-label' }, '最後のバックアップ'),
          h('span', { class: 'muted tnum' }, lastBackupAt ? fmtDate(lastBackupAt) : 'なし')),
        h('button', { type: 'button', class: 'add-row', onclick: exportData }, '記録をファイルに書き出す'),
        h('button', { type: 'button', class: 'add-row', onclick: () => fileInput.click() }, 'ファイルから読み込む'),
        fileInput),
      footnote('記録はこの端末のブラウザ内にだけ保存され、サーバーには送信されません。アプリを削除すると消えるので、ときどき書き出してiCloud Driveなどに保存してください。'),
    ],
  });
}

async function exportData() {
  const stamp = dayKey(new Date());
  const payload = { ...data(), lastBackupAt: new Date().toISOString() };
  const file = new File([JSON.stringify(payload, null, 1)], `musclelog-backup-${stamp}.json`, { type: 'application/json' });
  const finish = () => {
    data().lastBackupAt = payload.lastBackupAt;
    commit();
    render();
    toast('書き出しました');
  };
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      finish();
    } catch (error) {
      // 共有シートを閉じただけのときは何もしない
      if (error.name !== 'AbortError') toast('書き出せませんでした');
    }
    return;
  }
  const url = URL.createObjectURL(file);
  const link = h('a', { href: url, download: file.name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  finish();
}

async function importData(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  let imported;
  try {
    imported = normalizeData(JSON.parse(await file.text()));
  } catch {
    toast('このファイルは読み込めませんでした');
    return;
  }
  confirmDialog({
    message: `今の記録を、ファイルの内容（トレーニング${imported.workouts.length}件・食事${imported.meals.length}件）で置き換えますか？ 元に戻せません。`,
    confirmLabel: '置き換える',
    onConfirm: async () => {
      store.data = imported;
      await store.flush();
      render();
      toast('読み込みました');
    },
  });
}

// ---------- 休憩タイマー ----------
// 画面を描き直しても消えないよう、#app の外に置く。
// 終了時刻を持っておき、アプリが裏に回っていても戻ったときに正しい残り時間を出す。

const rest = { endAt: null, interval: null, node: null, audio: null, done: false };

function startRest(seconds = data().settings.restSeconds) {
  // 音はユーザーの操作の中で準備しないと鳴らせないため、ここで用意する
  try {
    rest.audio ??= new (window.AudioContext || window.webkitAudioContext)();
    rest.audio.resume();
  } catch {
    rest.audio = null;
  }
  rest.endAt = Date.now() + seconds * 1000;
  rest.done = false;
  showRest();
  updateRest();
  clearInterval(rest.interval);
  rest.interval = setInterval(updateRest, 250);
}

function stopRest() {
  clearInterval(rest.interval);
  rest.interval = null;
  rest.endAt = null;
  rest.node?.remove();
  rest.node = null;
  document.body.classList.remove('resting');
}

function adjustRest(deltaSeconds) {
  if (rest.done) {
    if (deltaSeconds > 0) startRest(deltaSeconds);
    return;
  }
  rest.endAt = Math.max(rest.endAt + deltaSeconds * 1000, Date.now());
  updateRest();
}

function showRest() {
  if (rest.node) return;
  rest.node = h('div', { class: 'rest-bar', role: 'timer', 'aria-label': '休憩タイマー' },
    h('div', { class: 'rest-main' },
      h('span', { class: 'rest-label' }, '休憩'),
      h('span', { class: 'rest-time tnum' }),
      h('span', { class: 'visually-hidden', 'aria-live': 'polite' })),
    button('−15秒', () => adjustRest(-15), 'rest-adjust'),
    button('+15秒', () => adjustRest(15), 'rest-adjust'),
    button('終了', stopRest, 'rest-stop'));
  document.body.append(rest.node);
  document.body.classList.add('resting');
}

function updateRest() {
  if (!rest.node || rest.endAt === null) return;
  const left = remainingSeconds(rest.endAt, Date.now());
  const [label, time, live] = rest.node.querySelector('.rest-main').children;
  time.textContent = fmtTimer(left);
  if (left > 0 || rest.done) return;
  rest.done = true;
  clearInterval(rest.interval);
  rest.node.classList.add('is-done');
  label.textContent = '休憩終了';
  time.textContent = '次のセットへ';
  live.textContent = '休憩が終わりました';
  beep();
  navigator.vibrate?.([200, 100, 200]);
}

function beep() {
  const ctx = rest.audio;
  if (!ctx) return;
  [0, 0.25, 0.5].forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + 0.2);
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') updateRest();
});

// ---------- 描画 ----------

const TABS = [
  ['today', '今日', todayView],
  ['workouts', '運動', workoutsView],
  ['meals', '食事', mealsView],
  ['trends', '推移', trendsView],
  ['settings', '設定', settingsView],
];
const TAB_ICONS = { today: 'today', workouts: 'workout', meals: 'meal', trends: 'trends', settings: 'settings' };

const STACK_VIEWS = {
  weightEntry: weightEntryView,
  weightHistory: weightHistoryView,
  workout: workoutDetailView,
  cardio: cardioView,
  exercisePicker: exercisePickerView,
  foodPicker: foodPickerView,
  mealEditor: mealEditorView,
};

function render() {
  const root = document.getElementById('app');
  if (!data().profile) {
    root.replaceChildren(page({
      title: 'はじめに',
      content: [
        h('p', { class: 'intro' }, '消費カロリーの計算に使います。あとから設定タブで変更できます。'),
        profileForm({ onboarding: true }),
      ],
    }));
    return;
  }
  const top = stack[stack.length - 1];
  const view = top
    ? STACK_VIEWS[top.type](top)
    : TABS.find(([key]) => key === state.tab)[2]();
  const tabBar = top ? null : h('nav', { class: 'tabbar', 'aria-label': 'メイン' }, TABS.map(([key, label]) => h('button', {
    type: 'button', class: state.tab === key ? 'active' : '', 'aria-current': state.tab === key ? 'page' : null,
    onclick: () => {
      saveScroll();
      state.tab = key;
      render();
    },
  }, icon(TAB_ICONS[key]), h('span', null, label))));
  root.replaceChildren(...[view, tabBar].filter(Boolean));
  const screen = root.querySelector('.screen');
  if (screen) screen.scrollTop = state.scroll[currentKey()] ?? 0;
}

async function start() {
  // 再読み込みすると重なった画面は消えるので、履歴上の位置もそろえる
  history.replaceState({ depth: 0 }, '');
  await store.load();
  render();
  if (store.unavailable) toast('この環境では記録を保存できません。プライベートブラウズを解除してください。');
  if (store.recovered) toast('保存データを読み込めなかったため、新しいデータで開始しました。');
  if (data().profile) store.requestPersistence();

  // アプリを閉じる前に、待たずに保存する
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') store.flush();
    // 日付をまたいで開き直したとき「今日」を更新する
    else if (!stack.length && !document.activeElement?.matches('input, textarea, select')) render();
  });
  window.addEventListener('pagehide', () => store.flush());

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

start();
