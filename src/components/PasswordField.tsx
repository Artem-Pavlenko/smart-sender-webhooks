import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps, type FC } from "react";

import { Field, IconSwap } from "./ui";

type PasswordFieldProps = Omit<
  ComponentProps<typeof Field>,
  "type" | "trailing"
>;

export const PasswordField: FC<PasswordFieldProps> = (props) => {
  const [visible, setVisible] = useState(false);

  return (
    <Field
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="grid size-8 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
        >
          <IconSwap
            swapped={visible}
            from={<Eye size={16} />}
            to={<EyeOff size={16} />}
          />
        </button>
      }
    />
  );
};
