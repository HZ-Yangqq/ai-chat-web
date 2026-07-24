/**
 * 统一请求封装
 * - 自动拼接 baseURL
 * - 统一错误处理
 * - 支持请求/响应拦截
 */

import { API_BASE_URL } from '@/constants';

/** 通用响应结构 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

/** 请求配置 */
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** 请求体（会自动 JSON.stringify） */
  body?: unknown;
  /** 是否跳过错误提示 */
  silent?: boolean;
  /** 超时时间（ms），默认 30000 */
  timeout?: number;
}

/** 请求错误 */
export class RequestError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = 'RequestError';
    this.code = code;
  }
}

/** 核心请求方法 */
async function request<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, silent, timeout = 30000, headers, ...restInit } = options;

  // 超时控制
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      ...restInit,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    // HTTP 错误
    if (!res.ok) {
      const errMsg = `请求失败: ${res.status} ${res.statusText}`;
      if (!silent) console.error(`[Request Error] ${url}`, errMsg);
      throw new RequestError(errMsg, res.status);
    }

    const data: ApiResponse<T> = await res.json();

    // 业务错误
    if (!data.success) {
      const errMsg = data.error || '未知业务错误';
      if (!silent) console.error(`[Business Error] ${url}`, errMsg);
      throw new RequestError(errMsg, data.code ?? -1);
    }

    return data.data as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new RequestError(`请求超时 (${timeout}ms)`, 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** GET 请求 */
export function get<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
  return request<T>(url, { ...options, method: 'GET' });
}

/** POST 请求 */
export function post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(url, { ...options, method: 'POST', body });
}

/** PUT 请求 */
export function put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(url, { ...options, method: 'PUT', body });
}

/** DELETE 请求 */
export function del<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
  return request<T>(url, { ...options, method: 'DELETE' });
}

export default request;
