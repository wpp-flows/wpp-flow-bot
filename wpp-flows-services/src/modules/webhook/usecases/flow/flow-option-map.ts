import type { ButtonOption, ListSection } from "./flow-list-types";
import { BACK_ID } from "./flow-shared";

/**
 * Builds a lookup of user-typed replies → selection ids. The map covers the
 * 1-based index of each row, the row title (lowercased + trimmed), and the
 * raw rowId. Used as a fallback when the user types instead of tapping.
 */
export function buildListOptionMap(
    sections: ListSection[],
): Record<string, string> {
    const map: Record<string, string> = {};
    let n = 1;
    for (const section of sections) {
        for (const row of section.rows) {
            map[String(n)] = row.rowId;
            map[row.title.trim().toLowerCase()] = row.rowId;
            map[row.rowId.toLowerCase()] = row.rowId;
            n += 1;
        }
    }
    // Common verbs people actually type in pt-BR.
    if (Object.values(map).includes(BACK_ID)) {
        map["voltar"] = BACK_ID;
    }
    return map;
}

export function buildButtonsOptionMap(
    buttons: ButtonOption[],
): Record<string, string> {
    const map: Record<string, string> = {};
    buttons.forEach((btn, idx) => {
        map[String(idx + 1)] = btn.buttonId;
        map[btn.buttonText.displayText.trim().toLowerCase()] = btn.buttonId;
        // Strip leading emoji + space so "confirmar" matches "✅ Confirmar".
        const stripped = btn.buttonText.displayText
            .replace(/^[^\p{L}\p{N}]+/u, "")
            .trim()
            .toLowerCase();
        if (stripped) map[stripped] = btn.buttonId;
        map[btn.buttonId.toLowerCase()] = btn.buttonId;
    });
    return map;
}

export function renderListAsText(input: {
    title: string;
    description: string;
    sections: ListSection[];
}): string {
    const lines: string[] = [];
    lines.push(input.title);
    if (input.description) lines.push("", input.description);
    let n = 1;
    for (const section of input.sections) {
        lines.push("", `*${section.title}*`);
        for (const row of section.rows) {
            const desc = row.description ? ` — ${row.description}` : "";
            lines.push(`${n}. ${row.title}${desc}`);
            n += 1;
        }
    }
    lines.push("", "Responda com o número da opção desejada.");
    return lines.join("\n");
}

export function renderButtonsAsText(buttons: ButtonOption[]): string {
    const items = buttons
        .map((b, i) => `${i + 1}. ${b.buttonText.displayText}`)
        .join("\n");
    return `${items}\n\nResponda com o número ou nome da opção.`;
}

export function resolveTypedSelection(
    text: string | null | undefined,
    map: Record<string, string> | undefined,
): string | null {
    if (!text || !map) return null;
    const normalized = text.trim().toLowerCase();
    if (!normalized) return null;
    return map[normalized] ?? null;
}
