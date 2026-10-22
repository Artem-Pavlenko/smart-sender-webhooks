import { Search } from "lucide-react";
import { useEffect, useState, type FC } from "react";

import { MIN_SEARCH_LENGTH } from "../../hooks/useListParams";

const DEBOUNCE_MS = 300;

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

// Shorter input means "no filter", but the typed characters stay in the field.
const isTooShort = (text: string) =>
  text.trim().length > 0 && text.trim().length < MIN_SEARCH_LENGTH;
const toSearch = (text: string) => (isTooShort(text) ? "" : text);

export const SearchField: FC<SearchFieldProps> = ({ value, onChange }) => {
  const [draft, setDraft] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  // The URL changed. Replace the input only if it disagrees with what is typed (back/forward,
  // a link) — not when the URL just caught up with the user, e.g. "or" → "o" clears the filter.
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== toSearch(draft)) setDraft(value);
  }

  const tooShort = isTooShort(draft);
  const search = toSearch(draft);

  useEffect(() => {
    if (search === value) return;
    const timer = setTimeout(() => onChange(search), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, value, onChange]);

  return (
    <label className="relative w-full max-w-xs">
      <Search
        size={16}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted"
      />
      <input
        type="search"
        aria-label="Search by name"
        aria-describedby="search-hint"
        placeholder="Search by name…"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="w-full rounded-lg border border-line-strong bg-surface py-2 pr-3 pl-9 text-sm transition-[border-color,box-shadow] duration-150 outline-none focus:border-accent focus:ring-3 focus:ring-accent/20"
      />
      {/* Positioned out of flow, so showing it never shifts the page. */}
      <span
        id="search-hint"
        className={`absolute top-full left-0 mt-1 text-xs text-fg-muted transition-opacity duration-150 ${tooShort ? "opacity-100" : "opacity-0"}`}
      >
        Type at least {MIN_SEARCH_LENGTH} characters to search
      </span>
    </label>
  );
};
