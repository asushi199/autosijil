export function loadInParallel<TFirst, TSecond>(
  first: () => TFirst | PromiseLike<TFirst>,
  second: () => TSecond | PromiseLike<TSecond>,
) {
  return Promise.all([first(), second()]);
}
