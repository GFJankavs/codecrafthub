// =============================================================================
// CodeCraftHub - A simple REST API for tracking courses you want to learn
// =============================================================================
// This server stores course data in a plain JSON file (courses.json) instead
// of a database. Every request follows the same pattern:
//   1. Read the whole list of courses from the file
//   2. Change the list in memory (add / update / remove a course)
//   3. Write the whole list back to the file
// =============================================================================

// --- Imports -----------------------------------------------------------------
// express: the web framework that handles HTTP requests and routing
// fs.promises: Node's built-in file system module (promise version, so we can
//              use async/await instead of callbacks)
// path: helps build file paths that work on Windows, macOS and Linux
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

// --- Configuration -----------------------------------------------------------
const app = express();
const PORT = 5000;

// __dirname is the folder this file lives in, so courses.json is always found
// next to app.js no matter which folder you start the server from.
const DATA_FILE = path.join(__dirname, 'courses.json');

// The only status values a course is allowed to have.
const VALID_STATUSES = ['Not Started', 'In Progress', 'Completed'];

// The fields a client must send when creating a course.
const REQUIRED_FIELDS = ['name', 'description', 'target_date', 'status'];

// --- Middleware --------------------------------------------------------------
// Middleware runs on every request before it reaches the routes.
// express.json() reads the request body and turns JSON text into a JavaScript
// object at req.body. Without this line, req.body would be undefined.
app.use(express.json());

// =============================================================================
// File helpers: reading and writing courses.json
// =============================================================================

/**
 * Make sure courses.json exists and holds a valid JSON array.
 * Runs once when the server starts.
 * - File missing → create it with an empty array: []
 * - File empty   → write an empty array into it
 */
async function initializeDataFile() {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf8');
    if (content.trim() === '') {
      await writeCourses([]);
      console.log('courses.json was empty - initialized it with []');
    }
  } catch (error) {
    // ENOENT is Node's error code for "file or folder does not exist".
    if (error.code === 'ENOENT') {
      await writeCourses([]);
      console.log('courses.json not found - created a new one');
    } else {
      throw error; // Any other error (e.g. no permission) is a real problem.
    }
  }
}

/**
 * Read all courses from the JSON file.
 * @returns {Promise<Array>} the list of courses
 */
async function readCourses() {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf8');

    // An empty file means "no courses yet". JSON.parse('') would throw an
    // error, so we handle this case ourselves.
    if (content.trim() === '') {
      return [];
    }

    const courses = JSON.parse(content);

    // Protect against someone editing the file by hand and breaking it.
    if (!Array.isArray(courses)) {
      throw new Error('courses.json must contain a JSON array');
    }

    return courses;
  } catch (error) {
    // If the file was deleted while the server is running, treat it as empty.
    if (error.code === 'ENOENT') {
      return [];
    }
    // Wrap the error with a clearer message. The route that called us will
    // catch it and send a 500 response.
    throw new Error(`Could not read course data: ${error.message}`);
  }
}

/**
 * Save all courses to the JSON file.
 * JSON.stringify(data, null, 2) indents the output by 2 spaces, which makes
 * the file easy to read if you open it in your editor.
 * @param {Array} courses - the full list of courses to save
 */
async function writeCourses(courses) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(courses, null, 2), 'utf8');
  } catch (error) {
    throw new Error(`Could not save course data: ${error.message}`);
  }
}

// =============================================================================
// Validation helpers
// =============================================================================

/**
 * Check that a string is a real date in YYYY-MM-DD format.
 * A regex alone would accept "2026-02-31", so we also check that JavaScript
 * builds the same date back from it.
 */
function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  // toISOString() gives "2026-12-31T00:00:00.000Z"; the first 10 characters
  // must match the input exactly. "2026-02-31" would become "2026-03-03".
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Is a value "missing"? undefined, null and blank strings ("" or "   ") all count.
 */
function isMissing(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/**
 * Validate course fields sent by the client.
 * @param {object} data - the request body
 * @param {boolean} requireAll - true for POST (every field required),
 *                               false for PUT (only check fields that were sent)
 * @returns {string[]} a list of error messages (empty list = all good)
 */
function validateCourse(data, requireAll) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    const value = data[field];

    // On PUT, a field that wasn't sent at all keeps its old value, so skip it.
    if (!requireAll && value === undefined) {
      continue;
    }

    // 1. Missing / empty field. "continue" skips the remaining checks for this
    //    field, so each problem is only reported once.
    if (isMissing(value)) {
      errors.push(requireAll ? `"${field}" is required` : `"${field}" cannot be empty`);
      continue;
    }

    // 2. name and description must be text
    if ((field === 'name' || field === 'description') && typeof value !== 'string') {
      errors.push(`"${field}" must be text`);
    }

    // 3. target_date must be a real date in YYYY-MM-DD format
    if (field === 'target_date' && !isValidDate(value)) {
      errors.push('"target_date" must be a valid date in YYYY-MM-DD format');
    }

    // 4. status must be one of the allowed values (spelling and capitals matter)
    if (field === 'status' && !VALID_STATUSES.includes(value)) {
      errors.push(`"status" must be one of: ${VALID_STATUSES.join(', ')}`);
    }
  }

  return errors;
}

/**
 * Turn the :id from the URL (always a string) into a positive whole number.
 * Returns null if it isn't one, e.g. "/api/courses/abc".
 */
function parseId(idParam) {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// =============================================================================
// Routes (the REST API endpoints)
// =============================================================================

// --- GET /api/courses - Get all courses ---------------------------------------
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await readCourses();
    res.status(200).json(courses); // 200 OK
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message }); // 500 Internal Server Error
  }
});

// --- GET /api/courses/stats - Course statistics ------------------------------
// IMPORTANT: this route must be defined BEFORE "/api/courses/:id".
// Express checks routes from top to bottom and uses the first one that matches.
// If ":id" came first, "/api/courses/stats" would match it with id = "stats",
// and the client would get a "Course id must be a positive whole number" error.
app.get('/api/courses/stats', async (req, res) => {
  try {
    const courses = await readCourses();

    // Start every status at 0, so statuses with no courses still show up.
    // Result: { "Not Started": 0, "In Progress": 0, "Completed": 0 }
    const byStatus = {};
    for (const status of VALID_STATUSES) {
      byStatus[status] = 0;
    }

    // Go through each course and add 1 to the count for its status.
    for (const course of courses) {
      // Only count known statuses (skips anything hand-edited into the file).
      if (byStatus[course.status] !== undefined) {
        byStatus[course.status] += 1;
      }
    }

    res.status(200).json({
      total: courses.length,
      by_status: byStatus,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- GET /api/courses/:id - Get a specific course ----------------------------
// ":id" is a route parameter. For /api/courses/3, req.params.id is "3".
app.get('/api/courses/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Course id must be a positive whole number' });
    }

    const courses = await readCourses();
    const course = courses.find((c) => c.id === id);

    if (!course) {
      return res.status(404).json({ error: `Course with id ${id} not found` }); // 404 Not Found
    }

    res.status(200).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- POST /api/courses - Add a new course ------------------------------------
app.post('/api/courses', async (req, res) => {
  try {
    const body = req.body || {};

    // Validate everything before touching the file.
    const errors = validateCourse(body, true);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors }); // 400 Bad Request
    }

    const courses = await readCourses();

    // Auto-generate the id: one more than the highest existing id, starting at 1.
    // We use the highest id (not courses.length + 1) so that deleting a course
    // never causes two courses to share the same id.
    const nextId = courses.length > 0 ? Math.max(...courses.map((c) => c.id)) + 1 : 1;

    // Build the new course. We pick only the fields we expect, so a client
    // can't sneak in extra fields or set its own id / created_at.
    const newCourse = {
      id: nextId,
      name: body.name.trim(),
      description: body.description.trim(),
      target_date: body.target_date,
      status: body.status,
      created_at: new Date().toISOString(), // e.g. "2026-11-15T10:30:00.000Z"
    };

    courses.push(newCourse);
    await writeCourses(courses);

    res.status(201).json(newCourse); // 201 Created
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- PUT /api/courses/:id - Update a course ----------------------------------
// You can send any of: name, description, target_date, status.
// Fields you leave out keep their current value.
app.put('/api/courses/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Course id must be a positive whole number' });
    }

    const body = req.body || {};

    // Only these fields may be changed. id and created_at are protected.
    const updates = {};
    for (const field of REQUIRED_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: `Provide at least one field to update: ${REQUIRED_FIELDS.join(', ')}`,
      });
    }

    // Check only the fields that were sent.
    const errors = validateCourse(updates, false);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const courses = await readCourses();
    const index = courses.findIndex((c) => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: `Course with id ${id} not found` });
    }

    // The spread operator (...) copies the old course, then overwrites it with
    // the updated fields.
    courses[index] = { ...courses[index], ...updates };
    await writeCourses(courses);

    res.status(200).json(courses[index]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- DELETE /api/courses/:id - Delete a course -------------------------------
app.delete('/api/courses/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Course id must be a positive whole number' });
    }

    const courses = await readCourses();
    const index = courses.findIndex((c) => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: `Course with id ${id} not found` });
    }

    // splice(index, 1) removes 1 item at that position and returns it in an array.
    const [deletedCourse] = courses.splice(index, 1);
    await writeCourses(courses);

    res.status(200).json({ message: 'Course deleted successfully', course: deletedCourse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// Fallback handlers (must come AFTER all routes)
// =============================================================================

// Any request that didn't match a route above ends up here.
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Error-handling middleware has 4 parameters (err, req, res, next).
// Express sends errors here, e.g. when the request body is not valid JSON.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// =============================================================================
// Start the server
// =============================================================================
// We prepare courses.json first, then start listening for requests.
initializeDataFile()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CodeCraftHub API is running at http://localhost:${PORT}`);
      console.log(`Try it: http://localhost:${PORT}/api/courses`);
    });
  })
  .catch((error) => {
    console.error('Failed to set up courses.json:', error.message);
    process.exit(1); // Stop the program with an error code
  });
