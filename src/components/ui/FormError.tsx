import { useState, type FC } from "react";

interface FormErrorProps {
  message?: string;
  pending?: boolean;
}

/**
 * Form-level error below the submit button. It expands/collapses smoothly. An error that is on
 * screen when the form is re-submitted (`pending`) stays until the new result, so a retry doesn't
 * make it blink; an error that was already dismissed never comes back.
 */
export const FormError: FC<FormErrorProps> = ({ message, pending = false }) => {
  const [lastMessage, setLastMessage] = useState(message);
  const [wasVisible, setWasVisible] = useState(!!message);

  if (message && message !== lastMessage) setLastMessage(message);
  if (message && !wasVisible) setWasVisible(true);
  if (!message && !pending && wasVisible) setWasVisible(false);

  const visible = !!message || (pending && wasVisible);

  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-200 ${visible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
    >
      {/* The top padding lives inside the collapsing box, so a hidden error takes no space at all. */}
      <div className="overflow-hidden">
        <div className="pt-3">
          <p
            role="alert"
            aria-hidden={!visible}
            className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {lastMessage}
          </p>
        </div>
      </div>
    </div>
  );
};
