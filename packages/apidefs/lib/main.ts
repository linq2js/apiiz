import { http } from "./http";
import {
  Context,
  Define,
  Dictionary,
  Dispatcher,
  Middleware,
  Resolver,
} from "./types";

export * from "./types";

export { http };

export const foreverPromise = new Promise<any>(() => {});

export const define: Define = ({ configs = {}, ...schema }): any => {
  const mapping: Dictionary = {};
  const middleware = configs.middleware;
  const context: Context = { configs, http: configs.http?.driver ?? http };
  if (middleware) {
    Object.keys(schema).forEach((key) => {
      mapping[key] = use(schema[key], ...middleware)(context);
    });
  } else {
    Object.keys(schema).forEach((key) => {
      mapping[key] = schema[key](context);
    });
  }

  return mapping;
};

export const wrap =
  <P, R>(fn: (payload: P, context: Context) => R): Resolver<P, R> =>
  (context) =>
    ((payload: P) => fn(payload, context)) as any;

export function use<P = void, R = any>(
  resolver: Resolver<P, R>,
  ...middlware: (typeof resolver extends Resolver<infer P, infer R>
    ? Middleware<P, R>
    : never)[]
): Resolver<P, R> {
  if (!middlware.length) return resolver;

  return (context) => {
    let results = middlware.map((e) => e(context));
    const dispatcher: Dispatcher = resolver(context);
    return results.reduceRight(
      (next, e) => (payload: any) => e(next as Dispatcher<P, R>)(payload),
      dispatcher
    ) as Dispatcher<P, R>;
  };
}

export function getPropValue(obj: any, path: string) {
  return path.split(".").reduce((o, p) => o?.[p], obj);
}

export function transform<P = void, T = any, R = any>(
  resolver: Resolver<P, R>,
  transformer: ((result: R, payload: P, context: Context) => T) | string
): Resolver<P, T> {
  return (context): any => {
    const dispatcher = resolver(context);
    return async (payload: P) => {
      const result = await dispatcher(payload);
      if (typeof transformer === "function") {
        return transformer(result, payload, context);
      }
      return getPropValue(result, transformer);
    };
  };
}
