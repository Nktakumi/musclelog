// 計算と整形。DOMに依存しないのでNodeでテストできる。
import { RENAMED_EXERCISES } from './catalog.js';

export const SEX = { male: '男性', female: '女性' };

/** トレーニングを除いた普段の活動量。筋トレは別に加算するので係数を低めにしている。 */
export const ACTIVITY = {
  sedentary: { label: '座り仕事が中心', factor: 1.2 },
  light: { label: '座り仕事＋通勤や家事', factor: 1.3 },
  moderate: { label: '立ち仕事や移動が多い', factor: 1.45 },
  active: { label: '力仕事が中心', factor: 1.6 },
};

export const GOALS = {
  cut: { label: '減量（-500 kcal/日）', balance: -500 },
  mildCut: { label: 'ゆるやかに減量（-250 kcal/日）', balance: -250 },
  maintain: { label: '維持（±0 kcal/日）', balance: 0 },
  leanBulk: { label: 'ゆるやかに増量（+250 kcal/日）', balance: 250 },
  bulk: { label: '増量（+500 kcal/日）', balance: 500 },
};

export const INTENSITY = {
  light: { label: '軽め', mets: 3.5 },
  moderate: { label: '普通', mets: 5 },
  hard: { label: 'きつい', mets: 6 },
};

export const CARDIO = { walk: 'ウォーキング', run: 'ランニング' };

export const REST_OPTIONS = { 60: '60秒', 90: '90秒', 120: '2分', 150: '2分30秒', 180: '3分', 240: '4分' };
export const REST_MIN = 15;
export const REST_MAX = 900;

/** 例: 135 → 2分15秒 */
export function restLabel(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (!m) return `${s}秒`;
  return s ? `${m}分${s}秒` : `${m}分`;
}

/** 選択肢に今の値がなければ足す（±15秒で調整した値を表示するため） */
export function restOptions(current) {
  if (Object.hasOwn(REST_OPTIONS, String(current))) return REST_OPTIONS;
  return Object.fromEntries(
    [...Object.entries(REST_OPTIONS), [String(current), `${restLabel(current)}（前回）`]]
      .sort((a, b) => Number(a[0]) - Number(b[0])),
  );
}

/** 体重1kgあたりのたんぱく質の目標（g） */
export const PROTEIN_LEVELS = {
  '1.2': '体重 × 1.2g',
  '1.6': '体重 × 1.6g（筋トレ時の目安）',
  '2': '体重 × 2.0g',
  '2.2': '体重 × 2.2g（減量中など）',
};

export const defaultSettings = () => ({ restSeconds: 90, restAutoStart: true, proteinPerKg: 1.6 });

export const MUSCLE_GROUPS = {
  chest: '胸', back: '背中', shoulders: '肩', arms: '腕', legs: '脚', core: '体幹', fullBody: '全身', other: 'その他',
};

export const EQUIPMENT = {
  barbell: 'バーベル', dumbbell: 'ダンベル', kettlebell: 'ケトルベル', machine: 'マシン', cable: 'ケーブル',
  plate: 'プレート', band: 'チューブ', suspension: 'サスペンション', bodyweight: '自重', other: 'その他',
};

export const MEAL_TYPES = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' };

export const FOOD_CATEGORIES = {
  staple: '主食', meat: '肉', fish: '魚', eggSoy: '卵・大豆', dairy: '乳製品',
  supplement: 'プロテイン・補助食品', vegetableFruit: '野菜・果物・ナッツ', other: 'その他',
};

export const FOOD_UNITS = ['食', '個', '杯', '本', '枚', 'g', 'ml'];

const KCAL_PER_KG_FAT = 7700;

// ---------- 日付 ----------

export const toDate = (value) => (value instanceof Date ? value : new Date(value));

export function startOfDay(value) {
  const d = toDate(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(value, days) {
  const d = startOfDay(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** 端末の時間帯での日付キー */
export function dayKey(value) {
  const d = toDate(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const sameDay = (a, b) => dayKey(a) === dayKey(b);

/** date入力の値（YYYY-MM-DD）を端末時間の正午にする。日付がずれにくい。 */
export function dateFromKey(key, hour = 12) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour);
}

export function ageOn(birthDate, date) {
  const b = toDate(birthDate);
  const d = toDate(date);
  let age = d.getFullYear() - b.getFullYear();
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) age -= 1;
  return Math.max(age, 0);
}

// ---------- 数値入力 ----------

/** 全角数字・全角ピリオド・小数点カンマも受け付ける。解釈できなければ null。 */
export function parseDecimal(text) {
  const normalized = String(text ?? '')
    .replace(/[０-９．，]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/,/g, '.')
    .trim();
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function parseInteger(text) {
  const value = parseDecimal(text);
  return value !== null && Number.isInteger(value) ? value : null;
}

/** 入力欄に出す表記 */
export const displayNumber = (value) => (Number.isFinite(value) ? String(Math.round(value * 1000) / 1000) : '');

// ---------- 表示 ----------

const zero = (v) => (Object.is(v, -0) ? 0 : v);

export const fmtKcal = (v) => zero(Math.round(v)).toLocaleString('ja-JP');
export const fmtSigned = (v) => (Math.round(v) > 0 ? `+${fmtKcal(v)}` : fmtKcal(v));
export const fmtKg = (v) => (Math.round(v * 10) / 10).toLocaleString('ja-JP', { maximumFractionDigits: 1 });
export const fmtShortDate = (v) => `${toDate(v).getMonth() + 1}/${toDate(v).getDate()}`;
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
export const fmtDate = (v) => `${fmtShortDate(v)}（${WEEKDAYS[toDate(v).getDay()]}）`;
export const fmtSet = (s) => (s.weightKg > 0 ? `${fmtKg(s.weightKg)}kg×${s.reps}` : `自重×${s.reps}`);

// ---------- カロリー ----------

/** 基礎代謝（Mifflin-St Jeor式） */
export function bmr({ sex, weightKg, heightCm, age }) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
}

/** 基礎代謝を別に数えているので、安静時の 1 MET を引いた正味の値にする */
export function workoutBurn(workout, weightKg) {
  const mets = INTENSITY[workout.intensity]?.mets ?? INTENSITY.moderate.mets;
  return Math.max(mets - 1, 0) * weightKg * (Math.max(workout.durationMinutes, 0) / 60) * 1.05;
}

// ---------- 有酸素 ----------

/** 歩幅の目安（身長 × 0.45）。km単位。 */
export const strideKm = (heightCm) => (heightCm * 0.45) / 100000;

export function cardioDistanceKm(entry, heightCm) {
  if (entry.type === 'walk') return (entry.steps ?? 0) * strideKm(heightCm);
  return entry.distanceKm ?? 0;
}

/**
 * 有酸素運動の消費。基礎代謝は別に数えているので、安静時の分を除いた正味の値にする。
 * ACSMの代謝計算式（平地）をもとに、歩行は 0.5、走行は 1.0 kcal/kg/km。
 * 走行は速さによらず、距離と体重でほぼ決まる。
 */
export function cardioBurn(entry, weightKg, heightCm) {
  const perKgKm = entry.type === 'run' ? 1.0 : 0.5;
  return perKgKm * weightKg * cardioDistanceKm(entry, heightCm);
}

/** 1kmあたりのペース（分）。時間か距離がなければ null。 */
export function paceMinutesPerKm(entry, heightCm) {
  const km = cardioDistanceKm(entry, heightCm);
  return entry.durationMinutes > 0 && km > 0 ? entry.durationMinutes / km : null;
}

export function fmtPace(minutes) {
  if (minutes === null) return null;
  const total = Math.round(minutes * 60);
  return `${Math.floor(total / 60)}分${String(total % 60).padStart(2, '0')}秒/km`;
}

export function weightOn(data, date) {
  const end = addDays(date, 1).getTime();
  let latest = null;
  for (const entry of data.weights) {
    const time = toDate(entry.date).getTime();
    if (time < end && (!latest || time > toDate(latest.date).getTime())) latest = entry;
  }
  return latest ? latest.kg : data.profile?.weightKg ?? null;
}

export function dayBalance(data, date) {
  const weight = weightOn(data, date);
  if (!data.profile || weight === null) return null;
  const { profile } = data;
  const day = startOfDay(date);
  const meals = data.meals.filter((m) => sameDay(m.date, day));
  const basal = bmr({ sex: profile.sex, weightKg: weight, heightCm: profile.heightCm, age: ageOn(profile.birthDate, day) });
  const dailyActivity = basal * ((ACTIVITY[profile.activity]?.factor ?? 1.2) - 1);
  const burn = data.workouts.filter((w) => sameDay(w.date, day)).reduce((sum, w) => sum + workoutBurn(w, weight), 0);
  const cardio = data.cardio
    .filter((c) => sameDay(c.date, day))
    .reduce((sum, c) => sum + cardioBurn(c, weight, profile.heightCm), 0);
  const intake = meals.reduce((sum, m) => sum + m.kcal, 0);
  const expenditure = basal + dailyActivity + burn + cardio;
  const target = GOALS[profile.goal]?.balance ?? 0;
  return {
    date: day, intake, basal, dailyActivity, workoutBurn: burn, cardioBurn: cardio, expenditure, target,
    balance: intake - expenditure,
    targetIntake: expenditure + target,
    remaining: expenditure + target - intake,
    // 食事の記録がない日を「大幅な赤字」と誤認させないために持つ
    hasMeals: meals.length > 0,
  };
}

export function dayBalances(data, days, end) {
  const result = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const balance = dayBalance(data, addDays(end, -offset));
    if (balance) result.push(balance);
  }
  return result;
}

/** 未記録の日は平均に含めない */
export function balanceSummary(days) {
  const logged = days.filter((d) => d.hasMeals);
  if (!logged.length) return { loggedDays: 0, averageBalance: null };
  return { loggedDays: logged.length, averageBalance: logged.reduce((sum, d) => sum + d.balance, 0) / logged.length };
}

export const weeklyWeightChange = (averageBalance) => (averageBalance * 7) / KCAL_PER_KG_FAT;

// ---------- カレンダー ----------

/** 月の各日に、筋トレと有酸素運動をしたかどうか。キーは dayKey。 */
export function activityDays(data, year, monthIndex) {
  const days = new Map();
  const mark = (date, key) => {
    const d = toDate(date);
    if (d.getFullYear() !== year || d.getMonth() !== monthIndex) return;
    const k = dayKey(d);
    days.set(k, { strength: false, cardio: false, ...days.get(k), [key]: true });
  };
  data.workouts.filter((w) => !isEmptyWorkout(w)).forEach((w) => mark(w.date, 'strength'));
  data.cardio.forEach((c) => mark(c.date, 'cardio'));
  return days;
}

/** カレンダーのマス。日曜はじまりで、前後の月の分は null。 */
export function monthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array(first.getDay()).fill(null);
  for (let day = 1; day <= count; day += 1) cells.push(new Date(year, monthIndex, day, 12));
  while (cells.length % 7) cells.push(null);
  return cells;
}

// ---------- たんぱく質 ----------

export function proteinTarget(data, date) {
  const weight = weightOn(data, date);
  return weight ? weight * data.settings.proteinPerKg : null;
}

/** たんぱく質を入力した食事だけを合計する */
export const proteinIntake = (data, date) =>
  data.meals.filter((m) => sameDay(m.date, date)).reduce((sum, m) => sum + (m.proteinG ?? 0), 0);

// ---------- 休憩タイマー ----------

export const remainingSeconds = (endAt, now) => Math.max(Math.ceil((endAt - now) / 1000), 0);

export function fmtTimer(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// ---------- 筋トレ ----------

export const epley = (weightKg, reps) => {
  if (!(weightKg > 0) || !(reps > 0)) return null;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
};

/** 種目ごとの計算式の除数。一覧にない種目はEpley式を使う。 */
const ONE_RM_DIVISORS = {
  'ベンチプレス（バーベル）': 40,
  'スクワット（バーベル）': 33.3,
  'デッドリフト（バーベル）': 33.3,
};

/** 推定1RM。1回だけ挙げたセットは、その重量をそのまま使う。 */
export function estimateOneRepMax(name, weightKg, reps) {
  const divisor = ONE_RM_DIVISORS[name];
  if (!divisor) return epley(weightKg, reps);
  if (!(weightKg > 0) || !(reps > 0)) return null;
  return reps === 1 ? weightKg : (weightKg * reps) / divisor + weightKg;
}

export const recordedSets = (exercise) => exercise.sets.filter((s) => s.reps > 0);
export const volumeOf = (workout) =>
  workout.exercises.reduce((sum, e) => sum + e.sets.reduce((s, set) => s + set.weightKg * set.reps, 0), 0);
export const setCountOf = (workout) => workout.exercises.reduce((sum, e) => sum + recordedSets(e).length, 0);
export const isEmptyWorkout = (w) => w.exercises.length === 0 && !w.note;

const byDateDesc = (a, b) => toDate(b.date).getTime() - toDate(a.date).getTime();

/** 指定日より前で、同じ種目を記録した直近の内容 */
export function previousPerformance(data, name, before) {
  const day = startOfDay(before).getTime();
  const earlier = data.workouts.filter((w) => toDate(w.date).getTime() < day).sort(byDateDesc);
  for (const workout of earlier) {
    const found = workout.exercises.find((e) => e.name === name && recordedSets(e).length > 0);
    if (found) return found;
  }
  return null;
}

export function oneRepMaxHistory(data, name) {
  const best = new Map();
  for (const workout of data.workouts) {
    const values = workout.exercises
      .filter((e) => e.name === name)
      .flatMap((e) => e.sets.map((s) => estimateOneRepMax(name, s.weightKg, s.reps)))
      .filter((v) => v !== null);
    if (!values.length) continue;
    const key = dayKey(workout.date);
    best.set(key, Math.max(best.get(key) ?? 0, ...values));
  }
  return [...best.entries()].map(([key, value]) => ({ date: dateFromKey(key), value })).sort((a, b) => a.date - b.date);
}

export function usedExerciseNames(data) {
  const names = new Set();
  for (const workout of [...data.workouts].sort(byDateDesc)) {
    for (const exercise of workout.exercises) {
      if (recordedSets(exercise).length) names.add(exercise.name);
    }
  }
  return [...names];
}

/** ひらがなとカタカナ、英字の大小を区別せずに探す */
export function matchesSearch(name, query) {
  const fold = (text) => text.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60)).toLowerCase();
  const q = (query || '').trim();
  return !q || fold(name).includes(fold(q));
}

// ---------- 自己ベスト ----------

const better = (current, value, date) => (!current || value > current.value ? { value, date } : current);

/** 指定した種目の自己ベスト。until より前の記録だけに絞れる。 */
export function personalBests(data, name, { until = null, excludeId = null } = {}) {
  const bests = { oneRepMax: null, weight: null, reps: null };
  for (const workout of data.workouts) {
    if (workout.id === excludeId) continue;
    if (until && toDate(workout.date).getTime() >= toDate(until).getTime()) continue;
    for (const exercise of workout.exercises) {
      if (exercise.name !== name) continue;
      for (const set of recordedSets(exercise)) {
        if (set.weightKg > 0) {
          bests.oneRepMax = better(bests.oneRepMax, estimateOneRepMax(name, set.weightKg, set.reps), workout.date);
          bests.weight = better(bests.weight, set.weightKg, workout.date);
        } else {
          // 自重の種目は回数で比べる
          bests.reps = better(bests.reps, set.reps, workout.date);
        }
      }
    }
  }
  return bests;
}

/**
 * このトレーニングで更新した自己ベスト。
 * 種目を初めて記録したときは、すべてが更新になってしまうので数えない。
 * 同じ項目を複数のセットで更新しても、一番良いセットにだけ付ける。
 */
export function workoutRecords(data, workout) {
  const bySet = new Map();
  const names = new Set();
  for (const name of new Set(workout.exercises.map((e) => e.name))) {
    const prior = personalBests(data, name, { until: workout.date, excludeId: workout.id });
    const sets = workout.exercises.filter((e) => e.name === name).flatMap(recordedSets);
    const metrics = [
      ['推定1RM', prior.oneRepMax, (s) => (s.weightKg > 0 ? estimateOneRepMax(name, s.weightKg, s.reps) : null)],
      ['重量', prior.weight, (s) => (s.weightKg > 0 ? s.weightKg : null)],
      ['回数', prior.reps, (s) => (s.weightKg > 0 ? null : s.reps)],
    ];
    for (const [label, previous, valueOf] of metrics) {
      if (!previous) continue;
      let top = null;
      let topValue = previous.value;
      for (const set of sets) {
        const value = valueOf(set);
        if (value !== null && value > topValue) {
          top = set;
          topValue = value;
        }
      }
      if (top) {
        bySet.set(top.id, [...(bySet.get(top.id) ?? []), label]);
        names.add(name);
      }
    }
  }
  return { bySet, exerciseCount: names.size };
}

/** 記録のある全種目の自己ベスト（新しく使った順） */
export function allPersonalBests(data) {
  return usedExerciseNames(data).map((name) => ({ name, ...personalBests(data, name) }));
}

export function fmtBests(bests) {
  return [
    bests.oneRepMax ? `推定1RM ${fmtKg(bests.oneRepMax.value)}kg` : null,
    bests.weight ? `重量 ${fmtKg(bests.weight.value)}kg` : null,
    bests.reps ? `${bests.reps.value}回` : null,
  ].filter(Boolean).join('・');
}

// ---------- 部位別の集計 ----------

/** start 以降の部位別のセット数と総負荷。セットのない部位も0で返す。 */
export function muscleSummary(data, start) {
  const groups = Object.fromEntries(Object.keys(MUSCLE_GROUPS).map((key) => [key, { sets: 0, volume: 0 }]));
  const from = toDate(start).getTime();
  for (const workout of data.workouts) {
    if (toDate(workout.date).getTime() < from) continue;
    for (const exercise of workout.exercises) {
      const group = groups[exercise.group] ?? groups.other;
      for (const set of recordedSets(exercise)) {
        group.sets += 1;
        group.volume += set.weightKg * set.reps;
      }
    }
  }
  return Object.entries(groups).map(([key, value]) => ({ key, label: MUSCLE_GROUPS[key], ...value }));
}

// ---------- 食品 ----------

const round1 = (v) => Math.round(v * 10) / 10;

export function foodNutrition(food, amount) {
  if (!(food.baseAmount > 0) || !(amount > 0)) return { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 };
  const ratio = amount / food.baseAmount;
  const n = food.nutrition;
  return {
    kcal: round1(n.kcal * ratio), proteinG: round1(n.proteinG * ratio),
    fatG: round1(n.fatG * ratio), carbsG: round1(n.carbsG * ratio),
  };
}

/** 量を変えると栄養値を計算し直す */
export function setMealAmount(meal, amount) {
  meal.amount = amount;
  if (meal.food) Object.assign(meal, foodNutrition(meal.food, amount));
  return meal;
}

export const mealAmountLabel = (meal) =>
  meal.food && meal.amount != null ? `${displayNumber(meal.amount)}${meal.food.unit}` : null;

export const foodStep = (unit) => (unit === 'g' || unit === 'ml' ? 10 : 0.5);

export function recentMeals(data, limit = 5) {
  const seen = new Set();
  const result = [];
  for (const meal of [...data.meals].sort(byDateDesc)) {
    if (!meal.name || seen.has(meal.name)) continue;
    seen.add(meal.name);
    result.push(meal);
    if (result.length === limit) break;
  }
  return result;
}

// ---------- 更新 ----------

/** 1日1件。最新の記録ならプロフィールの体重も合わせる。 */
export function recordWeight(data, kg, date) {
  const existing = data.weights.find((w) => sameDay(w.date, date));
  if (existing) existing.kg = kg;
  else data.weights.push({ id: newId(), date: toDate(date).toISOString(), kg });
  const newest = [...data.weights].sort(byDateDesc)[0];
  if (data.profile && newest && sameDay(newest.date, date)) data.profile.weightKg = kg;
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ---------- データの読み込みと検証 ----------

export const emptyData = () => ({
  settings: defaultSettings(), profile: null, workouts: [], cardio: [], meals: [], weights: [], customExercises: [], customFoods: [], lastBackupAt: null,
});

const list = (value) => (Array.isArray(value) ? value : []);
const num = (value, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const optNum = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const str = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
const oneOf = (value, table, fallback) => (Object.hasOwn(table, value) ? value : fallback);
const validDate = (value) => typeof value === 'string' && !Number.isNaN(new Date(value).getTime());

function cleanNutrition(raw) {
  return {
    kcal: num(raw?.kcal), proteinG: num(raw?.proteinG), fatG: num(raw?.fatG), carbsG: num(raw?.carbsG),
  };
}

function cleanFood(raw) {
  if (!raw || typeof raw !== 'object' || !str(raw.name)) return null;
  return {
    id: str(raw.id) || newId(),
    name: raw.name,
    category: oneOf(raw.category, FOOD_CATEGORIES, 'other'),
    baseAmount: num(raw.baseAmount, 1),
    unit: str(raw.unit, '食'),
    defaultAmount: num(raw.defaultAmount, 1),
    nutrition: cleanNutrition(raw.nutrition),
  };
}

/**
 * 保存データやバックアップを安全な形にそろえる。JSONとして読めても想定外の形なら例外にする。
 * SwiftUI版のデータもそのまま読める。
 */
export function normalizeData(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('記録のファイルではありません');
  const known = ['profile', 'workouts', 'cardio', 'meals', 'weights', 'customExercises', 'customFoods'];
  if (!known.some((key) => key in raw)) throw new Error('記録のファイルではありません');

  const data = emptyData();
  const p = raw.profile;
  if (p && typeof p === 'object' && validDate(p.birthDate)) {
    data.profile = {
      sex: oneOf(p.sex, SEX, 'male'),
      birthDate: p.birthDate,
      heightCm: num(p.heightCm, 170),
      weightKg: num(p.weightKg, 65),
      activity: oneOf(p.activity, ACTIVITY, 'light'),
      goal: oneOf(p.goal, GOALS, 'maintain'),
    };
  }
  data.workouts = list(raw.workouts).filter((w) => w && validDate(w.date)).map((w) => ({
    id: str(w.id) || newId(),
    date: w.date,
    durationMinutes: num(w.durationMinutes, 60),
    intensity: oneOf(w.intensity, INTENSITY, 'moderate'),
    note: str(w.note),
    exercises: list(w.exercises).filter((e) => e && str(e.name)).map((e) => ({
      id: str(e.id) || newId(),
      name: RENAMED_EXERCISES[e.name] ?? e.name,
      group: oneOf(e.group, MUSCLE_GROUPS, 'other'),
      sets: list(e.sets).filter(Boolean).map((s) => ({
        id: str(s.id) || newId(), weightKg: num(s.weightKg), reps: Math.trunc(num(s.reps)),
      })),
    })),
  }));
  data.cardio = list(raw.cardio)
    .filter((c) => c && validDate(c.date) && Object.hasOwn(CARDIO, c.type))
    .map((c) => ({
      id: str(c.id) || newId(),
      date: c.date,
      type: c.type,
      steps: c.type === 'walk' ? Math.trunc(num(c.steps)) : null,
      distanceKm: c.type === 'run' ? num(c.distanceKm) : null,
      durationMinutes: num(c.durationMinutes),
      note: str(c.note),
    }));
  data.meals = list(raw.meals).filter((m) => m && validDate(m.date)).map((m) => ({
    id: str(m.id) || newId(),
    date: m.date,
    type: oneOf(m.type, MEAL_TYPES, 'snack'),
    name: str(m.name),
    kcal: num(m.kcal),
    proteinG: optNum(m.proteinG),
    fatG: optNum(m.fatG),
    carbsG: optNum(m.carbsG),
    food: cleanFood(m.food),
    amount: optNum(m.amount),
  }));
  data.weights = list(raw.weights)
    .filter((w) => w && validDate(w.date) && num(w.kg) > 0)
    .map((w) => ({ id: str(w.id) || newId(), date: w.date, kg: w.kg }));
  data.customExercises = list(raw.customExercises).filter((e) => e && str(e.name)).map((e) => ({
    id: str(e.id) || newId(),
    name: e.name,
    group: oneOf(e.group, MUSCLE_GROUPS, 'other'),
    equipment: Object.hasOwn(EQUIPMENT, e.equipment) ? e.equipment : null,
    target: typeof e.target === 'string' ? e.target : null,
  }));
  data.customFoods = list(raw.customFoods).map(cleanFood).filter(Boolean);
  data.lastBackupAt = validDate(raw.lastBackupAt) ? raw.lastBackupAt : null;
  const s = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  data.settings = {
    restSeconds: Number.isInteger(s.restSeconds) && s.restSeconds >= REST_MIN && s.restSeconds <= REST_MAX ? s.restSeconds : 90,
    restAutoStart: typeof s.restAutoStart === 'boolean' ? s.restAutoStart : true,
    proteinPerKg: Object.hasOwn(PROTEIN_LEVELS, String(s.proteinPerKg)) ? s.proteinPerKg : 1.6,
  };
  // 開始しただけで何も入力していないトレーニングは残さない
  data.workouts = data.workouts.filter((w) => !isEmptyWorkout(w));
  return data;
}
