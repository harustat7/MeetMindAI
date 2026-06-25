type IcsEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  attendees: Array<{ name?: string; email?: string }>;
};

function unfoldIcs(input: string) {
  return input.replace(/\r?\n[ \t]/g, "");
}

function unescapeIcs(value: string) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseLine(line: string) {
  const separator = line.indexOf(":");
  if (separator === -1) return null;
  const rawName = line.slice(0, separator);
  const value = line.slice(separator + 1);
  const [name, ...params] = rawName.split(";");

  return {
    name: name.toUpperCase(),
    params,
    value
  };
}

function parseDate(value: string) {
  if (/^\d{8}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    return new Date(Date.UTC(year, month, day));
  }

  const normalized = value.endsWith("Z")
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`
    : `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function paramValue(params: string[], key: string) {
  const match = params.find((param) => param.toUpperCase().startsWith(`${key.toUpperCase()}=`));
  return match?.slice(key.length + 1).replace(/^"|"$/g, "");
}

export function parseIcsCalendar(input: string): IcsEvent[] {
  const lines = unfoldIcs(input).split(/\r?\n/);
  const events: string[][] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    if (line.trim() === "BEGIN:VEVENT") {
      current = [];
      continue;
    }
    if (line.trim() === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (current) current.push(line);
  }

  return events.flatMap((eventLines) => {
    let uid = "";
    let title = "Untitled calendar event";
    let description: string | undefined;
    let location: string | undefined;
    let startsAt: Date | null = null;
    let endsAt: Date | null = null;
    const attendees: Array<{ name?: string; email?: string }> = [];

    for (const rawLine of eventLines) {
      const line = parseLine(rawLine);
      if (!line) continue;

      if (line.name === "UID") uid = unescapeIcs(line.value);
      if (line.name === "SUMMARY") title = unescapeIcs(line.value) || title;
      if (line.name === "DESCRIPTION") description = unescapeIcs(line.value);
      if (line.name === "LOCATION") location = unescapeIcs(line.value);
      if (line.name === "DTSTART") startsAt = parseDate(line.value);
      if (line.name === "DTEND") endsAt = parseDate(line.value);
      if (line.name === "ATTENDEE") {
        const email = line.value.replace(/^mailto:/i, "").trim();
        attendees.push({
          name: paramValue(line.params, "CN"),
          email: email.includes("@") ? email : undefined
        });
      }
    }

    if (!startsAt) return [];
    return [{
      uid: uid || `${title}-${startsAt.toISOString()}`,
      title,
      description,
      location,
      startsAt,
      endsAt: endsAt ?? new Date(startsAt.getTime() + 60 * 60 * 1000),
      attendees
    }];
  });
}
