import { Resolver } from "./types";

/**
 * transform from source value to target value
 * @param source
 * @param target
 * @returns
 */
export const transform =
  <P, R, T>(source: Resolver<P, R>, target: Resolver<R, T>): Resolver<P, T> =>
  (context) => {
    const sourceDispatcher = source(context);
    const targetDispatcher = target(context);
    return async (payload) => {
      const result = await sourceDispatcher(payload);
      return targetDispatcher(result as any);
    };
  };
