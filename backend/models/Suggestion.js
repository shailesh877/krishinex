const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
    titleEn: {
        type: String,
        default: "Today's Advisory"
    },
    titleHi: {
        type: String,
        default: "आज का सुझाव"
    },
    contentEn: {
        type: String,
        required: false
    },
    contentHi: {
        type: String,
        required: false
    },
    active: {
        type: Boolean,
        default: true
    },
    imageUrl: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Suggestion', suggestionSchema);
