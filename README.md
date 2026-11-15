# CodeCraftHub

A personal learning goal tracker API. Keep track of the courses you want to learn, set target completion dates, and update your progress as you go.

CodeCraftHub is a small REST API built with **Node.js** and **Express**. It's designed as a beginner project for learning REST API basics, so it keeps things simple:

- Data is stored in a plain JSON file (`courses.json`). No database is needed.
- There is no login or user management.
- All the code is in one well-commented file (`app.js`).

## Features

- **Full CRUD for courses:** create, read, update and delete through REST endpoints
- **JSON file storage:** courses are saved to `courses.json`, which you can open and read in any editor
- **Automatic setup:** `courses.json` is created on startup if it's missing or empty
- **Auto-generated fields:** every course gets a unique `id` (starting from 1) and a `created_at` timestamp
- **Input validation:**
  - All fields are required when creating a course
  - `target_date` must be a real date in `YYYY-MM-DD` format
  - `status` must be `Not Started`, `In Progress` or `Completed`
- **Clear error messages:** each error comes back as JSON with a matching HTTP status code (`400`, `404`, `500`)
- **Partial updates:** with `PUT`, send only the fields you want to change
- **Statistics:** see the total number of courses and how many are Not Started, In Progress or Completed

## Project structure

```
codecrafthub/
├── app.js           # Express server: routes, validation and file helpers
├── courses.json     # Course data (created automatically)
├── package.json     # Project info, dependencies and scripts
├── package-lock.json
├── .gitignore       # Keeps node_modules/ out of git
└── README.md        # This file
```

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) **version 18 or newer** (Express 5 requires it)
- npm, which comes with Node.js

Check your versions:

```bash
node --version
npm --version
```

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/GFJankavs/codecrafthub.git
   cd codecrafthub
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

   This downloads Express into the `node_modules/` folder.

## Running the application

```bash
npm start
```

You should see:

```
CodeCraftHub API is running at http://localhost:5000
Try it: http://localhost:5000/api/courses
```

Open http://localhost:5000/api/courses in your browser. You'll see `[]` (an empty list) until you add courses.

To stop the server, press **Ctrl + C** in the terminal.

> **Tip:** The server doesn't reload by itself when you edit `app.js`. Stop it and run `npm start` again. On Node 18.11+ you can also run `node --watch app.js` to restart automatically on every save.

## API documentation

**Base URL:** `http://localhost:5000/api`

### Course object

| Field         | Type   | Required | Description |
|---------------|--------|----------|-------------|
| `id`          | number | auto     | Unique ID, set by the server (starts at 1) |
| `name`        | string | yes      | Course name |
| `description` | string | yes      | What the course is about |
| `target_date` | string | yes      | Target completion date, `YYYY-MM-DD` |
| `status`      | string | yes      | `Not Started`, `In Progress` or `Completed` (spelling and capitals must match) |
| `created_at`  | string | auto     | ISO timestamp, set by the server |

Example:

```json
{
  "id": 1,
  "name": "Node.js Fundamentals",
  "description": "Learn the basics of Node.js and Express",
  "target_date": "2026-12-31",
  "status": "Not Started",
  "created_at": "2026-11-15T09:22:27.601Z"
}
```

### Endpoints overview

| Method   | Endpoint            | Description            | Success status |
|----------|---------------------|------------------------|----------------|
| `POST`   | `/api/courses`      | Add a new course       | `201 Created`  |
| `GET`    | `/api/courses`      | Get all courses        | `200 OK`       |
| `GET`    | `/api/courses/stats`| Get course statistics  | `200 OK`       |
| `GET`    | `/api/courses/:id`  | Get a specific course  | `200 OK`       |
| `PUT`    | `/api/courses/:id`  | Update a course        | `200 OK`       |
| `DELETE` | `/api/courses/:id`  | Delete a course        | `200 OK`       |

The examples below use `curl` in a **bash-style terminal** (macOS/Linux terminal, or Git Bash on Windows). For PowerShell, see [Troubleshooting](#curl-commands-fail-in-powershell).

---

### Add a new course

`POST /api/courses`

All four fields are required. Don't send `id` or `created_at`; the server sets those.

```bash
curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Node.js Fundamentals",
    "description": "Learn the basics of Node.js and Express",
    "target_date": "2026-12-31",
    "status": "Not Started"
  }'
```

**Response:** `201 Created`

```json
{
  "id": 1,
  "name": "Node.js Fundamentals",
  "description": "Learn the basics of Node.js and Express",
  "target_date": "2026-12-31",
  "status": "Not Started",
  "created_at": "2026-11-15T09:22:27.601Z"
}
```

**Error example:** missing fields and an invalid status give `400 Bad Request`

```bash
curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -d '{"name": "Docker", "status": "Done"}'
```

```json
{
  "error": "Validation failed",
  "details": [
    "\"description\" is required",
    "\"target_date\" is required",
    "\"status\" must be one of: Not Started, In Progress, Completed"
  ]
}
```

---

### Get all courses

`GET /api/courses`

```bash
curl http://localhost:5000/api/courses
```

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "Node.js Fundamentals",
    "description": "Learn the basics of Node.js and Express",
    "target_date": "2026-12-31",
    "status": "Not Started",
    "created_at": "2026-11-15T09:22:27.601Z"
  },
  {
    "id": 2,
    "name": "REST APIs",
    "description": "Understand HTTP methods and status codes",
    "target_date": "2027-01-15",
    "status": "In Progress",
    "created_at": "2026-11-15T09:22:27.640Z"
  }
]
```

If there are no courses yet, you get an empty array: `[]`.

---

### Get course statistics

`GET /api/courses/stats`

Returns the total number of courses and how many have each status.

```bash
curl http://localhost:5000/api/courses/stats
```

**Response:** `200 OK`

```json
{
  "total": 4,
  "by_status": {
    "Not Started": 1,
    "In Progress": 2,
    "Completed": 1
  }
}
```

Every status is always listed, even when its count is `0`. With no courses, you get `"total": 0` and all counts at `0`.

> **Why route order matters:** in `app.js`, this route is defined *before* `/api/courses/:id`. Express uses the first route that matches. If `:id` came first, `/api/courses/stats` would be treated as a course with the ID `"stats"` and return a `400` error.

---

### Get a specific course

`GET /api/courses/:id`

```bash
curl http://localhost:5000/api/courses/1
```

**Response:** `200 OK`

```json
{
  "id": 1,
  "name": "Node.js Fundamentals",
  "description": "Learn the basics of Node.js and Express",
  "target_date": "2026-12-31",
  "status": "Not Started",
  "created_at": "2026-11-15T09:22:27.601Z"
}
```

**Errors:**

| Situation | Status | Response |
|---|---|---|
| No course with that ID | `404` | `{"error": "Course with id 99 not found"}` |
| ID is not a positive whole number, e.g. `/api/courses/abc` | `400` | `{"error": "Course id must be a positive whole number"}` |

---

### Update a course

`PUT /api/courses/:id`

Send **only the fields you want to change**. Anything you leave out keeps its current value. You can update `name`, `description`, `target_date` and `status`. `id` and `created_at` can't be changed.

Example: mark a course as completed.

```bash
curl -X PUT http://localhost:5000/api/courses/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "Completed"}'
```

**Response:** `200 OK`, with the full updated course

```json
{
  "id": 1,
  "name": "Node.js Fundamentals",
  "description": "Learn the basics of Node.js and Express",
  "target_date": "2026-12-31",
  "status": "Completed",
  "created_at": "2026-11-15T09:22:27.601Z"
}
```

**Errors:**

| Situation | Status | Response |
|---|---|---|
| No course with that ID | `404` | `{"error": "Course with id 99 not found"}` |
| Empty body `{}` | `400` | `{"error": "Provide at least one field to update: name, description, target_date, status"}` |
| Invalid value, e.g. `{"name": ""}` | `400` | `{"error": "Validation failed", "details": ["\"name\" cannot be empty"]}` |

---

### Delete a course

`DELETE /api/courses/:id`

```bash
curl -X DELETE http://localhost:5000/api/courses/1
```

**Response:** `200 OK`

```json
{
  "message": "Course deleted successfully",
  "course": {
    "id": 1,
    "name": "Node.js Fundamentals",
    "description": "Learn the basics of Node.js and Express",
    "target_date": "2026-12-31",
    "status": "Completed",
    "created_at": "2026-11-15T09:22:27.601Z"
  }
}
```

Deleting the same course again returns `404`. IDs are never reused: if courses 1 and 2 exist and you delete course 1, the next new course still gets ID 3.

---

### Error responses

Every error is returned as JSON with an `error` message. Validation errors also include a `details` list.

| Status | Meaning | When it happens |
|---|---|---|
| `400 Bad Request` | Something is wrong with your request | Missing or invalid fields, invalid status, bad date, invalid JSON body, non-numeric ID |
| `404 Not Found` | The thing you asked for doesn't exist | Course ID doesn't exist, or the URL doesn't match any route |
| `500 Internal Server Error` | Something went wrong on the server | `courses.json` can't be read or written, or contains invalid JSON |

## Troubleshooting

### `Error: Cannot find module 'express'`

The dependencies aren't installed. Run this in the project folder:

```bash
npm install
```

### `Error: listen EADDRINUSE: address already in use :::5000`

Something else is already using port 5000. This is often another copy of this server running in a different terminal.

- **Find and stop it on Windows (PowerShell):**
  ```powershell
  netstat -ano | findstr :5000
  taskkill /PID <PID-from-last-column> /F
  ```
- **Find and stop it on macOS/Linux:**
  ```bash
  lsof -i :5000
  kill <PID>
  ```
- **macOS:** the AirPlay Receiver uses port 5000 by default. Turn it off in *System Settings → General → AirDrop & Handoff*, or change `const PORT = 5000;` in `app.js` to another port such as `3000`.

### `{"error": "Request body must be valid JSON"}`

The body you sent isn't valid JSON. Check for:

- Missing double quotes around keys or text values. JSON needs `"name"`, not `name` or `'name'`.
- A trailing comma after the last field
- Missing `{` or `}`

### Every field says `"... is required"` even though I sent them

The server didn't recognize the body as JSON. Make sure you include the header:

```
Content-Type: application/json
```

In curl that's `-H "Content-Type: application/json"`. In Postman, choose **Body → raw → JSON**.

### `"status" must be one of: ...`

Status values are case-sensitive and must match exactly: `Not Started`, `In Progress` or `Completed`. Values like `completed`, `in progress` or `Done` are rejected.

### `"target_date" must be a valid date in YYYY-MM-DD format`

Use four-digit year, two-digit month, two-digit day, for example `2026-03-05` (not `2026-3-5` or `05/03/2026`). Dates that don't exist on the calendar, such as `2026-02-31`, are also rejected.

### `{"error": "Could not read course data: ..."}` (500)

`courses.json` probably contains invalid JSON, which can happen after editing it by hand. Open it and fix the mistake, or reset it to an empty list. **This deletes all saved courses.**

```json
[]
```

### curl commands fail in PowerShell

In Windows PowerShell 5.1, `curl` is an alias for `Invoke-WebRequest`, which uses different options. Even the real `curl.exe` often gets JSON bodies mangled, because PowerShell rewrites the quotes before passing them on. You have two reliable choices:

- Use **Git Bash**, where the examples above work as written.
- Use PowerShell's own command:
  ```powershell
  Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/courses `
    -ContentType "application/json" `
    -Body '{"name":"Git","description":"Version control","target_date":"2027-02-01","status":"Not Started"}'
  ```

GUI tools like [Postman](https://www.postman.com/) or the VS Code **REST Client** extension avoid quoting problems completely.

### My changes to `app.js` aren't showing up

Restart the server: press **Ctrl + C**, then `npm start`. You can also use `node --watch app.js` to restart automatically.

## Limitations

This project favors simplicity over production features:

- **One file, one writer.** Every request reads and rewrites the whole `courses.json`. If two requests write at exactly the same moment, one change can be lost. That's fine for personal use, and it's the main problem databases solve.
- **No authentication.** Anyone who can reach the server can change the data. Run it only on your own machine.
