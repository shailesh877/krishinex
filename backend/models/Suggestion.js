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
        required: true
    },
    contentHi: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Suggestion', suggestionSchema);
