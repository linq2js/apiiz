export interface Configs {
  http?: HttpConfigs;
  [key: string]: any;
}

export type OptionBuilder<P = void, T = any> = T | ((payload: P) => T);

export interface HttpConfigs<P = any> {
  urlPrefix?: string;
  headers?: OptionBuilder<P, Dictionary>;
}

export type Enhancer = (configs: Configs) => (next: Dispatcher) => Dispatcher;

export type Mappings<T> = {
  [key in keyof T]: T[key] extends Resolver<infer P, infer R>
    ? Dispatcher<P, R>
    : never;
};

export interface Define {
  <T>(schema: T): Mappings<T>;
  <T>(configs: Configs, schema: T): Mappings<T>;
}

export const define: Define = (...args: any[]): any => {
  let configs: Configs;
  let schema: any;
  if (args.length > 1) {
    [configs, schema] = args;
  } else {
    configs = {};
    [schema] = args;
  }
  const mapping: Dictionary = {};
  Object.keys(schema).forEach((key) => {
    mapping[key] = schema[key](configs);
  });
  return mapping;
};

export type Resolver<P = any, R = any> = (config: Configs) => Dispatcher<P, R>;

export type Dictionary<T = any> = { [key: string]: T };

export type Dispatcher<P = any, R = any> = P extends undefined
  ? (payload?: P) => Promise<R>
  : (payload: P) => Promise<R>;

export const wrap =
  <P, R>(fn: (payload: P, configs: Configs) => R): Resolver<P, R> =>
  (configs) =>
    ((payload: P) => fn(payload, configs)) as any;

export function use<P = void, R = any>(
  resolver: Resolver<P, R>,
  ...extensions: Enhancer[]
): Resolver<P, R> {
  if (!extensions.length) return resolver;

  return (configs) => {
    let enhancers = extensions.map((e) => e(configs));
    const dispatcher: Dispatcher = resolver(configs);
    return enhancers.reduceRight(
      (next, e) => (payload: any) => e(next)(payload),
      dispatcher
    ) as Dispatcher<P, R>;
  };
}

export function getPropValue(obj: any, path: string) {
  return path.split(".").reduce((o, p) => o?.[p], obj);
}

export function transform<P = void, T = any, R = any>(
  resolver: Resolver<P, R>,
  transformer: ((result: R, payload: P, configs: Configs) => T) | string
): Resolver<P, T> {
  return (configs): any => {
    const dispatcher = resolver(configs);
    return async (payload: P) => {
      const result = await dispatcher(payload);
      if (typeof transformer === "function") {
        return transformer(result, payload, configs);
      }
      return getPropValue(result, transformer);
    };
  };
}
