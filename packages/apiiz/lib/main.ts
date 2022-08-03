import { http } from "./http";
import {
  Context,
  Define,
  Dictionary,
  Resolver,
  Dispatcher,
  Enhance,
  CancelToken,
  Cancellable,
} from "./types";

export * from "./types";

export { http };

export const define: Define = ({ configs = {}, ...schema }): any => {
  const mappings: Dictionary = {};
  const enhancers = configs.enhancers;
  const shared = new Map();
  const hasEnhancer = !!enhancers?.length;
  Object.keys(schema).forEach((key) => {
    const context: Context = {
      configs,
      http: configs.http?.driver ?? http,
      shared,
      mappings,
    };

    let resolver: any = schema[key];
    const token = resolver.token as CancelToken | undefined;

    if (hasEnhancer) {
      resolver = enhancers.reduce((prev, x) => prev.with(x), enhance(resolver));
    }

    const dispatcher = resolver(context);

    mappings[key] = (payload: any) => {
      token?.reset();
      // make sure the dispatcher always returns promise object
      try {
        const result = dispatcher(payload);
        if (typeof result?.then === "function") {
          return result;
        }
        return Promise.resolve(result);
      } catch (e) {
        return Promise.reject(e);
      }
    };
  });

  return mappings;
};

export const enhance: Enhance = (resolver: Resolver, fn?: any): any => {
  if (typeof fn === "function") {
    return (context: Context): Dispatcher => {
      const dispatcher = resolver(context);
      return (payload) => {
        return fn(context, dispatcher, payload);
      };
    };
  }
  return Object.assign((context: Context) => resolver(context), {
    with(hor: Function, ...args: any[]) {
      return enhance(hor(resolver, ...args)) as any;
    },
  });
};

export const cancellable: Cancellable = (...args: any[]) => {
  let token: CancelToken;
  let resolver: Resolver;
  if (args[1]) {
    [resolver, token] = args;
  } else {
    token = cancelToken();
    resolver = args[0](token);
  }
  return Object.assign((context: Context) => resolver(context), { token });
};

/**
 * create a singleton version of spceified resolver. make sure a dispatcher does not re-create multiple times
 * ```js
 * const myResolver = () => {...}
 * // both instances of myResolver are different, this might cause unexpected issue if myResolver contains concurrency, caching logics
 * const api = define({
 *  myResolver, // this is first instance
 *  otherApi: enhance(...).with(enahncer(myResolver)) // this is second instance
 * });
 *
 * // correct way
 * const myResolver = singleton(() => {...});
 * const api = define({
 *  myResolver: myResolver,
 *  otherApi: enhance(...).with(enahncer(myResolver))
 * })
 *
 * ```
 * @param original
 * @returns
 */
export const singleton = <P = void, R = any>(
  original: Resolver<P, R>
): Resolver<P, R> => {
  return (context) => {
    let dispatcher = context.shared.get(original);
    if (!dispatcher) {
      dispatcher = original(context);
      context.shared.set(original, dispatcher);
    }
    return dispatcher;
  };
};

const createResolverGroup =
  <M extends "all" | "race">(mode: M): ResolverGroup<M> =>
  (resolvers, payload, result) =>
  (context) => {
    const entries = Object.entries(resolvers).map(([key, resolver]) => [
      key,
      resolver(context),
    ]);
    return async (inputPayload) => {
      const allPayload: any = payload?.(inputPayload);
      const allResults: any = {};
      const promises: Promise<any>[] = [];
      let hasResult = false;
      entries.some(([key, dispatcher]) => {
        const result = dispatcher(allPayload?.[key]);
        if (typeof result?.then === "function") {
          promises.push(
            result.then((value: any) => {
              if (hasResult && mode === "race") return;
              hasResult = true;
              allResults[key] = value;
            })
          );
        } else {
          allResults[key] = result;
          if (mode === "race") {
            hasResult = true;
            return true;
          }
        }
        return false;
      });
      if (!hasResult) {
        await (mode === "all" ? Promise.all(promises) : Promise.race(promises));
      }
      return result ? result(allResults) : allResults;
    };
  };

export interface ResolverGroup<M extends "all" | "race"> {
  <
    TResolvers,
    TResolvedPayload extends {
      [key in keyof TResolvers]: TResolvers[key] extends Resolver<infer RP>
        ? RP
        : never;
    },
    TResolvingResult extends {
      [key in keyof TResolvers]: TResolvers[key] extends Resolver<
        any,
        Promise<infer RR>
      >
        ? RR
        : never;
    },
    P = void,
    R = M extends "race" ? Partial<TResolvingResult> : TResolvingResult
  >(
    resolvers: TResolvers,
    payload?: (payload: P) => TResolvedPayload | void,
    result?: (
      results: M extends "race" ? Partial<TResolvingResult> : TResolvingResult
    ) => R
  ): Resolver<P, R>;
}

export const all = createResolverGroup("all");

export const race = createResolverGroup("race");

const isAbortControllerSupported = typeof AbortController !== "undefined";

export const cancelToken = (abortController?: AbortController): CancelToken => {
  let cancelled = false;

  const reset = () => {
    cancelled = false;
    abortController = undefined;
  };

  reset();

  return {
    reset,
    isCancelled() {
      return cancelled;
    },
    signal() {
      if (!abortController && isAbortControllerSupported) {
        abortController = new AbortController();
        if (cancelled) {
          abortController.abort();
        }
      }
      return abortController?.signal;
    },
    cancel() {
      cancelled = true;
    },
  };
};
