export function getUniqueBy<T, K extends keyof T>(arr: T[], prop: K): T[] {
  const set = new Set();
  return arr.filter((o) => !set.has(o[prop]) && set.add(o[prop]));
}
