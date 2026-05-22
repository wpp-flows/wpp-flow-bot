import type { Bot } from "./repositories/bot-repo";

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

/**
 * Returns the local weekday (0=Sunday..6=Saturday) and HH:MM time string for
 * `now` in the bot's timezone. Centralized so callers don't reinvent the
 * Intl.DateTimeFormat dance.
 */
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
    // Intl returns 00..24 for hour ("24:00" appears at midnight in some locales);
    // normalize "24" → "00" so the string compare below is safe.
    let hour = partOf("hour");
    if (hour === "24") hour = "00";
    const minute = partOf("minute");
    return { weekday, hhmm: `${hour}:${minute}` };
}

/**
 * Whether `now` falls inside the bot's configured working window. A bot with
 * no constraints (empty days + null hours) is treated as 24/7.
 *
 * Hours-only or days-only configs are honored independently — e.g., setting
 * just `workingStartTime`/`workingEndTime` enforces the time window every day.
 */
export function isBotWithinWorkingHours(bot: Bot, now: Date = new Date()): boolean {
    const { weekday, hhmm } = localNow(now);

    if (bot.workingDaysOfWeek.length > 0 && !bot.workingDaysOfWeek.includes(weekday)) {
        return false;
    }

    const start = bot.workingStartTime;
    const end = bot.workingEndTime;
    if (!start || !end) return true;

    // overnight ranges
    if (start <= end) {
        return hhmm >= start && hhmm <= end;
    }
    return hhmm >= start || hhmm <= end;
}

/**
 * Builds the out-of-hours reply. Uses the bot's custom `outOfHoursMessage`
 * when set; otherwise auto-builds something like
 *   "Estamos fora do horário de atendimento. Trabalhamos de segunda a sexta,
 *    das 08:00 às 17:00."
 */
export function buildOutOfHoursMessage(bot: Bot): string {
    if (bot.outOfHoursMessage?.trim()) return bot.outOfHoursMessage.trim();

    const days = formatWorkingDays(bot.workingDaysOfWeek);
    const hours =
        bot.workingStartTime && bot.workingEndTime
            ? `das ${bot.workingStartTime} às ${bot.workingEndTime}`
            : null;

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
    // detect a contiguous range (most common case: 1..5 = "segunda a sexta").
    const sorted = [...days].sort((a, b) => a - b);
    const isRange = sorted.every((d, i) => i === 0 || d === sorted[i - 1]! + 1);
    if (isRange && sorted.length >= 2) {
        return `de ${DAY_LABELS_PT[sorted[0]!]} a ${DAY_LABELS_PT[sorted[sorted.length - 1]!]}`;
    }
    return sorted.map((d) => DAY_LABELS_PT[d]).join(", ");
}
