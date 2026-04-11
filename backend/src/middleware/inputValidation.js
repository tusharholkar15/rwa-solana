/**
 * Zod Input Validation Middleware
 */
const { z } = require("zod");

// Reusable Schemas
const walletSchema = z.string().length(44, "Invalid Solana wallet address length");
const positiveNumber = z.number().positive();

// Trade Validator
const tradeRequestSchema = z.object({
  body: z.object({
    assetId: z.string().min(1, "Asset ID is required"),
    shares: positiveNumber,
    walletAddress: walletSchema,
  }),
});

// Validator Middleware Factory
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    return res.status(400).json({ 
      error: "Validation Error", 
      details: err.errors 
    });
  }
};

module.exports = {
  validate,
  tradeRequestSchema,
  // we can export more schemas here as we build them out
};
