import DataLoader from "dataloader";
import { Dispatcher, Resolver } from "./main";

export type LoaderOptions<P = any> = DataLoader.Options<P, any, any> & {
  delay?: number;
};

export type LoaderConfigs = LoaderOptions;

const apiCreator = <P, R>(
  dataResolver: Resolver<P[], R[]>,
  options?: LoaderOptions<P>
): Resolver<P, R> => {
  return (context) => {
    const finalOptions: LoaderOptions = {
      ...context.configs.$loader,
      ...options,
    };

    if (!finalOptions.batchScheduleFn && finalOptions.delay) {
      finalOptions.batchScheduleFn = (callback) =>
        setTimeout(callback, finalOptions.delay);
    }

    const dispatcher = dataResolver(context);

    const dataLoader = new DataLoader(
      (payload) => dispatcher(payload as P[]),
      finalOptions
    );
    return ((payload: P) => dataLoader.load(payload)) as Dispatcher<P, R>;
  };
};

const configsBuilder = (configs: LoaderConfigs) => ({ $loader: configs });

export const loader = Object.assign(apiCreator, { configs: configsBuilder });
