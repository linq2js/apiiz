import { http } from "./http";
import {
  Context,
  Define,
  Dictionary,
  Use,
  Resolver,
  Dispatcher,
} from "./types";

export * from "./types";

export { http };

export const define: Define = ({ configs = {}, ...schema }): any => {
  const mappings: Dictionary = {};
  const hor = configs.enhancers;
  const shared = new Map();
  if (hor) {
    Object.keys(schema).forEach((key) => {
      const context: Context = {
        configs,
        http: configs.http?.driver ?? http,
        shared,
        mappings,
      };

      mappings[key] = hor.reduce(
        (prev, x) => prev.with(x),
        enhance(schema[key])
      )(context);
    });
  } else {
    Object.keys(schema).forEach((key) => {
      const context: Context = {
        configs,
        http: configs.http?.driver ?? http,
        shared,
        mappings,
      };
      mappings[key] = schema[key](context);
    });
  }

  return mappings;
};

export const enhance = <P, R>(resolver: Resolver<P, R>): Use<P, R> => {
  return Object.assign((context: Context) => resolver(context), {
    with(hor: Function, ...args: any[]) {
      return enhance(hor(resolver, ...args)) as any;
    },
  });
};

/**
 * create new enhancer from original resolver
 * @param resolver
 * @param fn enhance function
 * @returns
 */
export const enhancer =
  <P, R, PN = P, RN = R>(
    resolver: Resolver<P, R>,
    fn: (context: Context, dispatcher: Dispatcher<P, R>, payload: PN) => RN
  ): Resolver<PN, RN> =>
  (context) => {
    const dispatcher = resolver(context);
    return async (payload) => {
      return fn(context, dispatcher, payload);
    };
  };
