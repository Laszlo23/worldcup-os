import { useEffect, useState } from "react";

/** True after the first client effect — avoids SSR/hydration wallet adapter races. */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
