import { Context, Resolver } from "./types";

export interface Memory {
  <R>(fn: () => R | Promise<R>): Resolver<void, R>;
  <P, R>(fn: (payload: P, context: Context) => R | Promise<R>): Resolver<P, R>;
}

export const memory: Memory = (fn: Function) => (context: any) =>
  ((payload: any) => fn(payload, context)) as any;
