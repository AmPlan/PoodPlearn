const DEFAULT_TIMEZONE = "Asia/Bangkok";

/**
 * Formats a Date object to "YYYY-MM-DD" based on the target timezone.
 */
export function formatLocalDate(
	value: Date,
	timeZone: string = DEFAULT_TIMEZONE,
): string {
	// 'en-CA' locale natively outputs ISO format (YYYY-MM-DD)
	return new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(value);
}

/**
 * Returns a UTC Midnight Date representing 00:00:00 in the target timezone.
 */
export function startOfDay(
	value: Date = new Date(),
	timeZone: string = DEFAULT_TIMEZONE,
): Date {
	const localDateStr = formatLocalDate(value, timeZone);
	return new Date(`${localDateStr}T00:00:00.000Z`);
}

/**
 * Parses a "YYYY-MM-DD" string into a UTC Midnight Date instance.
 */
export function parseLocalDate(value: string): Date {
	const [year, month, day] = value.split("-").map(Number);
	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		!Number.isInteger(day)
	) {
		return new Date(NaN);
	}
	return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Adds calendar days safely using UTC dates to prevent DST/timezone drift.
 */
export function addDays(value: Date, days: number): Date {
	const date = new Date(value);
	date.setUTCDate(date.getUTCDate() + days);
	return date;
}

/**
 * Computes average of a numeric array.
 */
export function average(values: number[]): number {
	if (values.length === 0) return 0;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}