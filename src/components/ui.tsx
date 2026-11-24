import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "good" | "ai";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  good: "bg-good-text text-white hover:bg-[#004d00]",
  danger: "bg-critical text-white hover:bg-[#b02f2f]",
  secondary: "border border-line bg-card text-ink hover:bg-page",
  ghost: "text-brand hover:bg-brand-soft",
  ai: "border border-ai-line bg-ai-soft text-ai hover:bg-[#ebe5ff]",
};

// min 44px touch targets
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

export const inputClass =
  "block w-full min-h-11 rounded-xl border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-card ${className}`}>{children}</section>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-[15px] font-medium">{children}</dd>
    </div>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}
