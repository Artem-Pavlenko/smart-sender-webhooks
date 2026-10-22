import type { FC } from "react";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: FC<SkeletonProps> = ({ className = "" }) => (
  <span
    aria-hidden
    className={`block animate-shimmer rounded bg-linear-to-r from-surface-muted via-line to-surface-muted bg-size-[200%_100%] ${className}`}
  />
);
