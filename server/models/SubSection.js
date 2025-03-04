const mongoose = require("mongoose");

const subSectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  videoUrl: { type: String, required: true },
  timeDuration: { type: String, required: true },
});

// Fix: Use `mongoose.models` to avoid re-compilation error
const SubSection = mongoose.models.SubSection || mongoose.model("SubSection", subSectionSchema);

module.exports = SubSection;
