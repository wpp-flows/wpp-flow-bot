/**
 * Local shape for menu/list rendering. The flow runner ships these as plain
 * numbered text (Evolution's `sendList` / `sendButtons` interactive widgets
 * proved unreliable across Baileys versions and are no longer used). The
 * shapes are still useful because the option-map fallback parses typed
 * replies like "1", "voltar" back to the rowId/buttonId.
 */

export interface ListRow {
    /** Selection id the runner uses to route a typed/tapped reply. */
    rowId: string;
    title: string;
    description?: string;
}

export interface ListSection {
    title: string;
    rows: ListRow[];
}

export interface ButtonOption {
    buttonId: string;
    buttonText: { displayText: string };
}
