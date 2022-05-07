import { http } from "./http";
import { Context, Define, Dictionary, Use, Resolver } from "./types";

export * from "./types";

export { http };

export const define: Define = ({ configs = {}, ...schema }): any => {
  const mapping: Dictionary = {};
  const hor = configs.hor;
  const context: Context = { configs, http: configs.http?.driver ?? http };
  if (hor) {
    Object.keys(schema).forEach((key) => {
      mapping[key] = hor.reduce(
        (prev, x) => prev.with(x),
        use(schema[key])
      )(context);
    });
  } else {
    Object.keys(schema).forEach((key) => {
      mapping[key] = schema[key](context);
    });
  }

  return mapping;
};

export const use = <P, R>(resolver: Resolver<P, R>): Use<P, R> => {
  return Object.assign((context: Context) => resolver(context), {
    with(hor: Function, ...args: any[]) {
      return use(hor(resolver, ...args)) as any;
    },
  });
};
