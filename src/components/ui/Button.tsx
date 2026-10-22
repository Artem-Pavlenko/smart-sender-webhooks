import type { ButtonHTMLAttributes, FC } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export const Button: FC<ButtonProps> = ({
  variant = "primary",
  className = "",
  ...props
}) => {
  const styles =
    variant === "primary"
      ? "bg-accent text-accent-fg shadow-sm hover:bg-accent-hover"
      : "border border-line-strong bg-surface text-fg hover:bg-surface-muted";

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
};
