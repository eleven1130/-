<script setup lang="ts">
import {
  DAY_NAMES,
  commonFreeTime,
  fmtTime,
  freeTimeDay,
  parseCoursesCsv,
  parseTime,
  type Course,
} from './schedule-free-time.service';

const csvA = ref(`# 同学 A 的课表，每行：课程名,星期几(1-7),开始,结束
线性代数 08,2,08:00,10:30
大学英语(A-1) 08,2,10:45,12:15
程序设计-C语言 04,3,14:00,16:30
工科数学分析I 08,4,09:00,10:30
俄语B1 08,4,14:00,15:30
计算机科学导论 04,4,15:45,17:15`);

const csvB = ref(`# 同学 B 的课表
声乐4（流行音乐）01,1,10:45,12:15
工科数学分析I 08,1,15:45,17:15
线性代数 08,2,08:00,10:30
大学英语(A-1) 08,2,10:45,12:15
程序设计-C语言 04,3,14:00,16:30
工科数学分析I 08,4,09:00,10:30
俄语B1 08,4,14:00,15:30
计算机科学导论 04,4,15:45,17:15`);

const dayStart = ref('08:00');
const dayEnd = ref('22:00');
const gapTol = ref(15);

const errorA = ref('');
const errorB = ref('');

const coursesA = computed<Course[]>(() => {
  try {
    errorA.value = '';
    return parseCoursesCsv(csvA.value);
  } catch (e) {
    errorA.value = (e as Error).message;
    return [];
  }
});

const coursesB = computed<Course[]>(() => {
  try {
    errorB.value = '';
    return parseCoursesCsv(csvB.value);
  } catch (e) {
    errorB.value = (e as Error).message;
    return [];
  }
});

const ds = computed(() => parseTime(dayStart.value));
const de = computed(() => parseTime(dayEnd.value));
const validRange = computed(() => ds.value < de.value);

function freeSlots(courses: Course[]) {
  if (!validRange.value) return [];
  return Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    return {
      day,
      slots: freeTimeDay(courses, day, ds.value, de.value, gapTol.value),
    };
  });
}

const freeA = computed(() => freeSlots(coursesA.value));
const freeB = computed(() => freeSlots(coursesB.value));

const common = computed(() => {
  if (!validRange.value) return [];
  return commonFreeTime([coursesA.value, coursesB.value], ds.value, de.value, gapTol.value);
});

function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}小时${m > 0 ? m + '分钟' : ''}` : `${m}分钟`;
}
</script>

<template>
  <div style="flex: 0 0 100%">
    <div style="margin: 0 auto; max-width: 1100px">
      <!-- 说明 -->
      <c-card mb-3>
        <div text-lg font-600 mb-2>课表空闲时段计算</div>
        <div text-sm op-70>
          粘贴课表（CSV 格式：课程名,星期几,开始时间,结束时间；星期几 1=周一 … 7=周日），
          自动算出每天的空闲时段，并支持两人共同空闲时间。连堂课中间的小间隔（默认 ≤15 分钟）会被合并，避免碎片。
        </div>
      </c-card>

      <!-- 全局设置 -->
      <c-card mb-3>
        <div flex gap-4 flex-wrap items-center>
          <div flex items-center gap-2>
            <span text-sm>每日可用开始</span>
            <n-input v-model:value="dayStart" style="width: 100px" />
          </div>
          <div flex items-center gap-2>
            <span text-sm>每日可用结束</span>
            <n-input v-model:value="dayEnd" style="width: 100px" />
          </div>
          <div flex items-center gap-2>
            <span text-sm>合并间隔阈值(分钟)</span>
            <n-input-number v-model:value="gapTol" :min="0" :max="120" style="width: 110px" />
          </div>
          <div v-if="!validRange" text-red-5 text-sm>开始时间必须早于结束时间</div>
        </div>
      </c-card>

      <!-- 两个课表输入 -->
      <div grid-cols-1 md:grid-cols-2 gap-3 mb-3 style="display: grid">
        <c-card>
          <div font-600 mb-2>同学 A 的课表</div>
          <n-input
            v-model:value="csvA"
            type="textarea"
            :autosize="{ minRows: 8, maxRows: 14 }"
            placeholder="课程名,星期几,开始,结束"
          />
          <div v-if="errorA" text-red-5 text-sm mt-1>{{ errorA }}</div>
          <div v-else text-green-6 text-sm mt-1>✓ 已解析 {{ coursesA.length }} 节课</div>
        </c-card>
        <c-card>
          <div font-600 mb-2>同学 B 的课表</div>
          <n-input
            v-model:value="csvB"
            type="textarea"
            :autosize="{ minRows: 8, maxRows: 14 }"
            placeholder="课程名,星期几,开始,结束"
          />
          <div v-if="errorB" text-red-5 text-sm mt-1>{{ errorB }}</div>
          <div v-else text-green-6 text-sm mt-1>✓ 已解析 {{ coursesB.length }} 节课</div>
        </c-card>
      </div>

      <!-- 结果 -->
      <n-tabs type="line" animated>
        <n-tab-pane name="A" tab="同学 A 的空闲时段">
          <div v-for="d in freeA" :key="d.day" mb-2>
            <c-card>
              <div font-600 mb-1>{{ DAY_NAMES[d.day] }}</div>
              <div v-if="d.slots.length === 0" text-sm op-60>（无空闲）</div>
              <div v-else flex flex-wrap gap-2>
                <n-tag v-for="(s, i) in d.slots" :key="i" type="success" round>
                  {{ fmtTime(s[0]) }} - {{ fmtTime(s[1]) }}（{{ fmtDuration(s[1] - s[0]) }}）
                </n-tag>
              </div>
            </c-card>
          </div>
        </n-tab-pane>

        <n-tab-pane name="B" tab="同学 B 的空闲时段">
          <div v-for="d in freeB" :key="d.day" mb-2>
            <c-card>
              <div font-600 mb-1>{{ DAY_NAMES[d.day] }}</div>
              <div v-if="d.slots.length === 0" text-sm op-60>（无空闲）</div>
              <div v-else flex flex-wrap gap-2>
                <n-tag v-for="(s, i) in d.slots" :key="i" type="success" round>
                  {{ fmtTime(s[0]) }} - {{ fmtTime(s[1]) }}（{{ fmtDuration(s[1] - s[0]) }}）
                </n-tag>
              </div>
            </c-card>
          </div>
        </n-tab-pane>

        <n-tab-pane name="common" tab="两人共同空闲（按时长降序）">
          <c-card>
            <div v-if="common.length === 0" text-sm op-60>（无共同空闲时间）</div>
            <n-space v-else vertical>
              <div
                v-for="(c, i) in common"
                :key="i"
                flex items-center justify-between
                p-2
                rounded
                :style="{ background: 'var(--n-color-target)' }"
              >
                <span font-600>{{ DAY_NAMES[c.day] }}</span>
                <span>
                  {{ fmtTime(c.start) }} - {{ fmtTime(c.end) }}
                </span>
                <n-tag type="info" round>{{ fmtDuration(c.duration) }}</n-tag>
              </div>
            </n-space>
          </c-card>
        </n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>
