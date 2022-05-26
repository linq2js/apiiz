export interface Configs {
  http?: HttpConfigs;
  onError?(error: ErrorBase): void;
  dismissErrors?: boolean;
  enhancers?: Enhancer[];
  [key: string]: any;
}

export type OptionFactory<P = void, T = any> = ((payload: P) => T) | T;

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
  token?: CancelToken;
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
    : T[key] extends CancellableResolver<infer P, infer R>
    ? (payload: P) => Promise<R> & { cancel(): void }
    : never;
};

export interface Define {
  <T extends { configs?: Configs; [key: string]: any }>(schema: T): Mappings<
    Omit<T, "configs">
  >;
}

export type Resolver<P = any, R = any> = (context: Context) => Dispatcher<P, R>;

export type Dictionary<T = any> = { [key: string]: T };

export type Dispatcher<P = any, R = any> = (payload: P) => Promise<R>;

export type EnhanceResult<PSource, RSource> = Resolver<PSource, RSource> & {
  with<PNext, RNext, A extends any[]>(
    enhancer: Enhancer<PSource, RSource, PNext, RNext, A>,
    ...args: A
  ): EnhanceResult<PNext, RNext>;
};

export interface Enhance {
  /**
   * create new enhancer from original resolver
   * @param resolver
   * @param fn enhance function
   * @returns
   */
  <P, R, PN = P, RN = R>(
    resolver: Resolver<P, R>,
    fn: (context: Context, dispatcher: Dispatcher<P, R>, payload: PN) => RN
  ): Resolver<PN, RN>;

  <P, R>(resolver: Resolver<P, R>): EnhanceResult<P, R>;
}

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

export interface CancelToken {
  reset(): void;
  isCancelled(): boolean;
  cancel(): void;
  signal(): AbortController["signal"] | undefined;
}

export interface Cancellable {
  <P, R>(fn: (token: CancelToken) => Resolver<P, R>): CancellableResolver<P, R>;
  /**
   * enhancer
   */
  <P, R>(resolver: Resolver<P, R>, token: CancelToken): CancellableResolver<
    P,
    R
  >;
}

export type CancellableResolver<P, R> = Resolver<P, R> & { token: CancelToken };
