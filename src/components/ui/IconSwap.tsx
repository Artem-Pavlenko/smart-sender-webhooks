import type { FC, ReactNode } from "react";

interface IconSwapProps {
  swapped: boolean;
  from: ReactNode;
  to: ReactNode;
}
const base = "col-start-1 row-start-1 transition-all duration-200";

/** Cross-fades between two icons; both stay mounted in the same grid cell so the swap can animate. */
export const IconSwap: FC<IconSwapProps> = ({ swapped, from, to }) => (
  <span className="grid place-items-center">
    <span
      className={`${base} ${swapped ? "scale-50 -rotate-90 opacity-0" : ""}`}
    >
      {from}
    </span>
    <span
      className={`${base} ${swapped ? "" : "scale-50 rotate-90 opacity-0"}`}
    >
      {to}
    </span>
  </span>
);
