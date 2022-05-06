import { OptionBuilder } from "./types";

export const getOption = <P>(builder: OptionBuilder<P>, payload: P) =>
  typeof builder === "function" ? builder(payload) : builder;
