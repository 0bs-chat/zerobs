"use node";

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { ExtendedRunnableConfig } from "../helpers";
import { api } from "../../_generated/api";

// Helper function to get Google OAuth token from user's external account
async function getGoogleAccessToken(config: ExtendedRunnableConfig) {
  const token = await config.ctx.runQuery(api.auth.getToken, {
    providerId: "google",
  });
  const requiredScopes = ["https://www.googleapis.com/auth/calendar", "https://mail.google.com/"];
  const tokenScopes = token?.scopes;
  const hasRequiredScopes = requiredScopes.every((scope) => tokenScopes?.includes(scope));
  if (!hasRequiredScopes) {
    return undefined;
  }
  return token?.token;
}

// Helper function to make authenticated Google API requests
async function makeGoogleAPIRequest(
  endpoint: string,
  accessToken: string,
  method: string = "GET",
  body?: any,
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
    },
  );

  if (!response.ok) {
    throw new Error(
      `Google API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

// Helper function to make Gmail API requests
async function makeGmailAPIRequest(
  endpoint: string,
  accessToken: string,
  method: string = "GET",
  body?: any,
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
    },
  );

  if (!response.ok) {
    throw new Error(
      `Gmail API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export const getGoogleTools = async (
  config: ExtendedRunnableConfig,
  returnString: boolean = false,
) => {
  const accessToken = await getGoogleAccessToken(config);
  if (!accessToken) {
    return [];
  }

  // Google Calendar Tools
  const listCalendarseTool = new DynamicStructuredTool({
    name: "listGoogleCalendars",
    description:
      "List all Google Calendars accessible to the user. Use this to see available calendars before working with events.",
    schema: z.object({}),
    func: async () => {
      try {
        const result = await makeGoogleAPIRequest(
          "/users/me/calendarList",
          accessToken,
        );

        const calendars =
          result.items?.map((calendar: any) => ({
            id: calendar.id,
            name: calendar.summary,
            description: calendar.description,
            primary: calendar.primary,
            accessRole: calendar.accessRole,
          })) || [];

        if (returnString) {
          return JSON.stringify(calendars, null, 2);
        }
        return calendars;
      } catch (error) {
        return `Failed to list calendars: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  const listCalendarEventsTool = new DynamicStructuredTool({
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
          "Lower bound (inclusive) for an event's end time (RFC3339 timestamp)",
        ),
      timeMax: z
        .string()
        .optional()
        .describe(
          "Upper bound (exclusive) for an event's start time (RFC3339 timestamp)",
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
    func: async ({
      calendarId = "primary",
      timeMin,
      timeMax,
      maxResults = 10,
      q,
    }) => {
      try {
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
          accessToken,
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

        if (returnString) {
          return JSON.stringify(events, null, 2);
        }
        return events;
      } catch (error) {
        return `Failed to list calendar events: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  const createCalendarEventTool = new DynamicStructuredTool({
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
          "Start date and time (RFC3339 format, e.g., '2024-01-15T09:00:00-07:00')",
        ),
      endDateTime: z
        .string()
        .describe(
          "End date and time (RFC3339 format, e.g., '2024-01-15T10:00:00-07:00')",
        ),
      location: z.string().optional().describe("The location of the event"),
      attendees: z
        .array(z.string())
        .optional()
        .describe("List of email addresses of attendees"),
    }),
    func: async ({
      calendarId = "primary",
      summary,
      description,
      startDateTime,
      endDateTime,
      location,
      attendees,
    }) => {
      try {
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
          event,
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

        if (returnString) {
          return JSON.stringify(createdEvent, null, 2);
        }
        return createdEvent;
      } catch (error) {
        return `Failed to create calendar event: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  const updateCalendarEventTool = new DynamicStructuredTool({
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
      location: z.string().optional().describe("The new location of the event"),
    }),
    func: async ({
      calendarId = "primary",
      eventId,
      summary,
      description,
      startDateTime,
      endDateTime,
      location,
    }) => {
      try {
        // First get the existing event
        const existingEvent = await makeGoogleAPIRequest(
          `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
          accessToken,
        );

        // Update only the provided fields
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
          updatedEvent,
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

        if (returnString) {
          return JSON.stringify(event, null, 2);
        }
        return event;
      } catch (error) {
        return `Failed to update calendar event: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  const deleteCalendarEventTool = new DynamicStructuredTool({
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
    func: async ({ calendarId = "primary", eventId }) => {
      try {
        await makeGoogleAPIRequest(
          `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
          accessToken,
          "DELETE",
        );

        const result = {
          success: true,
          message: `Event ${eventId} deleted successfully`,
        };

        if (returnString) {
          return JSON.stringify(result, null, 2);
        }
        return result;
      } catch (error) {
        return `Failed to delete calendar event: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  // Gmail Tools
  const listGmailMessagesTool = new DynamicStructuredTool({
    name: "listGmailMessages",
    description:
      "List Gmail messages. Use this to search and retrieve email messages.",
    schema: z.object({
      q: z
        .string()
        .optional()
        .describe(
          "Gmail search query (e.g., 'from:example@gmail.com', 'subject:meeting', 'is:unread')",
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
    func: async ({ q, maxResults = 10, labelIds }) => {
      try {
        const params = new URLSearchParams({
          maxResults: maxResults.toString(),
        });

        if (q) params.append("q", q);
        if (labelIds?.length) {
          labelIds.forEach((labelId) => params.append("labelIds", labelId));
        }

        const result = await makeGmailAPIRequest(
          `/users/me/messages?${params}`,
          accessToken,
        );

        // Get full message details for each message
        const messages = await Promise.all(
          (result.messages || []).map(async (message: any) => {
            const fullMessage = await makeGmailAPIRequest(
              `/users/me/messages/${message.id}`,
              accessToken,
            );

            const headers = fullMessage.payload?.headers || [];
            const getHeader = (name: string) =>
              headers.find(
                (h: any) => h.name.toLowerCase() === name.toLowerCase(),
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
          }),
        );

        if (returnString) {
          return JSON.stringify(messages, null, 2);
        }
        return messages;
      } catch (error) {
        return `Failed to list Gmail messages: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  const getGmailMessageTool = new DynamicStructuredTool({
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
    func: async ({ messageId, format = "full" }) => {
      try {
        const result = await makeGmailAPIRequest(
          `/users/me/messages/${messageId}?format=${format}`,
          accessToken,
        );

        const headers = result.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
            ?.value;

        // Extract body content
        let body = "";
        if (result.payload?.body?.data) {
          body = Buffer.from(result.payload.body.data, "base64").toString();
        } else if (result.payload?.parts) {
          // Multi-part message
          const textPart = result.payload.parts.find(
            (part: any) => part.mimeType === "text/plain",
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

        if (returnString) {
          return JSON.stringify(message, null, 2);
        }
        return message;
      } catch (error) {
        return `Failed to get Gmail message: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  const sendGmailMessageTool = new DynamicStructuredTool({
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
    func: async ({ to, subject, body, cc, bcc }) => {
      try {
        // Create email in RFC 2822 format
        let email = `To: ${to}\r\n`;
        if (cc) email += `Cc: ${cc}\r\n`;
        if (bcc) email += `Bcc: ${bcc}\r\n`;
        email += `Subject: ${subject}\r\n`;
        email += `\r\n${body}`;

        // Encode email in base64url format
        const encodedEmail = Buffer.from(email)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const result = await makeGmailAPIRequest(
          `/users/me/messages/send`,
          accessToken,
          "POST",
          { raw: encodedEmail },
        );

        const sentMessage = {
          id: result.id,
          threadId: result.threadId,
          labelIds: result.labelIds,
          message: "Email sent successfully",
        };

        if (returnString) {
          return JSON.stringify(sentMessage, null, 2);
        }
        return sentMessage;
      } catch (error) {
        return `Failed to send Gmail message: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  const searchGmailTool = new DynamicStructuredTool({
    name: "searchGmail",
    description:
      "Search Gmail messages with advanced query options. Use this for complex email searches.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "Gmail search query (supports Gmail search operators like 'from:', 'subject:', 'has:attachment', etc.)",
        ),
      maxResults: z
        .number()
        .min(1)
        .max(100)
        .default(10)
        .describe("Maximum number of results to return"),
    }),
    func: async ({ query, maxResults = 10 }) => {
      try {
        const params = new URLSearchParams({
          q: query,
          maxResults: maxResults.toString(),
        });

        const result = await makeGmailAPIRequest(
          `/users/me/messages?${params}`,
          accessToken,
        );

        // Get basic info for each message
        const messages = await Promise.all(
          (result.messages || [])
            .slice(0, maxResults)
            .map(async (message: any) => {
              const fullMessage = await makeGmailAPIRequest(
                `/users/me/messages/${message.id}?format=metadata`,
                accessToken,
              );

              const headers = fullMessage.payload?.headers || [];
              const getHeader = (name: string) =>
                headers.find(
                  (h: any) => h.name.toLowerCase() === name.toLowerCase(),
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
            }),
        );

        if (returnString) {
          return JSON.stringify(messages, null, 2);
        }
        return messages;
      } catch (error) {
        return `Failed to search Gmail: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });

  return [
    listCalendarseTool,
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
