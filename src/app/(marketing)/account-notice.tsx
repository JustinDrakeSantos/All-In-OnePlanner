"use client";

import { useSearchParams } from "next/navigation";

/** Confirms an account deletion after Settings redirects here. */
export function AccountNotice() {
  const params = useSearchParams();
  if (params.get("account") !== "deleted") return null;
  return (
    <div role="status" className="bg-success-soft px-4 py-3 text-center text-sm font-medium text-success">
      Your account and all of its data have been deleted.
    </div>
  );
}
