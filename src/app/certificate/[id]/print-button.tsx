"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
    >
      {label}
    </button>
  );
}
