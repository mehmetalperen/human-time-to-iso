# Human Time to ISO API

Convert natural language appointment requests to precise ISO datetime format with timezone support.

## Features

- 🗓️ **Natural Language Parsing**: Understands phrases like "tomorrow at 2pm", "next Wednesday at 4pm"
- 🌍 **Timezone Support**: Dynamic timezone input (defaults to America/Chicago)
- ⏰ **Time Preservation**: Keeps the exact time requested by the user
- 🚀 **Vercel Ready**: Optimized for serverless deployment
- 🔌 **Make.com Compatible**: Perfect for automation workflows

## API Endpoint

**POST** `/api/parse-date`

### Request Body

```json
{
  "text": "tomorrow at 2pm",
  "timeZone": "America/Chicago",
  "now": "2024-01-15T10:00:00Z" // Optional: override current time
}
```

### Response

```json
{
  "convertedDate": "2024-01-16T14:00:00-06:00",
  "timeZone": "America/Chicago",
  "originalText": "tomorrow at 2pm"
}
```

## Examples

| Input                   | Output (America/Chicago)                          |
| ----------------------- | ------------------------------------------------- |
| "tomorrow at 2pm"       | `2024-01-16T14:00:00-06:00`                       |
| "next Wednesday at 4pm" | `2024-01-17T16:00:00-06:00`                       |
| "10am"                  | `2024-01-15T10:00:00-06:00` (today if not passed) |
| "Friday at 9am"         | `2024-01-19T09:00:00-06:00`                       |

## Make.com Integration

### HTTP Request Configuration

1. **Method**: POST
2. **URL**: `https://your-domain.vercel.app/api/parse-date`
3. **Headers**:
   - `Content-Type: application/json`
4. **Body**:
   ```json
   {
     "text": "{{1.text}}",
     "timeZone": "{{2.timezone}}"
   }
   ```

### Response Mapping

- **Date**: `{{1.convertedDate}}`
- **Timezone**: `{{1.timeZone}}`
- **Original Text**: `{{1.originalText}}`

## Supported Timezones

Use any valid IANA timezone identifier:

- `America/Chicago`
- `America/New_York`
- `America/Los_Angeles`
- `Europe/London`
- `Asia/Tokyo`
- And many more...

## Development

### Local Development

```bash
npm install
npm run dev
```

### Deploy to Vercel

```bash
npm run deploy
```

## Error Handling

The API returns consistent error formats:

```json
{
  "error": "Missing or invalid 'text' parameter",
  "message": "Please provide a natural language date/time request (e.g., 'tomorrow at 2pm')"
}
```

## Dependencies

- **chrono-node**: Natural language date parsing
- **luxon**: Advanced datetime and timezone handling

## License

MIT
