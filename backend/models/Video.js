const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    titleEn: { type: String, required: true },
    titleHi: { type: String, required: true },
    youtubeId: { type: String, required: true },
    thumbnail: { type: String },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('Video', videoSchema);
