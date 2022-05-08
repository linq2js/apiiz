import { Resolver } from "./types";

/**
 * @param source
 * @param target
 * @returns
 */
export const map =
  <P, R, T>(source: Resolver<P, R>, target: Resolver<R, T>): Resolver<P, T> =>
  (context) => {
    const sourceDispatcher = source(context);
    const targetDispatcher = target(context);
    return async (payload) => {
      const result = await sourceDispatcher(payload);
      return targetDispatcher(result as any);
    };
  };
