import { parseDatePtBR } from "./dates";

export interface CalendarEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
}

/**
 * Generate a Google Calendar URL for creating an event
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatDate(event.startDate)}/${formatDate(event.endDate)}`,
    details: event.description || "",
    location: event.location || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate an Outlook Calendar URL for creating an event
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const formatDate = (date: Date) => {
    return date.toISOString();
  };

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: formatDate(event.startDate),
    enddt: formatDate(event.endDate),
    body: event.description || "",
    location: event.location || "",
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate an ICS file content for downloading
 */
export function generateICSContent(event: CalendarEvent): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const escapeText = (text: string) => {
    return text.replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Joia Labs//Meeting//PT
BEGIN:VEVENT
UID:${Date.now()}@joia-ops
DTSTART:${formatDate(event.startDate)}
DTEND:${formatDate(event.endDate)}
SUMMARY:${escapeText(event.title)}
DESCRIPTION:${escapeText(event.description || "")}
LOCATION:${escapeText(event.location || "")}
END:VEVENT
END:VCALENDAR`;
}

/**
 * Download an ICS file
 */
export function downloadICSFile(event: CalendarEvent): void {
  const content = generateICSContent(event);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create calendar event from meeting data
 */
export function createCalendarEventFromMeeting(meeting: {
  title: string;
  date: string;
  time: string;
  agenda?: string;
  location?: string;
  link?: string;
  duration?: string;
}): CalendarEvent | null {
  const dateParsed = parseDatePtBR(meeting.date);
  if (!dateParsed) return null;

  const [hours, minutes] = (meeting.time || "09:00").split(":").map(Number);
  const startDate = new Date(dateParsed);
  startDate.setHours(hours || 9, minutes || 0, 0, 0);

  // Default duration: 1 hour
  let durationMinutes = 60;
  if (meeting.duration) {
    const match = meeting.duration.match(/(\d+)/);
    if (match) {
      durationMinutes = parseInt(match[1], 10);
    }
  }

  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  return {
    title: meeting.title,
    description: meeting.agenda,
    startDate,
    endDate,
    location: meeting.location || meeting.link,
  };
}

/**
 * Note about full calendar sync:
 * 
 * For complete bidirectional sync with Google Calendar and Outlook, you would need:
 * 
 * 1. Google Calendar API:
 *    - Create a project in Google Cloud Console
 *    - Enable the Google Calendar API
 *    - Set up OAuth 2.0 credentials
 *    - Implement OAuth flow to get user consent
 *    - Use the credentials to create/update/delete events
 * 
 * 2. Microsoft Graph API (Outlook):
 *    - Register an app in Azure AD
 *    - Configure API permissions for Calendars.ReadWrite
 *    - Implement OAuth flow
 *    - Use the access token to manage calendar events
 * 
 * This requires:
 *    - OAuth secrets stored securely (Supabase secrets)
 *    - Edge function to handle token exchange
 *    - Database table to store user refresh tokens
 *    - Proper redirect URLs configured in both providers
 */
