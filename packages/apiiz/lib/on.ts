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
    return (payload) => {
      return dispatcher(payload).then(
        (x) => {
          success?.(x);
          done?.();
          return x;
        },
        (x) => {
          error?.(x);
          done?.();
          throw x;
        }
      );
    };
  };
