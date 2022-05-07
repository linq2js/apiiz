import type { OptionBuilder } from "./types";

export const foreverPromise = new Promise<any>(() => {});

export const getOption = <P>(builder: OptionBuilder<P>, payload: P) =>
  typeof builder === "function" ? builder(payload) : builder;

export const getPropValue = (obj: any, path: string) =>
  path.split(".").reduce((o, p) => o?.[p], obj);

const testDate = new Date();
const testArray = new Array<any>();

export function shallowCompare(a: any, b: any) {
  if (a === b) return true;
  // handle falsy
  if ((a && !b) || (b && !a)) return false;
  if (!a && !b) return false;
  const aIsArray = a.every === testArray.every;
  const bIsArray = b.every === testArray.every;
  if (aIsArray && bIsArray) {
    if (a.length !== b.length) return false;
    return a.every((v: any, i: any) => v === b[i]);
  }
  if ((aIsArray && !bIsArray) || (bIsArray && !aIsArray)) {
    return false;
  }
  const aIsDate = a.getTime === testDate.getTime;
  const bIsDate = b.getTime === testDate.getTime;
  if (aIsDate && bIsDate) {
    return a.getTime() === b.getTime();
  }
  if ((aIsDate && !bIsDate) || (bIsDate && !aIsDate)) {
    return false;
  }
  if (typeof a === "object" && typeof b === "object") {
    for (const key in a) {
      if (a[key] !== b[key]) return false;
    }
    for (const key in b) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  }
  return false;
}
