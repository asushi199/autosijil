"use client";

import type { ReactNode } from "react";

/**
 * Butang submit yang meminta pengesahan (confirm) sebelum menjalankan server
 * action. Untuk tindakan tidak boleh diundur seperti memadam program.
 */
export default function ConfirmSubmit({
  action,
  message,
  className,
  children,
}: {
  action: () => Promise<void>;
  message: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        className={className}
        onClick={(e) => {
          if (!confirm(message)) e.preventDefault();
        }}
      >
        {children}
      </button>
    </form>
  );
}
