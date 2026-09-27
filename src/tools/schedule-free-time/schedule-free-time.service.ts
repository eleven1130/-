// 课表空闲时段计算 —— 核心算法
// 移植自 schedule_core.py，时间统一用「从 00:00 起的分钟数」表示

export interface Course {
  name: string;
  day: number;   // 1=Monday ... 7=Sunday
  start: number; // minutes from 00:00
  end: number;   // minutes from 00:00
}

export const DAY_NAMES = ['', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

/** 'HH:MM' -> 分钟数 */
export function parseTime(s: string): number {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`无法解析时间 "${s}"，应为 HH:MM`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) throw new Error(`时间越界: ${s}`);
  return h * 60 + min;
}

/** 分钟数 -> 'HH:MM' */
export function fmtTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 解析 CSV 文本为课程列表。
 * 每行格式: name,day,start,end
 * 支持 # 开头的注释行和空行
 */
export function parseCoursesCsv(text: string): Course[] {
  const courses: Course[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    // 跳过表头
    if (i === 0 && /^name\s*,\s*day\s*,\s*start\s*,\s*end$/i.test(line)) continue;
    const parts = line.split(',').map(p => p.trim());
    if (parts.length < 4) throw new Error(`第 ${i + 1} 行字段不足，应为 name,day,start,end`);
    const [name, dayStr, startStr, endStr] = parts;
    const day = Number(dayStr);
    if (!Number.isInteger(day) || day < 1 || day > 7) throw new Error(`第 ${i + 1} 行星期几必须是 1-7 的整数`);
    const start = parseTime(startStr);
    const end = parseTime(endStr);
    if (start >= end) throw new Error(`第 ${i + 1} 行开始时间必须早于结束时间`);
    courses.push({ name, day, start, end });
  }
  return courses;
}

/** 合并重叠/相邻区间，gap_tol 为允许吸收的最大间隔（分钟） */
export function mergeIntervals(
  intervals: Array<[number, number]>,
  gapTol = 0,
): Array<[number, number]> {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of sorted) {
    if (merged.length === 0) {
      merged.push([start, end]);
      continue;
    }
    const [lastStart, lastEnd] = merged[merged.length - 1];
    if (start <= lastEnd + gapTol) {
      merged[merged.length - 1] = [lastStart, Math.max(lastEnd, end)];
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

/** 计算某人某天的空闲时段 */
export function freeTimeDay(
  courses: Course[],
  day: number,
  dayStart: number,
  dayEnd: number,
  gapTol = 15,
): Array<[number, number]> {
  const occupied = mergeIntervals(
    courses.filter(c => c.day === day).map(c => [c.start, c.end] as [number, number]),
    gapTol,
  );
  const free: Array<[number, number]> = [];
  let cursor = dayStart;
  for (const [s, e] of occupied) {
    if (e <= dayStart) continue;
    if (s >= dayEnd) break;
    const segStart = Math.max(s, dayStart);
    if (cursor < segStart) free.push([cursor, segStart]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < dayEnd) free.push([cursor, dayEnd]);
  return free
    .map(([s, e]) => [Math.max(s, dayStart), Math.min(e, dayEnd)] as [number, number])
    .filter(([s, e]) => s < e);
}

/** 两组区间的交集（均已按开始时间升序） */
function intersectTwo(
  a: Array<[number, number]>,
  b: Array<[number, number]>,
): Array<[number, number]> {
  let i = 0;
  let j = 0;
  const result: Array<[number, number]> = [];
  while (i < a.length && j < b.length) {
    const s = Math.max(a[i][0], b[j][0]);
    const e = Math.min(a[i][1], b[j][1]);
    if (s < e) result.push([s, e]);
    if (a[i][1] < b[j][1]) i++;
    else j++;
  }
  return result;
}

/** 计算一周内所有人的共同空闲时间，按时长降序 */
export function commonFreeTime(
  peopleCourses: Course[][],
  dayStart: number,
  dayEnd: number,
  gapTol = 15,
): Array<{ day: number; start: number; end: number; duration: number }> {
  if (peopleCourses.length === 0) return [];
  const results: Array<{ day: number; start: number; end: number; duration: number }> = [];
  for (let day = 1; day <= 7; day++) {
    let common = freeTimeDay(peopleCourses[0], day, dayStart, dayEnd, gapTol);
    for (let p = 1; p < peopleCourses.length; p++) {
      common = intersectTwo(common, freeTimeDay(peopleCourses[p], day, dayStart, dayEnd, gapTol));
      if (common.length === 0) break;
    }
    for (const [s, e] of common) {
      results.push({ day, start: s, end: e, duration: e - s });
    }
  }
  results.sort((a, b) => b.duration - a.duration || a.day - b.day || a.start - b.start);
  return results;
}
