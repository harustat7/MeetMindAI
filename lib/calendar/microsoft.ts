import { absoluteUrl } from "@/lib/utils";

const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me";

export function getMicrosoftCalendarAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    redirect_uri: absoluteUrl("/api/calendar/microsoft/callback"),
    response_type: "code",
    response_mode: "query",
    state,
    scope: "offline_access openid email profile Calendars.Read User.Read"
  });

  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

export async function exchangeMicrosoftCode(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    redirect_uri: absoluteUrl("/api/calendar/microsoft/callback"),
    grant_type: "authorization_code"
  });

  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error("Microsoft token exchange failed");
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

export async function getMicrosoftProfile(accessToken: string) {
  const response = await fetch(GRAPH_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error("Microsoft profile request failed");
  }

  return response.json() as Promise<{ id: string; mail?: string; userPrincipalName?: string }>;
}

export async function fetchMicrosoftEvents(accessToken: string, startDateTime: Date, endDateTime: Date) {
  const params = new URLSearchParams({
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    "$orderby": "start/dateTime"
  });

  const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"'
    }
  });

  if (!response.ok) {
    throw new Error("Microsoft events request failed");
  }

  return response.json() as Promise<{
    value: Array<{
      id: string;
      subject?: string;
      bodyPreview?: string;
      location?: { displayName?: string };
      onlineMeeting?: { joinUrl?: string };
      isCancelled?: boolean;
      start: { dateTime: string };
      end: { dateTime: string };
      attendees?: Array<{
        emailAddress?: { name?: string; address?: string };
        status?: { response?: string };
      }>;
    }>;
  }>;
}
