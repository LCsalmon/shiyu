import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    void useAppStore.persist.rehydrate();
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}

export function ScreenSkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-5 py-10">
      <div className="h-8 w-24 rounded-md bg-muted" />
      <div className="h-40 rounded-xl bg-muted" />
      <div className="h-24 rounded-xl bg-muted" />
      <div className="h-24 rounded-xl bg-muted" />
    </div>
  );
}
