export function deferEffect(callback: () => void | Promise<void>) {
  let cancelled = false;

  void Promise.resolve().then(() => {
    if (!cancelled) void callback();
  });

  return () => {
    cancelled = true;
  };
}
