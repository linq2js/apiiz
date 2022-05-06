import DataLoader from "dataloader";
import { Dispatcher, Resolver } from "./main";

export const loader =
  <P, R>(
    dataResolver: Resolver<P[], R[]>,
    options?: DataLoader.Options<P, any, any>
  ): Resolver<P, R> =>
  (configs) => {
    const dispatcher = dataResolver(configs);
    console.log(dispatcher);
    const dataLoader = new DataLoader(
      (payload) => dispatcher(payload as P[]),
      options
    );
    return ((payload: P) => dataLoader.load(payload)) as Dispatcher<P, R>;
  };
