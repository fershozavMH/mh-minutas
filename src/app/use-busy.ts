"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

const MIN_VISIBLE_MS = 400;

// Estado de «trabajando» para botones: dura al menos un instante visible y, si se pide
// refrescar la pantalla, se mantiene hasta que llegan los datos nuevos.
export function useBusy() {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const startedAt = useRef(0);

  function setBusy(value: boolean) {
    if (value) {
      startedAt.current = Date.now();
      setWorking(true);
      return;
    }
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current));
    setTimeout(() => setWorking(false), wait);
  }

  function refresh() {
    startRefresh(() => router.refresh());
  }

  return { busy: working || refreshing, setBusy, refresh };
}
