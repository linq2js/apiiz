import { Resolver } from "./types";
import { foreverPromise } from "./utils";

export const debounce =
  <P, R>(resolver: Resolver<P, R>, ms: number): Resolver<P, R> =>
  (context) => {
    const dispatcher = resolver(context);
    let timer: any;
    let resolve: VoidFunction | undefined;
    let reject: VoidFunction | undefined;

    return (payload) =>
      new Promise((...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => dispatcher(payload).then(resolve, reject), ms);
        [resolve, reject] = args;
      });
  };

export const throttle =
  <P, R>(resolver: Resolver<P, R>, ms: number): Resolver<P, R> =>
  (context) => {
    const dispatcher = resolver(context);
    let last: number;

    return (payload) => {
      const now = Date.now();
      if (last + ms > now) {
        return foreverPromise;
      }
      last = now;
      return dispatcher(payload);
    };
  };
