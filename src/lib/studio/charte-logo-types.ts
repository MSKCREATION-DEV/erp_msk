/** Types client-safe — logos Charte pour le picker documents. */
export type CharteLogoOption = {
  id: string;
  code: string;
  label: string;
  kind: string;
  isDefaultDocuments: boolean;
  previewUrl: string | null;
};
