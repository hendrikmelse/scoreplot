export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return function (this: unknown, ...args: Args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
