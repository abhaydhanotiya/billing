import { useEffect, useState } from "react";

/**
 * Tiny hash router — keeps the dependency surface small and works from a
 * file:// URL in packaged Electron (where history routing is awkward).
 * Route shape: "#/invoices/abc123" -> { path: ["invoices","abc123"] }.
 */
export function navigate(to: string): void {
  window.location.hash = to.startsWith("#") ? to : `#${to}`;
}

export function useRoute(): { segments: string[]; hash: string } {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const segments = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { segments, hash };
}
