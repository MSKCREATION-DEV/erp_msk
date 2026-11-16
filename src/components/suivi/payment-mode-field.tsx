"use client";

import { ChoiceCards } from "@/components/ui/choice-cards";
import { FieldLabel } from "@/components/ui/field-label";
import {
  SV_PAYMENT_MODES,
  isSvPaymentModeOther,
  type SvPaymentMode,
} from "@/lib/suivi/payment-modes";

/**
 * Mode de paiement + pattern « Autre » → champ précision.
 * Utiliser sur mouvements / paiements / écritures compte Suivi.
 */
export function SvPaymentModeField({
  value,
  onChange,
  otherDetail,
  onOtherDetailChange,
  disabled,
  required,
  name = "paymentMethod",
  otherName = "paymentMethodOther",
  columns = 3,
}: {
  value: string;
  onChange: (v: SvPaymentMode) => void;
  otherDetail: string;
  onOtherDetailChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  otherName?: string;
  columns?: 2 | 3 | 4;
}) {
  const showOther = isSvPaymentModeOther(value);
  const stored = showOther ? otherDetail.trim() : value;

  return (
    <div className="sm:col-span-2 lg:col-span-3">
      <FieldLabel required={required}>Mode</FieldLabel>
      <div className="mt-2">
        <ChoiceCards
          name={`${name}-vis`}
          value={value}
          onChange={(v) => onChange(v as SvPaymentMode)}
          disabled={disabled}
          columns={columns}
          options={SV_PAYMENT_MODES.map((m) => ({
            value: m,
            label: m,
          }))}
        />
      </div>
      {/* Mode carte (pour Zod) + valeur persistée résolue */}
      <input type="hidden" name={`${name}Mode`} value={value} />
      <input type="hidden" name={name} value={stored} />
      {showOther ? (
        <div className="mt-3">
          <FieldLabel htmlFor={`${otherName}-vis`} required={required}>
            Préciser le mode
          </FieldLabel>
          <input
            id={`${otherName}-vis`}
            name={otherName}
            value={otherDetail}
            onChange={(e) => onOtherDetailChange(e.target.value)}
            placeholder="Ex. Western Union, carte…"
            disabled={disabled}
            className="mt-1.5 w-full rounded-lg border border-msk-ink/15 px-3 py-2 text-sm"
          />
        </div>
      ) : null}
    </div>
  );
}
