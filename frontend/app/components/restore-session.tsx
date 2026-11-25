"use client";

import { useEffect } from "react";

export function RestoreSession() {
  useEffect(() => {
    function recheck(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", recheck);
    return () => window.removeEventListener("pageshow", recheck);
  }, []);
  return null;
}
