import { Context, Resolver } from "./types";

export const memory =
  <P, R>(fn: (payload: P, context: Context) => R): Resolver<P, R> =>
  (context) =>
    ((payload: P) => fn(payload, context)) as any;
