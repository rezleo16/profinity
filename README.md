# Profanity Filter API Documentation

Base URL: `https://profinity-sand.vercel.app`

All endpoints require the following header:
- `Content-Type: application/json`

---

## 1. Check a Message for Profanity
Checks if a given string contains any banned words or phrases.

- **Endpoint**: `/api/check-message`
- **Method**: `POST`

### Request Payload
```json
{
  "message": "This is the string of text you want to check."
}
```

### Success Response (200 OK)
```json
{
  "profanity": true,
  "message": "Message contains blocked content."
}
```
*(If no profanity is found, `"profanity"` will be `false`, and the message will say `"Message is clean!"`)*

---

## 2. Add a New Profanity Phrase
Adds a new phrase to the live database. It automatically handles lowercase conversion.

- **Endpoint**: `/api/add-profanity`
- **Method**: `POST`

### Request Payload
```json
{
  "phrase": "the new bad word"
}
```

### Success Response (200 OK)
```json
{
  "added": true,
  "message": "Successfully added to the list."
}
```
*(If the phrase already exists, `"added"` will be `false`.)*

---

## 3. Remove a Profanity Phrase
Removes an existing phrase from the live database.

- **Endpoint**: `/api/remove-profanity`
- **Method**: `DELETE`

### Request Payload
```json
{
  "phrase": "the old bad word"
}
```

### Success Response (200 OK)
```json
{
  "removed": true,
  "message": "Successfully removed from the list."
}
```
*(If the phrase isn't in the database to begin with, it will return a 404 with `"removed": false`.)*
