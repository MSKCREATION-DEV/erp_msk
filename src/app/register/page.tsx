import { redirect } from "next/navigation";

/** Self-register interdit — redirection login. */
export default function RegisterBanPage() {
  redirect("/login");
}
