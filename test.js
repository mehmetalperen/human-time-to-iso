// Test script for the parse-date API
import { DateTime } from "luxon";

// Mock the API function for testing
async function testParseDate(text, timeZone = "America/Chicago", now = null) {
    // This simulates what the API would do
    const chrono = await import("chrono-node");

    // Get current time in requested zone
    const nowZoned = now
        ? DateTime.fromISO(now, { setZone: true }).setZone(timeZone)
        : DateTime.now().setZone(timeZone);

    // Parse natural language text
    const results = chrono.parse(text, nowZoned.toJSDate(), { forwardDate: true });

    if (!results.length) {
        return {
            convertedDate: nowZoned.toISO({ suppressMilliseconds: true }),
            message: "Could not parse the provided text, returning current time"
        };
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
        { zone: timeZone }
    );

    // Handle case where user only specified time
    const onlyTimeSpecified = !start.isCertain("day") && !start.isCertain("month") && !start.isCertain("year");

    if (onlyTimeSpecified) {
        if (dt < nowZoned) {
            dt = dt.plus({ days: 1 });
        }
    }

    return {
        convertedDate: dt.toISO({ suppressMilliseconds: true }),
        timeZone: timeZone,
        originalText: text
    };
}

// Test cases
const testCases = [
    "tomorrow at 2pm",
    "next Wednesday at 4pm",
    "10am",
    "Friday at 9am",
    "next week Monday at 3pm",
    "in 2 days at 1:30pm",
    "this evening at 7pm",
    "next month 15th at 2pm"
];

// Conversational test cases
const conversationalTestCases = [
    "how is september 17th 3pm?",
    "hmm, i don't know. How is two weeks from now, wednesday 1:15pm?",
    "what about next friday at 2:30pm?",
    "can we do tomorrow morning around 10am?",
    "i'm thinking maybe next tuesday evening at 6pm",
    "let's try the 15th of next month at 4:15pm"
];

// Run tests
async function runTests() {
    console.log("🧪 Testing Human Time to ISO API\n");
    console.log("Current time (America/Chicago):", DateTime.now().setZone("America/Chicago").toISO());
    console.log("=" * 60 + "\n");

    console.log("📅 Standard Test Cases:\n");
    for (const testCase of testCases) {
        try {
            const result = await testParseDate(testCase);
            console.log(`✅ Input: "${testCase}"`);
            console.log(`   Output: ${result.convertedDate}`);
            console.log(`   Timezone: ${result.timeZone}\n`);
        } catch (error) {
            console.log(`❌ Input: "${testCase}"`);
            console.log(`   Error: ${error.message}\n`);
        }
    }

    console.log("💬 Conversational Test Cases:\n");
    for (const testCase of conversationalTestCases) {
        try {
            const result = await testParseDate(testCase);
            console.log(`✅ Input: "${testCase}"`);
            console.log(`   Output: ${result.convertedDate}`);
            console.log(`   Timezone: ${result.timeZone}\n`);
        } catch (error) {
            console.log(`❌ Input: "${testCase}"`);
            console.log(`   Error: ${error.message}\n`);
        }
    }

    // Test with different timezone
    console.log("🌍 Testing with different timezone (America/New_York):\n");
    try {
        const result = await testParseDate("tomorrow at 2pm", "America/New_York");
        console.log(`✅ Input: "tomorrow at 2pm" (America/New_York)`);
        console.log(`   Output: ${result.convertedDate}`);
        console.log(`   Timezone: ${result.timeZone}\n`);
    } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}

// Run the tests
runTests().catch(console.error);
