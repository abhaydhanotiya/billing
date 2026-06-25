import { useEffect, useState } from "react";
import { api } from "./api.js";

/**
 * Polls DB reachability. Returns false when the cloud database can't be reached
 * (so the UI can warn that billing is paused). The poll also keeps the Supabase
 * connection warm while the app is open.
 */
export function useConnection(intervalMs = 60_000): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const ok = await api.dbHealth();
      if (alive) setOnline(ok);
    };
    check();
    const id = setInterval(check, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);
  return online;
}
