/** Export literal cell values; never turn patient-supplied text into Excel formulas. */
export function csvEscape(value: unknown): string {
	if (value === null || value === undefined) return "";
	let text = String(value);
	if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
	if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
	return text;
}
export function toCsvRow(values: unknown[]): string {
	return values.map(csvEscape).join(",");
}
