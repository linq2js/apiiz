import { Resolver } from "./types";

export type Pipe = {
  <P, R1, R2>(source: Resolver<P, R1>, target: Resolver<R1, R2>): Resolver<
    P,
    R2
  >;

  <P, R1, R2, R3>(
    source: Resolver<P, R1>,
    target1: Resolver<R1, R2>,
    target2: Resolver<R2, R3>
  ): Resolver<P, R3>;

  <P, R1, R2, R3, R4>(
    source: Resolver<P, R1>,
    target1: Resolver<R1, R2>,
    target2: Resolver<R2, R3>,
    target3: Resolver<R3, R4>
  ): Resolver<P, R4>;

  <P, R1, R2, R3, R4, R5>(
    source: Resolver<P, R1>,
    target1: Resolver<R1, R2>,
    target2: Resolver<R2, R3>,
    target3: Resolver<R3, R4>,
    target4: Resolver<R4, R5>
  ): Resolver<P, R5>;

  <P, R1, R2, R3, R4, R5, R6>(
    source: Resolver<P, R1>,
    target1: Resolver<R1, R2>,
    target2: Resolver<R2, R3>,
    target3: Resolver<R3, R4>,
    target4: Resolver<R4, R5>,
    target5: Resolver<R5, R6>
  ): Resolver<P, R6>;

  <P, R1, R2, R3, R4, R5, R6, R7>(
    source: Resolver<P, R1>,
    target1: Resolver<R1, R2>,
    target2: Resolver<R2, R3>,
    target3: Resolver<R3, R4>,
    target4: Resolver<R4, R5>,
    target5: Resolver<R5, R6>,
    target6: Resolver<R6, R7>
  ): Resolver<P, R7>;

  <P, R1, R2, R3, R4, R5, R6, R7, R8>(
    source: Resolver<P, R1>,
    target1: Resolver<R1, R2>,
    target2: Resolver<R2, R3>,
    target3: Resolver<R3, R4>,
    target4: Resolver<R4, R5>,
    target5: Resolver<R5, R6>,
    target6: Resolver<R6, R7>,
    target7: Resolver<R7, R8>
  ): Resolver<P, R8>;

  <P, R1, R2, R3, R4, R5, R6, R7, R8, R9>(
    source: Resolver<P, R1>,
    target1: Resolver<R1, R2>,
    target2: Resolver<R2, R3>,
    target3: Resolver<R3, R4>,
    target4: Resolver<R4, R5>,
    target5: Resolver<R5, R6>,
    target6: Resolver<R6, R7>,
    target7: Resolver<R7, R8>,
    target8: Resolver<R8, R9>
  ): Resolver<P, R9>;

  <P, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10>(
    source: Resolver<P, R1>,
    target1: Resolver<R1, R2>,
    target2: Resolver<R2, R3>,
    target3: Resolver<R3, R4>,
    target4: Resolver<R4, R5>,
    target5: Resolver<R5, R6>,
    target6: Resolver<R6, R7>,
    target7: Resolver<R7, R8>,
    target8: Resolver<R8, R9>,
    target9: Resolver<R9, R10>
  ): Resolver<P, R10>;
};

export const pipe: Pipe = (source: Resolver, ...resolvers: Resolver[]): any => {
  return resolvers.reduce((source, target) => {
    return (context) => {
      const sourceDispatcher = source(context);
      const targetDispatcher = target(context);
      return async (payload) => {
        const result = await sourceDispatcher(payload);
        return targetDispatcher(result as any);
      };
    };
  }, source);
};

export const transformResult =
  <R, T, C>(transformFn: (result: R) => T) =>
  (_: C) =>
    transformFn;
