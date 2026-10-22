import {
  useState,
  type FC,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Rendered inside the input on the right, e.g. a show/hide password button. */
  trailing?: ReactNode;
}

export const Field: FC<FieldProps> = ({
  label,
  error,
  id,
  trailing,
  ...props
}) => {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-150 outline-none focus:border-accent focus:ring-3 focus:ring-accent/20 aria-invalid:border-danger aria-invalid:focus:ring-danger/20 ${trailing ? "pr-10" : ""}`}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">
            {trailing}
          </div>
        )}
      </div>
      {/* Space is reserved so a message never shifts the layout; it fades instead of popping. */}
      <p
        id={errorId}
        aria-hidden={!error}
        className={`min-h-5 text-sm text-danger transition-opacity duration-150 ${error ? "opacity-100" : "opacity-0"}`}
      >
        <LastValue value={error} />
      </p>
    </div>
  );
};

interface LastValueProps {
  value?: string;
}

/** Keeps showing the previous value while it fades out, instead of blanking the text at once. */
const LastValue: FC<LastValueProps> = ({ value }) => {
  const [lastValue, setLastValue] = useState(value);
  if (value && value !== lastValue) setLastValue(value);
  return lastValue;
};
