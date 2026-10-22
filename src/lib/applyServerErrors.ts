import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { getErrorMessage, isApiError } from "../api/errors";

/** Maps a 422 payload onto form fields; anything that doesn't belong to a field goes to `root`. */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
) {
  if (!isApiError(error) || error.status !== 422) {
    setError("root.server", { message: getErrorMessage(error) });
    return;
  }

  const unmatched: string[] = [];
  for (const [key, messages] of Object.entries(error.fieldErrors)) {
    const field = fields.find((f) => f === key);
    if (field)
      setError(
        field,
        { type: "server", message: messages[0] },
        { shouldFocus: true },
      );
    else unmatched.push(...messages);
  }
  if (unmatched.length)
    setError("root.server", { message: unmatched.join(" ") });
}
