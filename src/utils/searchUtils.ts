/**
 * Normalise a string for accent/diacritic-insensitive, case-insensitive search.
 * Strips combining diacritical marks (e.g. ā → a) and lowercases.
 */
export const normalizeSearch = (text: string): string =>
    text
        .normalize('NFD')                    // decompose combined characters
        .replace(/[\u0300-\u036f]/g, '')     // strip combining marks
        .toLowerCase();

/**
 * Returns true when `haystack` contains `query` after normalisation.
 * Always returns true when query is empty (show all results).
 */
export const matchesSearch = (haystack: string, query: string): boolean => {
    if (!query.trim()) return true;
    return normalizeSearch(haystack).includes(normalizeSearch(query));
};
