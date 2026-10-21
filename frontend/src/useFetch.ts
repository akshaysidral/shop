import { useCallback, useEffect, useState } from "react";
import { api, errMsg } from "./api";

/** GET a path (re-fetches when the path or params change). `reload()` forces a refresh. Pass null to skip. */
export function useFetch<T>(path: string | null, params?: Record<string, string | number | undefined>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(params ?? {});

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    setLoading(true);
    api.get<T>(path, { params: JSON.parse(key) as Record<string, unknown> })
      .then((r) => { if (!cancelled) { setData(r.data); setError(""); } })
      .catch((e) => { if (!cancelled) setError(errMsg(e, "Request failed")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [path, key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
