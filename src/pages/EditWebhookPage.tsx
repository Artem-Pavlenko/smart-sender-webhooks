import { X } from "lucide-react";
import { useEffect, useRef, useState, type FC, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

import { getErrorMessage, isApiError } from "../api/errors";
import { Button } from "../components/ui";
import {
  WebhookForm,
  WebhookFormSkeleton,
} from "../components/webhooks/WebhookForm";
import { useWebhook } from "../hooks/useWebhooks";

export const EditWebhookPage: FC = () => {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const location = useLocation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const query = useWebhook(id);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Play the exit animation first; the route is left once the panel's animation ends.
  const close = () => setClosing(true);
  const leave = () =>
    void navigate({ pathname: "/webhooks", search: location.search });

  const validId = Number.isInteger(id) && id > 0;
  const notFound =
    !validId || (isApiError(query.error) && query.error.status === 404);

  return (
    // The native <dialog> gives focus handling and Esc; the backdrop is ours so it can animate out.
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      aria-labelledby="edit-webhook-title"
      className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-y-auto bg-transparent p-0 text-fg backdrop:bg-transparent"
    >
      <div
        className={`fixed inset-0 bg-slate-950/50 backdrop-blur-sm ${closing ? "animate-fade-out" : "animate-fade-in"}`}
        onClick={close}
      />
      <div className="pointer-events-none relative flex min-h-full items-center justify-center p-4">
        <div
          className={`pointer-events-auto w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl ${closing ? "animate-pop-out" : "animate-pop-in"}`}
          onAnimationEnd={(event) => {
            // animationend bubbles up from children (field errors, spinner) — react to the panel only.
            if (closing && event.target === event.currentTarget) leave();
          }}
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 id="edit-webhook-title" className="text-lg font-semibold">
              Edit webhook
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="grid size-8 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            >
              <X size={18} />
            </button>
          </div>

          {query.data ? (
            <WebhookForm
              webhook={query.data}
              onCancel={close}
              onSaved={close}
            />
          ) : notFound ? (
            <DialogMessage onClose={close}>Webhook not found.</DialogMessage>
          ) : query.isError ? (
            <DialogMessage onClose={close}>
              Failed to load webhook: {getErrorMessage(query.error)}
            </DialogMessage>
          ) : (
            <WebhookFormSkeleton />
          )}
        </div>
      </div>
    </dialog>
  );
};

interface DialogMessageProps {
  children: ReactNode;
  onClose: () => void;
}

const DialogMessage: FC<DialogMessageProps> = ({ children, onClose }) => {
  return (
    <div className="flex flex-col gap-4 text-sm text-fg-muted">
      <p role="alert">{children}</p>
      <Button variant="secondary" className="self-end" onClick={onClose}>
        Close
      </Button>
    </div>
  );
};
