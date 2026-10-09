"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ScriptCopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
    >
      {ok ? "Copié" : "Copier"}
    </Button>
  );
}
