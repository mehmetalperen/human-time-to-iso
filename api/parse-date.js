// api/parse-date.js — Natural language → ISO datetime in a requested IANA timezone
import * as chrono from "chrono-node";
import { DateTime, IANAZone } from "luxon";

/**
 * POST /api/parse-date
 * body: { 
 *   text: string,           // Natural language like "tomorrow at 2pm"
 *   timeZone?: string,      // IANA timezone (defaults to "America/Chicago")
 *   now?: string            // Optional current time override (ISO format)
 * }
 * returns: { convertedDate: string }  // ISO with proper timezone offset
 * 
 * Examples:
 * - "tomorrow at 2pm" → 2024-01-16T14:00:00-06:00
 * - "next Wednesday at 4pm" → 2024-01-17T16:00:00-06:00
 * - "10am" → 2024-01-15T10:00:00-06:00 (today if not passed, tomorrow if passed)
 */
export default async function handler(req, res) {
    // Set CORS headers for Make.com integration
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed",
            message: "Only POST requests are supported"
        });
    }

    try {
        const { text, timeZone, now } = req.body || {};

        // Validate required input
        if (!text || typeof text !== "string") {
            return res.status(400).json({
                error: "Missing or invalid 'text' parameter",
                message: "Please provide a natural language date/time request (e.g., 'tomorrow at 2pm')"
            });
        }

        // Validate and normalize timezone
        const zone = (typeof timeZone === "string" && IANAZone.isValidZone(timeZone))
            ? timeZone
            : "America/Chicago";

        // Get current time in requested zone
        const nowZoned = now
            ? DateTime.fromISO(now, { setZone: true }).setZone(zone)
            : DateTime.now().setZone(zone);

        // Parse natural language text relative to current time
        const results = chrono.parse(text, nowZoned.toJSDate(), { forwardDate: true });

        if (!results.length) {
            // If parsing fails, return current time as fallback
            return res.json({
                convertedDate: nowZoned.toISO({ suppressMilliseconds: true }),
                message: "Could not parse the provided text, returning current time"
            });
        }

        const start = results[0].start;

        // Extract time components from user input (preserve exactly what they said)
        const hour = start.isCertain("hour") ? start.get("hour") : 0;
        const minute = start.isCertain("minute") ? start.get("minute") : 0;
        const second = start.isCertain("second") ? start.get("second") : 0;

        // Build the date object, preserving user's exact time
        let dt = DateTime.fromObject(
            {
                year: start.get("year"),
                month: start.get("month"),
                day: start.get("day"),
                hour, minute, second
            },
            { zone }
        );

        // Handle case where user only specified time (e.g., "2pm")
        const onlyTimeSpecified = !start.isCertain("day") && !start.isCertain("month") && !start.isCertain("year");

        if (onlyTimeSpecified) {
            // If the specified time has already passed today, move to tomorrow
            if (dt < nowZoned) {
                dt = dt.plus({ days: 1 });
            }
        }

        // Ensure we have a valid date
        if (!dt.isValid) {
            return res.status(400).json({
                error: "Invalid date generated",
                message: "Could not generate a valid date from the provided text"
            });
        }

        return res.json({
            convertedDate: dt.toISO({ suppressMilliseconds: true }),
            timeZone: zone,
            originalText: text
        });

    } catch (error) {
        console.error('Parse date error:', error);
        return res.status(500).json({
            error: "Internal server error",
            message: error?.message || "An unexpected error occurred while parsing the date"
        });
    }
}
