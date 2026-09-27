import { Calendar } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.schedule-free-time.title'),
  path: '/schedule-free-time',
  description: translate('tools.schedule-free-time.description'),
  keywords: ['schedule', 'timetable', 'free', 'time', '课表', '空闲', '课程'],
  component: () => import('./schedule-free-time.vue'),
  icon: Calendar,
  createdAt: new Date('2026-09-27'),
});
