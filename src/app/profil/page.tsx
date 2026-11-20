import { redirect } from "next/navigation";

export const metadata = { title: "Marka profili" };

export default function LegacyProfileRoute() {
  redirect("/marka");
}
