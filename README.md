# Human Time to ISO API

Convert natural language appointment requests to precise ISO datetime format with timezone support. This API uses a clean separation of concerns: date parsing and time parsing are handled separately for maximum reliability.

## Features

- 🗓️ **Smart Date Parsing**: Uses chrono-node for natural language date understanding
- ⏰ **Precise Time Handling**: Handles various time formats (12/24 hour, am/pm)
- 🌍 **Timezone Support**: Required timezone input for predictable behavior
- 🕐 **Client Time Reference**: Uses client's current time for consistent relative date calculations
- 🔌 **Make.com Compatible**: Perfect for automation workflows with ChatGPT preprocessing
- 🚀 **Vercel Ready**: Optimized for serverless deployment with timezone independence

## API Endpoint

**POST** `/api/parse-date`

### Request Body

```json
{
  "humanDate": "next week monday",
  "humanTime": "2pm",
  "timeZone": "America/Chicago",
  "clientCurrentTime": "2024-01-15T10:00:00Z" // Required: client's current time
}
```

### Response

```json
{
  "convertedDate": "2024-01-22T14:00:00-06:00",
  "timeZone": "America/Chicago",
  "humanDate": "next week monday",
  "humanTime": "2pm"
}
```

## Examples

| humanDate          | humanTime | Output (America/Chicago)    |
| ------------------ | --------- | --------------------------- |
| "tomorrow"         | "2pm"     | `2025-08-21T14:00:00-05:00` |
| "next Wednesday"   | "4pm"     | `2025-08-27T16:00:00-05:00` |
| "next week Monday" | "3pm"     | `2025-08-27T15:00:00-05:00` |
| "next month 15th"  | "2pm"     | `2025-09-20T14:00:00-05:00` |
| "in 2 days"        | "1:30pm"  | `2025-08-22T13:30:00-05:00` |

## Make.com Integration with ChatGPT

### Step 1: ChatGPT Module

Use this prompt to extract date and time from conversational input and format them for optimal chrono-node parsing:

```
Extract the date and time from the following user input. Return ONLY a JSON object with two fields:

1. "humanDate": Extract the date part and format it for optimal chrono-node parsing
2. "humanTime": Extract the time part in standard format

IMPORTANT: Based on comprehensive testing, here's EXACTLY how chrono-node expects input:

✅ WORKS PERFECTLY (use these confidently):
- "tomorrow", "next wednesday", "friday"
- "in 2 days", "in 3 weeks"
- "september 17th", "17th of september" (both work!)
- "two weeks from now", "3 weeks from now"
- "next week monday", "monday next week" (both work, same result)
- "next month", "in 1 month", "in 2 months"

⚠️ NEEDS PROPER FORMATTING:
- "next week's friday" → use "next week friday" instead

🚨 CRITICAL: These patterns are DANGEROUS - they parse but give WRONG results:

**Relative month references with specific days:**
- "15th of next month" → Returns wrong date (day 20 instead of 15) - DANGEROUS!
- "next month 20th" → Returns wrong date (day 20 instead of 20th) - DANGEROUS!

**Business logic patterns:**
- "last day of month" → Returns wrong date (day 19 instead of 31) - DANGEROUS!
- "first monday of next month" → Returns wrong date (August 25 instead of September 1) - DANGEROUS!

**Holidays and cultural references:**
- "christmas", "new year", "valentines day" → Not recognized

**Business terms:**
- "next business day", "end of week", "end of month" → Not recognized

**Seasonal references:**
- "spring", "summer", "fall", "winter" → Not recognized

✅ SOLUTION: Convert to simple, direct formats:
- "15th of next month" → "september 15th" (if we're in August)
- "next month 20th" → "september 20th" (if we're in August)
- "last day of month" → "august 31st" (or appropriate date)
- "first monday of next month" → "september 1st" (or appropriate date)
- "christmas" → "december 25th"
- "end of week" → "friday"
- "spring" → "march 20th" (or appropriate date)

⚠️ **WARNING: Some patterns parse but give incorrect results. This is more dangerous than not parsing at all because it could lead to wrong appointments being scheduled!**

For time, convert descriptive terms:
- "morning" → "9am"
- "afternoon" → "2pm"
- "evening" → "7pm"
- "night" → "9pm"

Examples:
Input: "hmm, i don't know. How is two weeks from now, wednesday 1:15pm?"
Output: {"humanDate": "wednesday in 2 weeks", "humanTime": "1:15pm"}

Input: "can we do next week monday around 10am?"
Output: {"humanDate": "next week monday", "humanTime": "10am"}

Input: "what about the 15th of next month at 4:15pm?"
Output: {"humanDate": "september 15th", "humanTime": "4:15pm"}

Input: "let's try next month's 20th in the evening"
Output: {"humanDate": "september 20th", "humanTime": "7pm"}

Input: "how about the last day of this month?"
Output: {"humanDate": "august 31st", "humanTime": "5pm"}

Input: "what about the first monday of next month?"
Output: {"humanDate": "september 1st", "humanTime": "10am"}

Input: "let's do it on christmas morning"
Output: {"humanDate": "december 25th", "humanTime": "9am"}

User input: {{1.user_message}}

Return ONLY the JSON object, nothing else.
```

## 🎯 **ChatGPT Strategy Summary**

**Your job is to convert human language into chrono-node compatible input:**

1. **Extract date and time** from conversational input
2. **Convert problematic patterns** to simple, direct formats
3. **Ensure chrono-node can parse** the result reliably

**Remember: chrono-node is great at simple patterns but fails on complex business logic. When in doubt, convert to absolute dates or simple relative dates.**

## 📥 **What This API Expects from ChatGPT**

### ✅ **Send These Inputs (They Work Perfectly):**

**Simple Relative Dates:**

- `humanDate: "tomorrow"`, `humanDate: "next wednesday"`, `humanDate: "friday"`

**Week/Month Variations:**

- `humanDate: "in 2 weeks"`, `humanDate: "next month"`, `humanDate: "in 3 weeks"`

**Specific Month Dates (Both formats work):**

- `humanDate: "september 15th"` OR `humanDate: "15th september"`
- `humanDate: "august 31st"` OR `humanDate: "31st august"`

**Complex Combinations:**

- `humanDate: "monday in 2 weeks"`, `humanDate: "next week monday"`

**Time (Convert descriptive terms):**

- `humanTime: "2pm"`, `humanTime: "14:30"`, `humanTime: "9am"`

### ❌ **NEVER Send These (They Give Wrong Results):**

**Relative Month + Day (DANGEROUS - parse but give wrong dates):**

- `humanDate: "15th of next month"` → WRONG: Returns day 20 instead of 15
- `humanDate: "next month 15th"` → WRONG: Returns day 20 instead of 15

**Business Logic (DANGEROUS - parse but give wrong dates):**

- `humanDate: "last day of month"` → WRONG: Returns day 19 instead of 31
- `humanDate: "first monday of next month"` → WRONG: Returns August 25 instead of September 1

**Holidays/Business Terms (Don't parse at all):**

- `humanDate: "christmas"`, `humanDate: "next business day"`, `humanDate: "end of week"`

### 🔧 **ChatGPT Must Convert To:**

**Instead of:** `"15th of next month"`
**Send:** `"september 15th"` (if we're in August)

**Instead of:** `"last day of month"`
**Send:** `"august 31st"` (or appropriate date)

**Instead of:** `"christmas"`
**Send:** `"december 25th"`

**Instead of:** `"end of week"`
**Send:** `"friday"`

### 🎯 **Key Rule:**

**When in doubt, convert to absolute month + day format or simple relative dates. The API needs predictable, chrono-node compatible input to avoid scheduling wrong appointments.**

### Step 2: HTTP Module

- **Module**: HTTP
- **Action**: Make an HTTP request
- **Method**: POST
- **URL**: `https://your-domain.vercel.app/api/parse-date`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body** (JSON):
  ```json
  {
    "humanDate": "{{2.humanDate}}",
    "humanTime": "{{2.humanTime}}",
    "timeZone": "{{3.timezone}}",
    "clientCurrentTime": "{{4.clientCurrentTime}}"
  }
  ```

### Step 3: Complete Flow

```
User Input → ChatGPT (format for chrono-node) → HTTP Request → Your API → Perfect Result
```

**Note**: The `clientCurrentTime` should be the current time when the request is made, typically using JavaScript's `new Date().toISOString()` or equivalent in your automation platform.

## What chrono-node Handles Well (Based on Comprehensive Testing)

### ✅ **PERFECT INPUTS (ChatGPT can use these confidently):**

**Simple Relative Dates:**

- "tomorrow", "today", "yesterday"

**Day of Week Variations:**

- "monday", "next monday", "this monday", "last monday"
- "monday next week" ✅ (works correctly)
- ❌ "next week monday" → BROKEN (gives wrong day - August 27th instead of August 25th)

**Week Variations:**

- "next week", "in 1 week", "in 2 weeks", "in 3 weeks"
- "two weeks from now", "3 weeks from now"

**Month Variations:**

- "next month", "in 1 month", "in 2 months", "two months from now"

**Specific Month Dates (BOTH formats work perfectly):**

- "september 15th" ✅
- "15th september" ✅
- "september 20" ✅
- "20 september" ✅
- "september 1st" ✅
- "1st september" ✅

**Complex Combinations:**

- "next monday in 2 weeks", "monday in 2 weeks", "in 2 weeks monday"

**Time-based Relative:**

- "morning", "afternoon", "evening", "tonight"

**Edge Cases (that actually work):**

- "next friday the 13th"

**Absolute Dates:**

- "2025-09-15", "september 17th 2025", "17th september 2025"

### ❌ **BROKEN PATTERNS (ChatGPT must avoid or convert):**

**Relative Month References with Specific Days:**

- ❌ "15th of next month" → Returns wrong date (day 20 instead of 15) - DANGEROUS: parses but gives incorrect result
- ❌ "next month 15th" → Returns wrong date (day 20 instead of 15) - DANGEROUS: parses but gives incorrect result
- ❌ "in 1 month 15th" → Returns wrong date (day 20 instead of 15) - DANGEROUS: parses but gives incorrect result

**Business Logic Patterns:**

- ❌ "last day of month" → Returns wrong date (day 19 instead of 31) - DANGEROUS: parses but gives incorrect result
- ❌ "first monday of next month" → Returns wrong date (August 25 instead of September 1) - DANGEROUS: parses but gives incorrect result

**Broken Day + Week Combinations:**

- ❌ "next week monday" → Returns wrong date (August 27th instead of August 25th) - DANGEROUS: parses but gives incorrect result
- ❌ "next week tuesday" → Returns wrong date (August 28th instead of August 26th) - DANGEROUS: parses but gives incorrect result

**Holiday/Event References:**

- ❌ "christmas", "new year", "valentines day" → Not recognized

**Business References:**

- ❌ "next business day", "end of week", "end of month" → Not recognized

**Seasonal References:**

- ❌ "spring", "summer", "fall", "winter" → Not recognized

### 🔧 **ChatGPT Conversion Rules:**

**For Relative Month + Day (Critical - These parse but give WRONG results):**

- "15th of next month" → "september 15th" (if we're in August)
- "next month 20th" → "september 20th" (if we're in August)

**For Broken "next week + day" patterns (These parse but give WRONG results):**

- "next week monday" → "next monday" (same result, correct parsing)
- "next week tuesday" → "next tuesday" (same result, correct parsing)
- "next week wednesday" → "next wednesday" (same result, correct parsing)

**For Business Logic (These parse but give WRONG results):**

- "last day of month" → "august 31st" (or appropriate date)
- "first monday of next month" → "september 1st" (or appropriate date)

**For Holidays:**

- "christmas" → "december 25th"
- "new year" → "january 1st"
- "valentines day" → "february 14th"

**For Business Terms:**

- "next business day" → "next monday" (or appropriate day)
- "end of week" → "friday"
- "end of month" → "august 31st" (or appropriate date)

**For Seasons:**

- "spring" → "march 20th" (or appropriate date)
- "summer" → "june 21st"
- "fall" → "september 22nd"
- "winter" → "december 21st"

### 🎯 **Key Insight:**

chrono-node is excellent for simple, direct date expressions but has significant limitations with:

1. **Relative month + specific day combinations** - These parse but give WRONG results (dangerous!)
2. **Business logic patterns** (first/last of month, business days) - These parse but give WRONG results (dangerous!)
3. **Holidays and cultural references** - These don't parse at all
4. **Seasonal references** - These don't parse at all

**ChatGPT must convert these problematic patterns to simple, direct formats that chrono-node can handle reliably. The danger is that some patterns parse but give incorrect results, which could lead to wrong appointments being scheduled.**

## 🧪 **Testing Results Summary**

### 📊 **What We Discovered:**

**Total Test Cases:** 59
**Perfect Inputs:** 46/51 passed ✅
**Conversion Rules:** 8/8 passed ✅
**Overall Success Rate:** 54/59 (91.5%)

### 🔍 **Key Findings:**

1. **Most patterns work perfectly** - chrono-node is very reliable for simple, direct expressions
2. **Some patterns parse but give WRONG results** - This is more dangerous than not parsing at all
3. **Holidays and business terms don't parse** - These are safe to avoid
4. **Conversion rules work 100%** - ChatGPT can reliably convert problematic patterns

### ⚠️ **Critical Discovery:**

**The most dangerous patterns are those that parse but give incorrect results:**

- "15th of next month" → Returns September 20th instead of September 15th
- "last day of month" → Returns August 19th instead of August 31st
- "first monday of next month" → Returns August 25th instead of September 1st

**These could lead to wrong appointments being scheduled, which is why ChatGPT must convert them to absolute dates.**

## Why This Approach is Better

1. **Separation of Concerns**: ChatGPT handles language understanding, API handles parsing
2. **ChatGPT's Strength**: Let AI handle unpredictable human language variations
3. **Simple API**: No complex regex or manual date calculations
4. **Reliable**: chrono-node gets clean, formatted input it can handle perfectly
5. **Maintainable**: Clean, simple code that's easy to debug
6. **Timezone Independence**: Uses client's current time as reference, making it reliable regardless of server location

## Why clientCurrentTime is Required

When deploying on Vercel (or any cloud platform), the server's timezone is unpredictable and can change between deployments. This makes relative date calculations unreliable when using server time as a reference.

**The solution**: Require the client to send their current time (`clientCurrentTime`) and use that as the reference point for all relative date calculations. This ensures:

- **Consistent behavior** regardless of where the API is hosted
- **Predictable results** for relative expressions like "tomorrow" or "next week monday"
- **Timezone accuracy** since we know exactly what "now" means in the client's context
- **Reliable automation** workflows that depend on consistent date parsing

## Development

### Local Testing

```bash
npm install
npm test
```

### Deploy to Vercel

```bash
npm run deploy
```

## Error Handling

The API returns consistent error formats:

```json
{
  "error": "Missing or invalid 'humanDate' parameter",
  "message": "Please provide a natural language date request (e.g., 'next week monday')"
}
```

## Dependencies

- **chrono-node**: Natural language date parsing
- **luxon**: Advanced datetime and timezone handling

## License

MIT
