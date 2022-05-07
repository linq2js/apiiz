export interface Configs {
  http?: HttpConfigs;
  onError?(error: ErrorBase): void;
  dismissErrors?: boolean;
  enhancers?: Enhancer[];
  [key: string]: any;
}

export type OptionFactory<P = void, T = any> = T | ((payload: P) => T);

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
  shared: Map<any, any>;
  mappings: any;
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
  headers?: OptionFactory<P, Dictionary>;
  /**
   * Custom HTTP driver
   */
  driver?: HttpDriver;
}

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

export type Dispatcher<P = any, R = any> = (
  payload: P extends undefined ? never : P
) => Promise<R>;

export type Use<PSource, RSource> = Resolver<PSource, RSource> & {
  with<PNext, RNext, A extends any[]>(
    enhancer: Enhancer<PSource, RSource, PNext, RNext, A>,
    ...args: A
  ): Use<PNext, RNext>;
};

export type Enhancer<
  PSource = any,
  RSource = any,
  PNext = PSource,
  RNext = RSource,
  A extends any[] = []
> = (
  resolver: Resolver<PSource, RSource>,
  ...args: A
) => Resolver<PNext, RNext>;

export type Ref<T> = { current: T };

export type ItemOf<A> = A extends Array<infer T> ? T : never;
