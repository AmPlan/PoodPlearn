// eslint-disable-next-line no-control-regex
const FORMULA_INJECTION = /^[\s\x00-\x1f\x7f-\x9f]*[=+\-@]/; // Detect CSV Injection 
const NEEDS_QUOTING = /[",\r\n]/;

function csvEscape(value: unknown): string {
    if (value == null) return "";

    let text = String(value);

    if (FORMULA_INJECTION.test(text)) {
        text = `'${text}`;
    }

    return NEEDS_QUOTING.test(text)
        ? `"${text.replace(/"/g, '""')}"`
        : text;
}

export function toCsvRow(values: unknown[]): string {
    return values.map(csvEscape).join(",");
}