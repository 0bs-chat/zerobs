"use node";

import { tool } from "@langchain/core/tools";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { z } from "zod";
import type { ExtendedRunnableConfig } from "../helpers";
import { internal } from "../../_generated/api";

async function getGoogleAccessToken(config: ExtendedRunnableConfig) {
  try {
    const token = await config.ctx.runAction(
      internal.utils.oauth.index.getRefreshedAccessToken,
      { provider: "google" }
    );
    return token;
  } catch (_err) {
    return undefined;
  }
}

async function makeGoogleAPIRequest(
  endpoint: string,
  accessToken: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3${endpoint}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Google API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

async function makeGmailAPIRequest(
  endpoint: string,
  accessToken: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  const response = await fetch(
    `https://www.googleapis.com/gmail/v1${endpoint}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Gmail API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export const getGoogleTools = async (config: ExtendedRunnableConfig) => {
  const accessToken = await getGoogleAccessToken(config);
  if (!accessToken) {
    return [];
  }

  // Google Calendar Tools
  const listCalendarsTool = tool(
    async (_args: {}, toolConfig: any) => {
      try {
        await dispatchCustomEvent(
          "tool_progress",
          { chunk: "Checking Google authentication…" },
          toolConfig
        );
        await dispatchCustomEvent(
          "tool_progress",
          { chunk: "Fetching your Google calendars…" },
          toolConfig
        );
        const result = await makeGoogleAPIRequest(
          "/users/me/calendarList",
          accessToken
        );

        const calendars =
          result.items?.map((calendar: any) => ({
            id: calendar.id,
            name: calendar.summary,
            description: calendar.description,
            primary: calendar.primary,
            accessRole: calendar.accessRole,
          })) || [];

        await dispatchCustomEvent(
          "tool_progress",
          { chunk: `Found ${calendars.length} calendars. Formatting results…` },
          toolConfig
        );

        return JSON.stringify(calendars, null, 2);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        await dispatchCustomEvent(
          "tool_progress",
          { chunk: `Failed to list calendars: ${message}`, complete: true },
          toolConfig
        );
        return `Failed to list calendars: ${message}`;
      }
    },
    {
      name: "listGoogleCalendars",
      description:
        "List all Google Calendars accessible to the user. Use this to see available calendars before working with events.",
      schema: z.object({}),
    }
  );

  const listCalendarEventsTool = tool(
    async (
      {
        calendarId = "primary",
        timeMin,
        timeMax,
        maxResults = 10,
        q,
      }: {
        calendarId: string;
        timeMin?: string;
        timeMax?: string;
        maxResults?: number;
        q?: string;
      },
      toolConfig: any
    ) => {
      try {
        await dispatchCustomEvent(
          "tool_progress",
          {
            chunk: `Fetching events from calendar '${calendarId}'${
              timeMin || timeMax
                ? ` within ${timeMin ?? "-∞"} → ${timeMax ?? "+∞"}`
                : ""
            }…`,
          },
          toolConfig
        );
        const params = new URLSearchParams({
          maxResults: maxResults.toString(),
          singleEvents: "true",
          orderBy: "startTime",
        });

        if (timeMin) params.append("timeMin", timeMin);
        if (timeMax) params.append("timeMax", timeMax);
        if (q) params.append("q", q);

        const result = await makeGoogleAPIRequest(
          `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
          accessToken
        );

        const events =
          result.items?.map((event: any) => ({
            id: event.id,
            summary: event.summary,
            description: event.description,
            start: event.start,
            end: event.end,
            location: event.location,
            attendees: event.attendees,
            creator: event.creator,
            organizer: event.organizer,
          })) || [];
        await dispatchCustomEvent(
          "tool_progress",
          { chunk: `Found ${events.length} events. Formatting results…` },
          toolConfig
        );

        return JSON.stringify(events, null, 2);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        await dispatchCustomEvent(
          "tool_progress",
          {
            chunk: `Failed to list calendar events: ${message}`,
            complete: true,
          },
          toolConfig
        );
        return `Failed to list calendar events: ${message}`;
      }
    },
    {
      name: "listGoogleCalendarEvents",
      description:
        "List events from a specific Google Calendar. Use this to see upcoming or past events.",
      schema: z.object({
        calendarId: z
          .string()
          .describe("The calendar ID (use 'primary' for default calendar)")
          .default("primary"),
        timeMin: z
          .string()
          .optional()
          .describe(
            "Lower bound (inclusive) for an event's end time (RFC3339 timestamp)"
          ),
        timeMax: z
          .string()
          .optional()
          .describe(
            "Upper bound (exclusive) for an event's start time (RFC3339 timestamp)"
          ),
        maxResults: z
          .number()
          .min(1)
          .max(2500)
          .default(10)
          .describe("Maximum number of events to return"),
        q: z
          .string()
          .optional()
          .describe("Free text search terms to find events"),
      }),
    }
  );

  const createCalendarEventTool = tool(
    async (
      {
        calendarId = "primary",
        summary,
        description,
        startDateTime,
        endDateTime,
        location,
        attendees,
      }: {
        calendarId: string;
        summary: string;
        description?: string;
        startDateTime: string;
        endDateTime: string;
        location?: string;
        attendees?: string[];
      },
      toolConfig: any
    ) => {
      try {
        await dispatchCustomEvent(
          "tool_progress",
          {
            chunk: `Creating event '${summary}' on '${calendarId}' from ${startDateTime} to ${endDateTime}…`,
          },
          toolConfig
        );
        const event = {
          summary,
          description,
          location,
          start: {
            dateTime: startDateTime,
          },
          end: {
            dateTime: endDateTime,
          },
          attendees: attendees?.map((email) => ({ email })),
        };

        const result = await makeGoogleAPIRequest(
          `/calendars/${encodeURIComponent(calendarId)}/events`,
          accessToken,
          "POST",
          event
        );

        const createdEvent = {
          id: result.id,
          summary: result.summary,
          description: result.description,
          start: result.start,
          end: result.end,
          location: result.location,
          htmlLink: result.htmlLink,
        };

        await dispatchCustomEvent(
          "tool_progress",
          { chunk: "Event created successfully. Preparing output…" },
          toolConfig
        );

        return JSON.stringify(createdEvent, null, 2);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        await dispatchCustomEvent(
          "tool_progress",
          {
            chunk: `Failed to create calendar event: ${message}`,
            complete: true,
          },
          toolConfig
        );
        return `Failed to create calendar event: ${message}`;
      }
    },
    {
      name: "createGoogleCalendarEvent",
      description:
        "Create a new event in a Google Calendar. Use this to schedule meetings, appointments, or reminders.",
      schema: z.object({
        calendarId: z
          .string()
          .describe("The calendar ID (use 'primary' for default calendar)")
          .default("primary"),
        summary: z.string().describe("The title/summary of the event"),
        description: z
          .string()
          .optional()
          .describe("The description of the event"),
        startDateTime: z
          .string()
          .describe(
            "Start date and time (RFC3339 format, e.g., '2024-01-15T09:00:00-07:00')"
          ),
        endDateTime: z
          .string()
          .describe(
            "End date and time (RFC3339 format, e.g., '2024-01-15T10:00:00-07:00')"
          ),
        location: z.string().optional().describe("The location of the event"),
        attendees: z
          .array(z.string())
          .optional()
          .describe("List of email addresses of attendees"),
      }),
    }
  );

  const updateCalendarEventTool = tool(
    async (
      {
        calendarId = "primary",
        eventId,
        summary,
        description,
        startDateTime,
        endDateTime,
        location,
      }: {
        calendarId: string;
        eventId: string;
        summary?: string;
        description?: string;
        startDateTime?: string;
        endDateTime?: string;
        location?: string;
      },
      toolConfig: any
    ) => {
      try {
        await dispatchCustomEvent(
          "tool_progress",
          {
            chunk: `Loading existing event '${eventId}' from '${calendarId}'…`,
          },
          toolConfig
        );
        const existingEvent = await makeGoogleAPIRequest(
          `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
          accessToken
        );

        await dispatchCustomEvent(
          "tool_progress",
          { chunk: "Applying updates to the event…" },
          toolConfig
        );
        const updatedEvent = {
          ...existingEvent,
          ...(summary && { summary }),
          ...(description && { description }),
          ...(location && { location }),
          ...(startDateTime && { start: { dateTime: startDateTime } }),
          ...(endDateTime && { end: { dateTime: endDateTime } }),
        };

        const result = await makeGoogleAPIRequest(
          `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
          accessToken,
          "PUT",
          updatedEvent
        );

        const event = {
          id: result.id,
          summary: result.summary,
          description: result.description,
          start: result.start,
          end: result.end,
          location: result.location,
          htmlLink: result.htmlLink,
        };

        await dispatchCustomEvent(
          "tool_progress",
          { chunk: "Event updated successfully. Preparing output…" },
          toolConfig
        );

        return JSON.stringify(event, null, 2);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        await dispatchCustomEvent(
          "tool_progress",
          {
            chunk: `Failed to update calendar event: ${message}`,
            complete: true,
          },
          toolConfig
        );
        return `Failed to update calendar event: ${message}`;
      }
    },
    {
      name: "updateGoogleCalendarEvent",
      description:
        "Update an existing event in a Google Calendar. Use this to modify event details.",
      schema: z.object({
        calendarId: z
          .string()
          .describe("The calendar ID (use 'primary' for default calendar)")
          .default("primary"),
        eventId: z.string().describe("The ID of the event to update"),
        summary: z
          .string()
          .optional()
          .describe("The new title/summary of the event"),
        description: z
          .string()
          .optional()
          .describe("The new description of the event"),
        startDateTime: z
          .string()
          .optional()
          .describe("New start date and time (RFC3339 format)"),
        endDateTime: z
          .string()
          .optional()
          .describe("New end date and time (RFC3339 format)"),
        location: z
          .string()
          .optional()
          .describe("The new location of the event"),
      }),
    }
  );

  const deleteCalendarEventTool = tool(
    async (
      {
        calendarId = "primary",
        eventId,
      }: { calendarId: string; eventId: string },
      toolConfig: any
    ) => {
      try {
        await dispatchCustomEvent(
          "tool_progress",
          { chunk: `Deleting event '${eventId}' from '${calendarId}'…` },
          toolConfig
        );
        await makeGoogleAPIRequest(
          `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
          accessToken,
          "DELETE"
        );

        const result = {
          success: true,
          message: `Event ${eventId} deleted successfully`,
        };
        await dispatchCustomEvent(
          "tool_progress",
          { chunk: "Event deleted successfully." },
          toolConfig
        );

        return JSON.stringify(result, null, 2);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        await dispatchCustomEvent(
          "tool_progress",
          {
            chunk: `Failed to delete calendar event: ${message}`,
            complete: true,
          },
          toolConfig
        );
        return `Failed to delete calendar event: ${message}`;
      }
    },
    {
      name: "deleteGoogleCalendarEvent",
      description:
        "Delete an event from a Google Calendar. Use this to cancel or remove events.",
      schema: z.object({
        calendarId: z
          .string()
          .describe("The calendar ID (use 'primary' for default calendar)")
          .default("primary"),
        eventId: z.string().describe("The ID of the event to delete"),
      }),
    }
  );

  // Gmail Tools
  const listGmailMessagesTool = tool(
    async (
      {
        q,
        maxResults = 10,
        labelIds,
      }: { q?: string; maxResults?: number; labelIds?: string[] },
      toolConfig: any
    ) => {
      try {
        await dispatchCustomEvent(
          "tool_progress",
          { chunk: "Fetching Gmail messages…" },
          toolConfig
        );
        const params = new URLSearchParams({
          maxResults: maxResults.toString(),
        });

        if (q) params.append("q", q);
        if (labelIds?.length) {
          labelIds.forEach((labelId) => params.append("labelIds", labelId));
        }

        const result = await makeGmailAPIRequest(
          `/users/me/messages?${params}`,
          accessToken
        );

        const messages = await Promise.all(
          (result.messages || []).map(async (message: any) => {
            const fullMessage = await makeGmailAPIRequest(
              `/users/me/messages/${message.id}`,
              accessToken
            );

            const headers = fullMessage.payload?.headers || [];
            const getHeader = (name: string) =>
              headers.find(
                (h: any) => h.name.toLowerCase() === name.toLowerCase()
              )?.value;

            return {
              id: fullMessage.id,
              threadId: fullMessage.threadId,
              snippet: fullMessage.snippet,
              from: getHeader("from"),
              to: getHeader("to"),
              subject: getHeader("subject"),
              date: getHeader("date"),
              labelIds: fullMessage.labelIds,
            };
          })
        );

        await dispatchCustomEvent(
          "tool_progress",
          { chunk: `Found ${messages.length} messages. Formatting results…` },
          toolConfig
        );

        return JSON.stringify(messages, null, 2);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        await dispatchCustomEvent(
          "tool_progress",
          {
            chunk: `Failed to list Gmail messages: ${message}`,
            complete: true,
          },
          toolConfig
        );
        return `Failed to list Gmail messages: ${message}`;
      }
    },
    {
      name: "listGmailMessages",
      description:
        "List Gmail messages. Use this to search and retrieve email messages.",
      schema: z.object({
        q: z
          .string()
          .optional()
          .describe(
            "Gmail search query (e.g., 'from:example@gmail.com', 'subject:meeting', 'is:unread')"
          ),
        maxResults: z
          .number()
          .min(1)
          .max(500)
          .default(10)
          .describe("Maximum number of messages to return"),
        labelIds: z
          .array(z.string())
          .optional()
          .describe("Only return messages with these label IDs"),
      }),
    }
  );

  const getGmailMessageTool = tool(
    async (
      {
        messageId,
        format = "full",
      }: { messageId: string; format?: "full" | "metadata" | "minimal" },
      toolConfig: any
    ) => {
      try {
        await dispatchCustomEvent(
          "tool_progress",
          { chunk: `Fetching Gmail message '${messageId}'…` },
          toolConfig
        );
        const result = await makeGmailAPIRequest(
          `/users/me/messages/${messageId}?format=${format}`,
          accessToken
        );

        const headers = result.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
            ?.value;

        let body = "";
        if (result.payload?.body?.data) {
          body = Buffer.from(result.payload.body.data, "base64").toString();
        } else if (result.payload?.parts) {
          const textPart = result.payload.parts.find(
            (part: any) => part.mimeType === "text/plain"
          );
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, "base64").toString();
          }
        }

        const message = {
          id: result.id,
          threadId: result.threadId,
          snippet: result.snippet,
          from: getHeader("from"),
          to: getHeader("to"),
          subject: getHeader("subject"),
          date: getHeader("date"),
          body: body,
          labelIds: result.labelIds,
        };

        await dispatchCustomEvent(
          "tool_progress",
          { chunk: "Message loaded. Preparing output…" },
          toolConfig
        );

        return JSON.stringify(message, null, 2);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        await dispatchCustomEvent(
          "tool_progress",
          { chunk: `Failed to get Gmail message: ${message}`, complete: true },
          toolConfig
        );
        return `Failed to get Gmail message: ${message}`;
      }
    },
    {
      name: "getGmailMessage",
      description:
        "Get the full content of a specific Gmail message. Use this to read the complete email content.",
      schema: z.object({
        messageId: z.string().describe("The ID of the message to retrieve"),
        format: z
          .enum(["full", "metadata", "minimal"])
          .default("full")
          .describe("The format to return the message in"),
      }),
    }
  );

  const sendGmailMessageTool = tool(
    async (
      {
        to,
        subject,
        body,
        cc,
        bcc,
      }: {
        to: string;
        subject: string;
        body: string;
        cc?: string;
        bcc?: string;
      },
      toolConfig: any
    ) => {
      try {
        await dispatchCustomEvent(
          "tool_progress",
          { chunk: `Composing email to ${to} with subject '${subject}'…` },
          toolConfig
        );
        let email = `To: ${to}\r\n`;
        if (cc) email += `Cc: ${cc}\r\n`;
        if (bcc) email += `Bcc: ${bcc}\r\n`;
        email += `Subject: ${subject}\r\n`;
        email += `\r\n${body}`;

        const encodedEmail = Buffer.from(email)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        await dispatchCustomEvent(
          "tool_progress",
          { chunk: "Sending email via Gmail API…" },
          toolConfig
        );
        const result = await makeGmailAPIRequest(
          `/users/me/messages/send`,
          accessToken,
          "POST",
          { raw: encodedEmail }
        );

        const sentMessage = {
          id: result.id,
          threadId: result.threadId,
          labelIds: result.labelIds,
          message: "Email sent successfully",
        };

        await dispatchCustomEvent(
          "tool_progress",
          { chunk: "Email sent successfully. Preparing output…" },
          toolConfig
        );

        return JSON.stringify(sentMessage, null, 2);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        await dispatchCustomEvent(
          "tool_progress",
          { chunk: `Failed to send Gmail message: ${message}`, complete: true },
          toolConfig
        );
        return `Failed to send Gmail message: ${message}`;
      }
    },
    {
      name: "sendGmailMessage",
      description:
        "Send a new Gmail message. Use this to compose and send emails.",
      schema: z.object({
        to: z.string().describe("Recipient email address"),
        subject: z.string().describe("Email subject line"),
        body: z.string().describe("Email body content"),
        cc: z.string().optional().describe("CC email address"),
        bcc: z.string().optional().describe("BCC email address"),
      }),
    }
  );

  const searchGmailTool = tool(
    async (
      { query, maxResults = 10 }: { query: string; maxResults?: number },
      toolConfig: any
    ) => {
      try {
        await dispatchCustomEvent(
          "tool_progress",
          { chunk: `Searching Gmail for: ${query}…` },
          toolConfig
        );
        const params = new URLSearchParams({
          q: query,
          maxResults: maxResults.toString(),
        });

        const result = await makeGmailAPIRequest(
          `/users/me/messages?${params}`,
          accessToken
        );

        const messages = await Promise.all(
          (result.messages || [])
            .slice(0, maxResults)
            .map(async (message: any) => {
              const fullMessage = await makeGmailAPIRequest(
                `/users/me/messages/${message.id}?format=metadata`,
                accessToken
              );

              const headers = fullMessage.payload?.headers || [];
              const getHeader = (name: string) =>
                headers.find(
                  (h: any) => h.name.toLowerCase() === name.toLowerCase()
                )?.value;

              return {
                id: fullMessage.id,
                threadId: fullMessage.threadId,
                snippet: fullMessage.snippet,
                from: getHeader("from"),
                to: getHeader("to"),
                subject: getHeader("subject"),
                date: getHeader("date"),
              };
            })
        );

        await dispatchCustomEvent(
          "tool_progress",
          { chunk: `Found ${messages.length} matching messages. Formatting…` },
          toolConfig
        );

        return JSON.stringify(messages, null, 2);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        await dispatchCustomEvent(
          "tool_progress",
          { chunk: `Failed to search Gmail: ${message}`, complete: true },
          toolConfig
        );
        return `Failed to search Gmail: ${message}`;
      }
    },
    {
      name: "searchGmail",
      description:
        "Search Gmail messages with advanced query options. Use this for complex email searches.",
      schema: z.object({
        query: z
          .string()
          .describe(
            "Gmail search query (supports Gmail search operators like 'from:', 'subject:', 'has:attachment', etc.)"
          ),
        maxResults: z
          .number()
          .min(1)
          .max(100)
          .default(10)
          .describe("Maximum number of results to return"),
      }),
    }
  );

  return [
    listCalendarsTool,
    listCalendarEventsTool,
    createCalendarEventTool,
    updateCalendarEventTool,
    deleteCalendarEventTool,
    listGmailMessagesTool,
    getGmailMessageTool,
    sendGmailMessageTool,
    searchGmailTool,
  ];
};
