import { Resolver } from "./types";

export type Events = {
  success?: (result: any) => void;
  error?: (error: any) => void;
  done?: VoidFunction;
};

export const on =
  <P, R>(resolver: Resolver<P, R>, events: Events): Resolver<P, R> =>
  (context) => {
    const { success, error, done } = events;
    const dispatcher = resolver(context);
    return async (payload) => {
      let ee: any;
      let result: any;
      try {
        return (result = await dispatcher(payload));
      } catch (e) {
        ee = e;
        throw ee;
      } finally {
        if (ee) {
          error?.(ee);
        } else {
          success?.(result);
        }
        done?.();
      }
    };
  };
