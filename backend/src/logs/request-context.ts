import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  ip?: string;
  userAgent?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContextData>();

export function getRequestContext(): RequestContextData | undefined {
  return requestContext.getStore();
}
