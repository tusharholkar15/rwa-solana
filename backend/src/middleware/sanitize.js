/**
 * Input Sanitization Middleware
 * 
 * Prevents MongoDB operator injection attacks by stripping
 * keys starting with '$' from req.body, req.query, and req.params.
 * Also provides a regex-safe escaper for search strings.
 */

/**
 * Recursively strips keys starting with '$' from an object.
 * Prevents NoSQL injection via { "$gt": "" } style payloads.
 */
function stripDollarKeys(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripDollarKeys);

  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$")) continue; // Drop dangerous keys
    clean[key] = stripDollarKeys(obj[key]);
  }
  return clean;
}

/**
 * Escapes special regex characters to prevent ReDoS attacks
 * when user input is used in MongoDB $regex queries.
 */
function escapeRegex(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Express middleware: sanitize all incoming request data
 */
function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = stripDollarKeys(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = stripDollarKeys(req.query);
  }
  if (req.params && typeof req.params === "object") {
    req.params = stripDollarKeys(req.params);
  }
  
  if (req.query && typeof req.query.search === "string") {
    req.query.search = escapeRegex(req.query.search);
  }
  
  next();
}

module.exports = { sanitizeInputs, escapeRegex, stripDollarKeys };
