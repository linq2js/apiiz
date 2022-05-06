import { foreverPromise } from "./main";
import { Middleware } from "./types";

export const debounce =
  (ms: number): Middleware =>
  (_) => {
    let timer: any;
    let resolve: VoidFunction | undefined;
    let reject: VoidFunction | undefined;

    return (dispatcher) => async (payload: any) =>
      new Promise((...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => dispatcher(payload).then(resolve, reject), ms);
        [resolve, reject] = args;
      });
  };

export const throttle =
  (ms: number): Middleware =>
  (_) => {
    let last: number;
    return (dispatcher) => async (payload: any) => {
      const now = Date.now();
      if (last + ms > now) {
        return foreverPromise;
      }
      last = now;
      return dispatcher(payload);
    };
  };
