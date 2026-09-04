"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOutAdminAction } from "./actions";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await signOutAdminAction();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-pill border border-hairline px-4 py-2 text-caption font-medium text-ink transition-opacity hover:opacity-80 disabled:opacity-40"
    >
      {pending ? "Signing out…" : "Log out"}
    </button>
  );
}
