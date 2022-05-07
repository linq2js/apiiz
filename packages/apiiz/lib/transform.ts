import { Context, Resolver } from "./types";
import { getPropValue } from "./utils";

export const transform =
  <P, R, T>(
    resolver: Resolver<P, R>,
    transformFn: ((result: R, payload: P, context: Context) => T) | string
  ): Resolver<P, T> =>
  (context) => {
    const dispatcher = resolver(context);
    return async (payload) => {
      const result = await dispatcher(payload);
      if (typeof transformFn === "function") {
        return transformFn(result, payload, context);
      }
      return getPropValue(result, transformFn);
    };
  };
