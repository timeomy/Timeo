import { redirect } from "next/navigation";

export default function CheckInsRedirect() {
  redirect("/dashboard/gym/checkins");
}
