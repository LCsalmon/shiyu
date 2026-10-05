import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function ClientToaster() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        className: "font-sans",
        style: {
          background: "#FBF8F2",
          color: "#1F1A14",
          border: "1px solid #E0D8CC",
        },
      }}
    />
  );
}
