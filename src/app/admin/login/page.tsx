import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin sign in — Offroading",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <LoginForm />;
}
