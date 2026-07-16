const thaiMonths = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function formatThaiBirthDate(dateString?: string) {
  if (!dateString) return "-";

  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "-";

  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  const dayNumber = Number(day);

  if (!thaiMonths[monthIndex] || dayNumber < 1 || dayNumber > 31) {
    return "-";
  }

  return `${dayNumber} ${thaiMonths[monthIndex]} ${year}`;
}
