// 全局类型定义

/** 通用分页参数 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** 通用分页响应 */
export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
