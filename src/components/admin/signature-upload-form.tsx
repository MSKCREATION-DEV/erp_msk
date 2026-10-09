"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { uploadSignatureAction } from "@/actions/signatures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignatureUploadForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const res = await uploadSignatureAction(formData);
      if (!res.ok) setError(res.error ?? "Échec");
      else {
        setOk(res.message ?? "OK");
        router.refresh();
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="label">Libellé</Label>
        <Input id="label" name="label" defaultValue="Ma signature" />
      </div>
      <div>
        <Label htmlFor="file">Image</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="mt-1 block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-msk-blue file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
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
