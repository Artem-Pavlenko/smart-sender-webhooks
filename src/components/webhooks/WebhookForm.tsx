import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";

import type { Webhook } from "../../api/types";
import { useUpdateWebhook } from "../../hooks/useWebhooks";
import { applyServerErrors } from "../../lib/applyServerErrors";
import { Button, Field, FormError, Skeleton } from "../ui";

// Mirrors the server rules for fast feedback; the server stays the source of truth.
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Name is too long"),
  url: z.url({ protocol: /^https?$/, error: "Enter a valid http(s) URL" }),
});

type WebhookValues = z.infer<typeof schema>;

interface WebhookFormProps {
  webhook: Webhook;
  onCancel: () => void;
  onSaved: () => void;
}

export const WebhookForm: FC<WebhookFormProps> = ({
  webhook,
  onCancel,
  onSaved,
}) => {
  const mutation = useUpdateWebhook(webhook.id);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<WebhookValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: webhook.name, url: webhook.url },
  });

  const onSubmit = async (values: WebhookValues) => {
    try {
      const saved = await mutation.mutateAsync(values);
      toast.success(`“${saved.name}” saved`);
      onSaved();
    } catch (error) {
      applyServerErrors(error, setError, ["name", "url"]);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-3"
    >
      <Field
        id="webhook-name"
        label="Name"
        error={errors.name?.message}
        {...register("name")}
      />
      <Field
        id="webhook-url"
        label="URL"
        type="url"
        error={errors.url?.message}
        {...register("url")}
      />
      <div className="flex flex-col">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </div>
        <FormError
          message={errors.root?.server?.message}
          pending={isSubmitting}
        />
      </div>
    </form>
  );
};

/** Mirrors the form's box sizes, so the dialog keeps its size when the data arrives. */
export const WebhookFormSkeleton: FC = () => {
  const field = (labelWidth: string) => (
    <div className="flex flex-col gap-1">
      <Skeleton className={`h-5 ${labelWidth}`} />
      <Skeleton className="h-[38px] w-full rounded-md" />
      <span className="min-h-5" />
    </div>
  );

  return (
    <div
      role="status"
      aria-label="Loading webhook"
      className="flex flex-col gap-3"
    >
      {field("w-12")}
      {field("w-10")}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-[34px] w-20 rounded-md" />
        <Skeleton className="h-[34px] w-20 rounded-md" />
      </div>
    </div>
  );
};
