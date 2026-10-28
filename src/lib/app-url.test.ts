import assert from "node:assert/strict";
import { publicAppBaseUrl } from "./app-url";

const prev = {
  EMAIL_CTA_BASE_URL: process.env.EMAIL_CTA_BASE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

try {
  delete process.env.EMAIL_CTA_BASE_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  assert.equal(publicAppBaseUrl(), "https://erp-msk.vercel.app");

  process.env.NEXT_PUBLIC_APP_URL =
    "https://erp-msk-git-main-aboubacarbane-mskcreations-projects.vercel.app";
  assert.equal(publicAppBaseUrl(), "https://erp-msk.vercel.app");

  process.env.EMAIL_CTA_BASE_URL = "https://erp-msk.vercel.app";
  assert.equal(publicAppBaseUrl(), "https://erp-msk.vercel.app");

  console.log("app-url: ok");
} finally {
  if (prev.EMAIL_CTA_BASE_URL === undefined) delete process.env.EMAIL_CTA_BASE_URL;
  else process.env.EMAIL_CTA_BASE_URL = prev.EMAIL_CTA_BASE_URL;
  if (prev.NEXT_PUBLIC_APP_URL === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = prev.NEXT_PUBLIC_APP_URL;
}
