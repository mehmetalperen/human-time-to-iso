// api/parse-date.js — Natural language → ISO datetime in a requested IANA timezone
import * as chrono from "chrono-node";
import { DateTime, IANAZone } from "luxon";

/**
 * POST /api/parse-date
 * body: { 
 *   humanDate: string,           // Natural language date like "next week monday"
 *   humanTime: string,           // Time like "2pm" or "14:30"
 *   timeZone: string,            // IANA timezone (e.g., "America/Chicago")
 *   clientCurrentTime: string    // Client's current time in ISO format (e.g., "2024-01-15T10:00:00Z")
 * }
 * returns: { convertedDate: string }  // ISO with proper timezone offset
 * 
 * Examples:
 * - humanDate: "next week monday", humanTime: "2pm" → 2024-01-22T14:00:00-06:00
 * - humanDate: "next month 15th", humanTime: "afternoon" → 2024-02-15T12:00:00-06:00
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
        const { humanDate, humanTime, timeZone, clientCurrentTime } = req.body || {};

        // Validate required inputs
        if (!humanDate || typeof humanDate !== "string") {
            return res.status(400).json({
                error: "Missing or invalid 'humanDate' parameter",
                message: "Please provide a natural language date request (e.g., 'next week monday')"
            });
        }

        if (!humanTime || typeof humanTime !== "string") {
            return res.status(400).json({
                error: "Missing or invalid 'humanTime' parameter",
                message: "Please provide a time (e.g., '2pm', '14:30')"
            });
        }

        if (!timeZone || typeof timeZone !== "string") {
            return res.status(400).json({
                error: "Missing or invalid 'timeZone' parameter",
                message: "Please provide a valid IANA timezone (e.g., 'America/Chicago', 'Europe/London')"
            });
        }

        if (!clientCurrentTime || typeof clientCurrentTime !== "string") {
            return res.status(400).json({
                error: "Missing or invalid 'clientCurrentTime' parameter",
                message: "Please provide the client's current time in ISO format (e.g., '2024-01-15T10:00:00Z')"
            });
        }

        // Validate and normalize timezone
        if (!IANAZone.isValidZone(timeZone)) {
            return res.status(400).json({
                error: "Invalid timezone",
                message: `'${timeZone}' is not a valid IANA timezone. Please use a valid timezone like 'America/Chicago' or 'Europe/London'`
            });
        }

        // Parse client's current time and convert to requested timezone
        let nowZoned;
        try {
            // Parse the client time, preserving the timezone information
            const clientTime = DateTime.fromISO(clientCurrentTime, { setZone: true });
            if (!clientTime.isValid) {
                return res.status(400).json({
                    error: "Invalid clientCurrentTime format",
                    message: "Please provide a valid ISO datetime string (e.g., '2024-01-15T10:00:00Z')"
                });
            }

            // Convert to the requested timezone
            nowZoned = clientTime.setZone(timeZone);



        } catch (error) {
            return res.status(400).json({
                error: "Invalid clientCurrentTime format",
                message: "Please provide a valid ISO datetime string (e.g., '2024-01-15T10:00:00Z')"
            });
        }

        // Parse the date using chrono with the client's time as reference
        let dateResults;

        // Handle problematic cases manually for predictable behavior
        if (humanDate.toLowerCase() === "tomorrow") {
            // Manually calculate tomorrow based on client's current time
            const tomorrow = nowZoned.plus({ days: 1 });
            dateResults = [{
                start: {
                    get: (field) => {
                        switch (field) {
                            case "year": return tomorrow.year;
                            case "month": return tomorrow.month;
                            case "day": return tomorrow.day;
                            case "hour": return tomorrow.hour;
                            case "minute": return tomorrow.minute;
                            case "second": return tomorrow.second;
                            default: return 0;
                        }
                    },
                    isCertain: () => true
                }
            }];
        } else {
            // Use chrono-node for all other date patterns
            dateResults = chrono.parse(humanDate, nowZoned.toJSDate());
        }

        if (!dateResults.length) {
            return res.status(400).json({
                error: "Could not parse the date",
                message: "Unable to understand the date: " + humanDate
            });
        }

        const start = dateResults[0].start;

        // Parse the time
        let hour = 0;
        let minute = 0;
        let second = 0;

        // Handle various time formats
        const timeMatch = humanTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
        if (timeMatch) {
            // 12-hour format: "2pm", "2:30pm"
            hour = parseInt(timeMatch[1]);
            minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

            // Convert to 24-hour format
            if (timeMatch[3].toLowerCase() === 'pm' && hour !== 12) {
                hour += 12;
            } else if (timeMatch[3].toLowerCase() === 'am' && hour === 12) {
                hour = 0;
            }
        } else {
            // 24-hour format: "14:30", "14"
            const time24Match = humanTime.match(/(\d{1,2})(?::(\d{2}))?/);
            if (time24Match) {
                hour = parseInt(time24Match[1]);
                minute = parseInt(time24Match[2]);
            } else {
                return res.status(400).json({
                    error: "Could not parse the time",
                    message: "Unable to understand the time: " + humanTime
                });
            }
        }

        // Build the date object
        let dt = DateTime.fromObject(
            {
                year: start.get("year"),
                month: start.get("month"),
                day: start.get("day"),
                hour, minute, second
            },
            { zone: timeZone }
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
                message: "Could not generate a valid date from the provided inputs"
            });
        }

        return res.json({
            convertedDate: dt.toISO({ suppressMilliseconds: true }),
            timeZone: timeZone,
            humanDate: humanDate,
            humanTime: humanTime,
            clientCurrentTime: clientCurrentTime
        });

    } catch (error) {
        console.error('Parse date error:', error);
        return res.status(500).json({
            error: "Internal server error",
            message: error?.message || "An unexpected error occurred while parsing the date"
        });
    }
}
