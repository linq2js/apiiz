export interface Configs {
  http?: HttpConfigs;
  onError?(error: ErrorBase): void;
  dismissErrors?: boolean;
  middleware?: Middleware[];
  [key: string]: any;
}

export type OptionBuilder<P = void, T = any> = T | ((payload: P) => T);

export type HttpMethod =
  | "get"
  | "post"
  | "head"
  | "options"
  | "put"
  | "delete"
  | "patch";

export abstract class ErrorBase extends Error {
  constructor(e: any) {
    super(typeof e === "string" ? e : (e?.message as string));
  }
}

export interface Context {
  configs: Configs;
  http: HttpDriver;
}

export interface HttpOptions {
  url: string;
  method?: HttpMethod;
  headers?: Dictionary;
  query?: Dictionary;
  body?: any;
}

export type HttpDriver = (options: HttpOptions) => Promise<HttpResult>;

export interface HttpResult {
  data: any;
}

export interface HttpConfigs<P = any> {
  baseUrl?: string;
  /**
   * Default headers for all HTTP requests
   */
  headers?: OptionBuilder<P, Dictionary>;
  /**
   * Custom HTTP driver
   */
  driver?: HttpDriver;
}

/**
 * API Middleware
 */
export type Middleware<P = any, R = any> = (
  context: Context
) => (next: Dispatcher<P, R>) => Dispatcher<P, R>;

/**
 * API Mappings
 */
export type Mappings<T> = {
  [key in keyof T]: T[key] extends Resolver<infer P, infer R>
    ? Dispatcher<P, R>
    : never;
};

export interface Define {
  <T extends { configs?: Configs; [key: string]: any }>(schema: T): Mappings<T>;
}

export type Resolver<P = any, R = any> = (context: Context) => Dispatcher<P, R>;

export type Dictionary<T = any> = { [key: string]: T };

export type Dispatcher<P = any, R = any> = P extends undefined
  ? (payload?: P) => Promise<R>
  : (payload: P) => Promise<R>;
