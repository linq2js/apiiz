import DataLoader from "dataloader";
import { Dispatcher, Resolver } from "./main";
import { Ref } from "./types";

export type LoaderOptions<P = any, R = any> = DataLoader.Options<
  P,
  any,
  any
> & {
  delay?: number;
  dataLoaderRef?: Ref<DataLoader<P, any>>;
  remap?: (result: R, payload: P) => boolean;
};

export type LoaderConfigs = LoaderOptions;

const create = <P, R>(
  resolver: Resolver<P[], R[]>,
  options?: LoaderOptions<P, R>
): Resolver<P, R> => {
  return (context) => {
    const finalOptions: LoaderOptions<P, R> = {
      ...context.configs.$loader,
      ...options,
    };

    if (!finalOptions.batchScheduleFn && finalOptions.delay) {
      finalOptions.batchScheduleFn = (callback) =>
        setTimeout(callback, finalOptions.delay);
    }
    const { remap, dataLoaderRef } = finalOptions;
    const dispatcher = resolver(context);

    const dataLoader =
      dataLoaderRef?.current ??
      new DataLoader((payload: readonly P[]) => {
        const data = dispatcher(payload as P[]);
        if (remap) {
          return data.then((results) =>
            payload.map((p) => results.find((r) => remap(r, p)))
          );
        }
        return data;
      }, finalOptions);
    if (dataLoaderRef) dataLoaderRef.current = dataLoader;
    return ((payload: P) => dataLoader.load(payload)) as Dispatcher<P, R>;
  };
};

const configure = (configs: LoaderConfigs) => ({ $loader: configs });

export const loader = Object.assign(create, { configs: configure });
