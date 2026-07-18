import dayjs from 'dayjs';
import { DATETIME_FORMAT } from '../constants';

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 格式化日期
 */
export function formatDate(date: dayjs.Dayjs | string | Date, format = DATETIME_FORMAT): string {
  return dayjs(date).format(format);
}
