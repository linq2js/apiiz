import { Resolver } from "./types";

export interface LoadOptions<T> {
  array<TKey extends keyof T, TInfo extends keyof T>(
    key: TKey,
    into: TInfo,
    resolver: Resolver<
      Exclude<T[TKey] extends Array<infer TItem> ? TItem : never, undefined>,
      Exclude<T[TInfo] extends Array<infer TItem> ? TItem : never, undefined>
    >
  ): this;

  value<TKey extends keyof T, TInfo extends keyof T>(
    key: TKey,
    into: TInfo,
    resolver: Resolver<
      Exclude<T[TKey], undefined>,
      Exclude<T[TInfo], undefined>
    >
  ): this;
}

export const include =
  <P, R>(
    resolver: Resolver<P, R>,
    setup: (options: LoadOptions<R>) => void
  ): Resolver<P, R> =>
  (context) => {
    const dispatcher = resolver(context);
    const loaders: ((result: any) => Promise<void>)[] = [];
    setup({
      value(key, into, loader) {
        const d = loader(context);
        loaders.push(async (result) => {
          const value = result?.[key];
          if (typeof value === "undefined" || value === null) return;
          result[into] = await d(value);
        });
        return this;
      },
      array(key, into, loader) {
        const d = loader(context);
        loaders.push(async (result) => {
          const values = result?.[key];
          if (values?.length) return;
          result[into] = await Promise.all(values.map(d));
        });
        return this;
      },
    });

    return async (payload) => {
      const result = await dispatcher(payload);
      await Promise.all(loaders.map((loader) => loader(result)));
      return result;
    };
  };
