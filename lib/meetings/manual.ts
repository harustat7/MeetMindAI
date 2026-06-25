export function parseAttendees(input: string) {
  return input
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const emailMatch = item.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      const email = emailMatch?.[0].toLowerCase();
      const name = item
        .replace(/[<(\[]?[^<\s()[\]]+@[^<\s()[\]]+[>)\]]?/g, "")
        .trim()
        .replace(/^["']|["']$/g, "");

      return {
        name: name || undefined,
        email
      };
    })
    .filter((attendee) => attendee.name || attendee.email);
}

export function combineDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? null : value;
}
