// Simple development server for testing the API locally
import { createServer } from 'http';
import * as chrono from 'chrono-node';
import { DateTime } from 'luxon';

const server = createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Handle API endpoint
    if (req.url === '/api/parse-date' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { humanDate, humanTime, timeZone = 'America/Chicago' } = JSON.parse(body);

                if (!humanDate || !humanTime) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing humanDate or humanTime' }));
                    return;
                }

                // Get current time in requested zone
                const nowZoned = DateTime.now().setZone(timeZone);

                // Parse the date using chrono
                const dateResults = chrono.parse(humanDate, nowZoned.toJSDate(), { forwardDate: true });

                if (!dateResults.length) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Could not parse the date' }));
                    return;
                }

                const start = dateResults[0].start;

                // Parse the time
                let hour = 0;
                let minute = 0;

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
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Could not parse the time' }));
                        return;
                    }
                }

                // Build the date object
                let dt = DateTime.fromObject(
                    {
                        year: start.get("year"),
                        month: start.get("month"),
                        day: start.get("day"),
                        hour, minute, second: 0
                    },
                    { zone: timeZone }
                );

                // Handle case where user only specified time
                const onlyTimeSpecified = !start.isCertain("day") && !start.isCertain("month") && !start.isCertain("year");

                if (onlyTimeSpecified) {
                    if (dt < nowZoned) {
                        dt = dt.plus({ days: 1 });
                    }
                }

                // Ensure we have a valid date
                if (!dt.isValid) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid date generated' }));
                    return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    convertedDate: dt.toISO({ suppressMilliseconds: true }),
                    timeZone: timeZone,
                    humanDate: humanDate,
                    humanTime: humanTime
                }));

            } catch (error) {
                console.error('Parse date error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: "Internal server error",
                    message: error?.message || "An unexpected error occurred"
                }));
            }
        });
    } else {
        // Show help page
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <h1>🚀 Human Time to ISO API</h1>
            <p>Your API is running locally!</p>
            
            <h2>Test with curl:</h2>
            <pre>curl -X POST http://localhost:3000/api/parse-date \\
  -H "Content-Type: application/json" \\
  -d '{"humanDate": "tomorrow", "humanTime": "2pm"}'</pre>
            
            <h2>Or test with:</h2>
            <pre>curl -X POST http://localhost:3000/api/parse-date \\
  -H "Content-Type: application/json" \\
  -d '{"humanDate": "next week monday", "humanTime": "3pm"}'</pre>
            
            <p><strong>Ready for Make.com integration!</strong></p>
        `);
    }
});

server.listen(3000, () => {
    console.log('🚀 API server running at http://localhost:3000');
    console.log('📝 Test with: curl -X POST http://localhost:3000/api/parse-date -H "Content-Type: application/json" -d \'{"humanDate": "tomorrow", "humanTime": "2pm"}\'');
    console.log('🌐 Open http://localhost:3000 in your browser for help');
});
