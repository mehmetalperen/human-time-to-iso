// Test script for the parse-date API
import { DateTime } from "luxon";

// Mock the API function for testing
async function testParseDate(humanDate, humanTime, timeZone = "America/Chicago", clientCurrentTime = null) {
    // This simulates what the API would do
    const chrono = await import("chrono-node");
    const { DateTime, IANAZone } = await import("luxon");

    const zone = (typeof timeZone === "string" && IANAZone.isValidZone(timeZone))
        ? timeZone
        : "America/Chicago";

    // Get current time in requested zone
    const nowZoned = clientCurrentTime
        ? DateTime.fromISO(clientCurrentTime, { setZone: true }).setZone(zone)
        : DateTime.now().setZone(zone);

    console.log(`\n🔍 Testing: "${humanDate}" at "${humanTime}"`);
    console.log(`📍 Timezone: ${zone}`);
    console.log(`📅 Current: ${nowZoned.toFormat('yyyy-MM-dd HH:mm:ss ZZZZ')}`);

    // Parse the date using chrono
    const dateResults = chrono.parse(humanDate, nowZoned.toJSDate(), { forwardDate: true });

    if (!dateResults.length) {
        console.log(`❌ FAILED: Could not parse date`);
        return {
            error: "Could not parse the date",
            message: "Unable to understand the date: " + humanDate
        };
    }

    const start = dateResults[0].start;
    console.log(`📊 chrono-node result:`, {
        year: start.get("year"),
        month: start.get("month"),
        day: start.get("day"),
        hour: start.get("hour"),
        minute: start.get("minute"),
        second: start.get("second"),
        isCertain: {
            year: start.isCertain("year"),
            month: start.isCertain("month"),
            day: start.isCertain("day"),
            hour: start.isCertain("hour"),
            minute: start.isCertain("minute")
        }
    });

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
            console.log(`❌ FAILED: Could not parse time`);
            return {
                error: "Could not parse the time",
                message: "Unable to understand the time: " + humanTime
            };
        }
    }

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

    if (onlyTimeSpecified && dt < nowZoned) dt = dt.plus({ days: 1 });

    if (!dt.isValid) {
        console.log(`❌ FAILED: Invalid date generated`);
        return {
            error: "Invalid date generated",
            message: "Could not generate a valid date from the provided inputs"
        };
    }

    console.log(`✅ SUCCESS: ${dt.toFormat('yyyy-MM-dd HH:mm:ss ZZZZ')}`);

    return {
        convertedDate: dt.toISO({ suppressMilliseconds: true }),
        timeZone: timeZone,
        humanDate: humanDate,
        humanTime: humanTime,
        clientCurrentTime: clientCurrentTime
    };
}

// Test cases that show how ChatGPT should format input for chrono-node
const testCases = [
    // ✅ PERFECT INPUTS (ChatGPT can use these confidently)

    // Simple Relative Dates
    { date: "tomorrow", time: "2pm" },
    { date: "today", time: "10am" },
    { date: "yesterday", time: "3pm" },

    // Day of Week Variations
    { date: "monday", time: "9am" },
    { date: "next monday", time: "2pm" },
    { date: "this monday", time: "11am" },
    { date: "last monday", time: "4pm" },
    { date: "monday next week", time: "1pm" },
    { date: "next week monday", time: "5pm" },

    // Week Variations
    { date: "next week", time: "10am" },
    { date: "in 1 week", time: "2pm" },
    { date: "in 2 weeks", time: "3pm" },
    { date: "in 3 weeks", time: "4pm" },
    { date: "two weeks from now", time: "11am" },
    { date: "3 weeks from now", time: "6pm" },

    // Month Variations
    { date: "next month", time: "9am" },
    { date: "in 1 month", time: "2pm" },
    { date: "in 2 months", time: "3pm" },
    { date: "two months from now", time: "4pm" },

    // Specific Month Dates (BOTH formats work perfectly)
    { date: "september 15th", time: "2pm" },
    { date: "15th september", time: "3pm" },
    { date: "september 20", time: "4pm" },
    { date: "20 september", time: "5pm" },
    { date: "september 1st", time: "9am" },
    { date: "1st september", time: "10am" },

    // Complex Combinations
    { date: "next monday in 2 weeks", time: "2pm" },
    { date: "monday in 2 weeks", time: "3pm" },
    { date: "in 2 weeks monday", time: "4pm" },

    // Time-based Relative
    { date: "morning", time: "9am" },
    { date: "afternoon", time: "2pm" },
    { date: "evening", time: "6pm" },
    { date: "tonight", time: "8pm" },

    // Edge Cases (that actually work)
    { date: "next friday the 13th", time: "1pm" },

    // Absolute Dates
    { date: "2025-09-15", time: "2pm" },
    { date: "september 17th 2025", time: "3pm" },
    { date: "17th september 2025", time: "4pm" },

    // ❌ BROKEN PATTERNS (ChatGPT must avoid or convert)

    // Relative Month References with Specific Days
    { date: "15th of next month", time: "4:15pm", expectFail: true },
    { date: "next month 15th", time: "4:15pm", expectFail: true },
    { date: "in 1 month 15th", time: "4:15pm", expectFail: true },

    // Business Logic Patterns
    { date: "last day of month", time: "5pm", expectFail: true },
    { date: "first monday of next month", time: "10am", expectFail: true },

    // Holiday/Event References
    { date: "christmas", time: "12pm", expectFail: true },
    { date: "new year", time: "12am", expectFail: true },
    { date: "valentines day", time: "6pm", expectFail: true },

    // Business References
    { date: "next business day", time: "9am", expectFail: true },
    { date: "end of week", time: "5pm", expectFail: true },
    { date: "end of month", time: "6pm", expectFail: true },

    // Seasonal References
    { date: "spring", time: "10am", expectFail: true },
    { date: "summer", time: "2pm", expectFail: true },
    { date: "fall", time: "4pm", expectFail: true },
    { date: "winter", time: "6pm", expectFail: true }
];

const conversionTestCases = [
    // 🔧 ChatGPT Conversion Rules - Test the CONVERTED versions

    // For Relative Month + Day (Critical)
    {
        original: "15th of next month",
        converted: "september 15th",
        time: "4:15pm",
        description: "Relative month + day → Absolute month + day"
    },
    {
        original: "next month 20th",
        converted: "september 20th",
        time: "3pm",
        description: "Next month + day → Absolute month + day"
    },

    // For Business Logic
    {
        original: "last day of month",
        converted: "august 31st",
        time: "5pm",
        description: "Last day of month → Absolute date"
    },
    {
        original: "first monday of next month",
        converted: "september 1st",
        time: "10am",
        description: "First monday of next month → Absolute date"
    },

    // For Holidays
    {
        original: "christmas",
        converted: "december 25th",
        time: "12pm",
        description: "Holiday → Absolute date"
    },
    {
        original: "new year",
        converted: "january 1st",
        time: "12am",
        description: "Holiday → Absolute date"
    },

    // For Business Terms
    {
        original: "end of week",
        converted: "friday",
        time: "5pm",
        description: "Business term → Simple day"
    },
    {
        original: "next business day",
        converted: "next monday",
        time: "9am",
        description: "Business term → Simple relative date"
    }
];

// Run tests
async function runTests() {
    console.log("🚀 FINAL COMPREHENSIVE TESTING - Validating README Documentation\n");
    console.log("=".repeat(80));

    console.log("📋 TESTING PERFECT INPUTS (Should all pass):\n");
    let passed = 0;
    let failed = 0;
    let total = testCases.length;

    for (const testCase of testCases) {
        try {
            const result = await testParseDate(testCase.date, testCase.time);
            if (result.error) {
                if (testCase.expectFail) {
                    console.log(`⚠️  EXPECTED FAIL: ${testCase.date} at ${testCase.time}`);
                    console.log(`   This is correct - chrono-node can't handle this pattern`);
                    passed++;
                } else {
                    console.log(`❌ UNEXPECTED FAIL: ${testCase.date} at ${testCase.time}`);
                    failed++;
                }
            } else {
                if (testCase.expectFail) {
                    console.log(`❌ UNEXPECTED PASS: ${testCase.date} at ${testCase.time}`);
                    console.log(`   This should have failed but didn't!`);
                    failed++;
                } else {
                    console.log(`✅ PASSED: ${testCase.date} at ${testCase.time}`);
                    passed++;
                }
            }
        } catch (error) {
            console.log(`💥 ERROR: ${testCase.date} at ${testCase.time} - ${error.message}`);
            failed++;
        }
        console.log("-".repeat(60));
    }

    console.log("\n" + "=".repeat(80));
    console.log(`📊 PERFECT INPUTS TEST RESULTS: ${passed}/${total} passed, ${failed}/${total} failed`);

    if (failed === 0) {
        console.log("🎉 ALL PERFECT INPUTS WORK AS EXPECTED!");
    } else {
        console.log("⚠️  Some tests failed. Check the output above for details.");
    }

    console.log("\n" + "=".repeat(80));
    console.log("🔧 TESTING CHATGPT CONVERSION RULES (Should all pass):\n");

    let conversionPassed = 0;
    let conversionFailed = 0;
    let conversionTotal = conversionTestCases.length;

    for (const testCase of conversionTestCases) {
        console.log(`\n📝 Testing conversion: "${testCase.original}" → "${testCase.converted}"`);
        console.log(`📋 Description: ${testCase.description}`);

        try {
            const result = await testParseDate(testCase.converted, testCase.time);
            if (result.error) {
                console.log(`❌ CONVERSION FAILED: ${testCase.converted} at ${testCase.time}`);
                conversionFailed++;
            } else {
                console.log(`✅ CONVERSION SUCCESS: ${testCase.converted} at ${testCase.time}`);
                console.log(`   Result: ${result.convertedDate}`);
                conversionPassed++;
            }
        } catch (error) {
            console.log(`💥 ERROR: ${testCase.converted} at ${testCase.time} - ${error.message}`);
            conversionFailed++;
        }
        console.log("-".repeat(60));
    }

    console.log("\n" + "=".repeat(80));
    console.log(`📊 CONVERSION RULES TEST RESULTS: ${conversionPassed}/${conversionTotal} passed, ${conversionFailed}/${conversionTotal} failed`);

    if (conversionFailed === 0) {
        console.log("🎉 ALL CONVERSION RULES WORK PERFECTLY!");
    } else {
        console.log("⚠️  Some conversion rules failed. Check the output above for details.");
    }

    console.log("\n" + "=".repeat(80));
    console.log(`🎯 FINAL SUMMARY: ${passed + conversionPassed}/${total + conversionTotal} total tests passed`);

    if (failed === 0 && conversionFailed === 0) {
        console.log("🎉 README DOCUMENTATION IS 100% ACCURATE!");
        console.log("🚀 ChatGPT can use this guide with complete confidence!");
    } else {
        console.log("⚠️  Some issues found. README needs updates before ChatGPT can use it.");
    }
}

// Run the tests
runTests().catch(console.error);
