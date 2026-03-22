import { redirect } from "next/navigation";

// Landing page — just redirect to login (or dashboard if already authenticated,
// middleware handles the latter).
export default function HomePage() {
  redirect("/login");
}
