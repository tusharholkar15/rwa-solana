/**
 * Community & Social Routes
 * Reviews, posts, likes, and investor interactions
 */
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// ─── Inline Models (for simplicity — can extract later) ──────────

const reviewSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true, index: true },
  walletAddress: { type: String, required: true },
  authorName: { type: String, default: "Anonymous Investor" },
  rating: { type: Number, min: 1, max: 5, required: true },
  title: { type: String, maxlength: 200 },
  content: { type: String, maxlength: 2000 },
  helpfulCount: { type: Number, default: 0 },
  tags: [String],
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, index: true },
  authorName: { type: String, default: "Anonymous" },
  type: { type: String, enum: ["insight", "analysis", "question", "news", "discussion"], default: "insight" },
  title: { type: String, required: true, maxlength: 300 },
  content: { type: String, required: true, maxlength: 5000 },
  tags: [String],
  assetMentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Asset" }],
  likes: { type: Number, default: 0 },
  likedBy: [String],
  commentsCount: { type: Number, default: 0 },
  comments: [{
    walletAddress: String,
    authorName: { type: String, default: "Anonymous" },
    content: { type: String, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  }],
  isPinned: { type: Boolean, default: false },
}, { timestamps: true });

reviewSchema.index({ assetId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likes: -1 });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
const Post = mongoose.models.Post || mongoose.model("Post", postSchema);

// ─── Review Routes ───────────────────────────────────────────────

/**
 * POST /api/community/review/:assetId
 */
router.post("/review/:assetId", async (req, res) => {
  try {
    const { walletAddress, authorName, rating, title, content, tags } = req.body;

    if (!walletAddress || !rating) {
      return res.status(400).json({ error: "walletAddress and rating required" });
    }

    // Check for existing review
    const existing = await Review.findOne({ assetId: req.params.assetId, walletAddress });
    if (existing) {
      return res.status(409).json({ error: "You have already reviewed this asset" });
    }

    const review = await Review.create({
      assetId: req.params.assetId,
      walletAddress,
      authorName: authorName || "Anonymous Investor",
      rating: Number(rating),
      title,
      content,
      tags: tags || [],
    });

    res.status(201).json(review);
  } catch (error) {
    console.error("Review error:", error);
    res.status(500).json({ error: "Failed to post review" });
  }
});

/**
 * GET /api/community/reviews/:assetId
 */
router.get("/reviews/:assetId", async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = "recent" } = req.query;
    const sortOption = sort === "helpful" ? { helpfulCount: -1 } : { createdAt: -1 };

    const reviews = await Review.find({ assetId: req.params.assetId })
      .sort(sortOption)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Review.countDocuments({ assetId: req.params.assetId });
    const avgRating = await Review.aggregate([
      { $match: { assetId: new mongoose.Types.ObjectId(req.params.assetId) } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    res.json({
      reviews,
      total,
      averageRating: avgRating[0]?.avg ? Math.round(avgRating[0].avg * 10) / 10 : 0,
      totalReviews: avgRating[0]?.count || 0,
    });
  } catch (error) {
    console.error("Fetch reviews error:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// ─── Post / Feed Routes ─────────────────────────────────────────

/**
 * POST /api/community/post
 */
router.post("/post", async (req, res) => {
  try {
    const { walletAddress, authorName, type, title, content, tags, assetMentions } = req.body;

    if (!walletAddress || !title || !content) {
      return res.status(400).json({ error: "walletAddress, title, content required" });
    }

    const post = await Post.create({
      walletAddress,
      authorName: authorName || "Anonymous",
      type: type || "insight",
      title,
      content,
      tags: tags || [],
      assetMentions: assetMentions || [],
    });

    res.status(201).json(post);
  } catch (error) {
    console.error("Post error:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

/**
 * GET /api/community/feed
 */
router.get("/feed", async (req, res) => {
  try {
    const { page = 1, limit = 20, type, sort = "recent" } = req.query;
    const filter = {};
    if (type) filter.type = type;

    const sortOption = sort === "popular" ? { likes: -1, createdAt: -1 } : { isPinned: -1, createdAt: -1 };

    const posts = await Post.find(filter)
      .sort(sortOption)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select("-comments");

    const total = await Post.countDocuments(filter);

    res.json({
      posts,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("Feed error:", error);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

/**
 * POST /api/community/post/:id/like
 */
router.post("/post/:id/like", async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ error: "walletAddress required" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.likedBy.includes(walletAddress)) {
      // Unlike
      post.likedBy = post.likedBy.filter((w) => w !== walletAddress);
      post.likes = Math.max(0, post.likes - 1);
    } else {
      // Like
      post.likedBy.push(walletAddress);
      post.likes += 1;
    }

    await post.save();
    res.json({ likes: post.likes, liked: post.likedBy.includes(walletAddress) });
  } catch (error) {
    res.status(500).json({ error: "Failed to like post" });
  }
});

/**
 * POST /api/community/post/:id/comment
 */
router.post("/post/:id/comment", async (req, res) => {
  try {
    const { walletAddress, authorName, content } = req.body;
    if (!walletAddress || !content) return res.status(400).json({ error: "walletAddress and content required" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.comments.push({
      walletAddress,
      authorName: authorName || "Anonymous",
      content,
    });
    post.commentsCount = post.comments.length;
    await post.save();

    res.json({ comment: post.comments[post.comments.length - 1], commentsCount: post.commentsCount });
  } catch (error) {
    res.status(500).json({ error: "Failed to add comment" });
  }
});

/**
 * GET /api/community/post/:id
 * Get full post with comments
 */
router.get("/post/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

module.exports = router;
