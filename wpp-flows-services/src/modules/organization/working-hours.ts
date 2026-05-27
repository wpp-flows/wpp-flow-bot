const TIMEZONE = "America/Sao_Paulo";

const DAY_LABELS_PT = [
    "domingo",
    "segunda",
    "terça",
    "quarta",
    "quinta",
    "sexta",
    "sábado",
] as const;

export interface WorkingHoursSource {
    workingDaysOfWeek: number[];
    workingStartTime: string | null;
    workingEndTime: string | null;
    outOfHoursMessage: string | null;
}

function localNow(now: Date): { weekday: number; hhmm: string } {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TIMEZONE,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(now);

    const partOf = (type: string) =>
        parts.find((p) => p.type === type)?.value ?? "";
    const weekdayMap: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const weekday = weekdayMap[partOf("weekday")] ?? 0;
    // Intl can emit "24:00" at midnight in some locales — normalize to "00"
    // so the string compare against HH:MM bounds is safe.
    let hour = partOf("hour");
    if (hour === "24") hour = "00";
    const minute = partOf("minute");
    return { weekday, hhmm: `${hour}:${minute}` };
}

export function isWithinWorkingHours(
    source: WorkingHoursSource,
    now: Date = new Date(),
): boolean {
    const { weekday, hhmm } = localNow(now);

    if (
        source.workingDaysOfWeek.length > 0 &&
        !source.workingDaysOfWeek.includes(weekday)
    ) {
        return false;
    }

    const start = source.workingStartTime;
    const end = source.workingEndTime;
    if (!start || !end) return true;

    // overnight ranges (e.g. 18:00 → 02:00)
    if (start <= end) {
        return hhmm >= start && hhmm <= end;
    }
    return hhmm >= start || hhmm <= end;
}

/**
 * Variables exposed to the `outOfHoursMessage` template editor. Keep in sync
 * with the substitution map in {@link buildOutOfHoursMessage}.
 */
export const OUT_OF_HOURS_VARIABLES = [
    {
        key: "days_of_work",
        label: "Dias de atendimento",
        description: 'Dias da semana formatados (ex.: "de segunda a sexta").',
    },
    {
        key: "from",
        label: "Abre às",
        description: 'Horário de abertura ("HH:MM") ou vazio se sem restrição.',
    },
    {
        key: "to",
        label: "Fecha às",
        description: 'Horário de fechamento ("HH:MM") ou vazio se sem restrição.',
    },
] as const;

const TEMPLATE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export function buildOutOfHoursMessage(source: WorkingHoursSource): string {
    const days = formatWorkingDays(source.workingDaysOfWeek);
    const from = source.workingStartTime ?? "";
    const to = source.workingEndTime ?? "";

    const template = source.outOfHoursMessage?.trim();
    if (template) {
        return template.replaceAll(TEMPLATE_PATTERN, (_, key: string) => {
            switch (key) {
                case "days_of_work":
                    return days;
                case "from":
                    return from;
                case "to":
                    return to;
                default:
                    return "";
            }
        });
    }

    const hours = from && to ? `das ${from} às ${to}` : null;
    const parts: string[] = ["Estamos fora do horário de atendimento."];
    if (days || hours) {
        const tail = [days && `Trabalhamos ${days}`, hours].filter(Boolean).join(" ");
        parts.push(`${tail}. Aguardamos seu contato!`);
    } else {
        parts.push("Aguardamos seu contato em breve!");
    }
    return parts.join(" ");
}

function formatWorkingDays(days: number[]): string {
    if (days.length === 0) return "todos os dias";
    if (days.length === 7) return "todos os dias";
    const sorted = [...days].sort((a, b) => a - b);
    const isRange = sorted.every((d, i) => i === 0 || d === sorted[i - 1]! + 1);
    if (isRange && sorted.length >= 2) {
        return `de ${DAY_LABELS_PT[sorted[0]!]} a ${DAY_LABELS_PT[sorted[sorted.length - 1]!]}`;
    }
    return sorted.map((d) => DAY_LABELS_PT[d]).join(", ");
}
