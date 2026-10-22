import { useCallback } from "react";
import { useSearchParams } from "react-router";

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export const MIN_SEARCH_LENGTH = 2;

/** Too-short searches (e.g. typed into the URL by hand) mean "no filter". */
function parseSearch(value: string | null): string {
  return value && value.trim().length >= MIN_SEARCH_LENGTH ? value : "";
}

/** The URL is the single source of truth for list state, so reload and back/forward just work. */
export function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get("page"));
  const search = parseSearch(searchParams.get("search"));

  const setPage = useCallback(
    (next: number) =>
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (next > 1) params.set("page", String(next));
        else params.delete("page");
        return params;
      }),
    [setSearchParams],
  );

  const setSearch = useCallback(
    (next: string) =>
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (next) params.set("search", next);
        else params.delete("search");
        // A new search starts from the first page.
        params.delete("page");
        return params;
      }),
    [setSearchParams],
  );

  return { page, search, setPage, setSearch };
}
