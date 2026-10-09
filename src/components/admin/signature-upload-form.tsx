"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadSignatureAction } from "@/actions/signatures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePendingAction } from "@/hooks/use-pending-action";

export function SignatureUploadForm() {
  const router = useRouter();
  const { pending, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const formData = new FormData(e.currentTarget);
    void run(async () => {
      const res = await uploadSignatureAction(formData);
      if (!res.ok) setError(res.error ?? "Échec");
      else {
        setOk(res.message ?? "OK");
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      aria-busy={pending || undefined}
    >
      <div>
        <Label htmlFor="label">Libellé</Label>
        <Input
          id="label"
          name="label"
          defaultValue="Ma signature"
          disabled={pending}
        />
      </div>
      <div>
        <Label htmlFor="file">Image</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
          disabled={pending}
          className="mt-1 block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-msk-blue file:px-3 file:py-2 file:text-sm file:font-medium file:text-white disabled:opacity-60"
        />
      </div>
      {error ? <p className="text-sm text-msk-coral">{error}</p> : null}
      {ok ? <p className="text-sm text-msk-blue">{ok}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Nettoyage…" : "Enregistrer"}
      </Button>
    </form>
  );
}
