const express = require('express');
const router = express.Router();
const NexCard = require('../models/NexCard');
const User = require('../models/User');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// Configure multer for temporary storage
const upload = multer({ dest: 'uploads/temp/' });

// 1. Add Single Card
router.post('/add', async (req, res) => {
    try {
        const { cardNumber } = req.body;
        if (!cardNumber) return res.status(400).json({ error: 'Card number is required' });

        const existing = await NexCard.findOne({ cardNumber });
        if (existing) return res.status(400).json({ error: 'Card number already exists' });

        const newCard = new NexCard({ cardNumber });
        await newCard.save();

        res.status(201).json({ message: 'Card added successfully', card: newCard });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Bulk Upload Cards (Excel/CSV)
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const filePath = req.file.path;
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        let addedCount = 0;
        let skippedCount = 0;
        let errors = [];

        // Log headers for debugging
        if (data.length > 0) {
            console.log('[BULK UPLOAD] Sample Row Keys:', Object.keys(data[0]));
        }

        for (const row of data) {
            // Find key that looks like card number (case insensitive)
            const cardKey = Object.keys(row).find(k => 
                k.toLowerCase().replace(/[\s_-]/g, '') === 'cardnumber' || 
                k.toLowerCase() === 'code' ||
                k.toLowerCase() === 'card'
            );

            let cardNumber = cardKey ? row[cardKey] : null;

            if (!cardNumber) {
                skippedCount++;
                continue;
            }

            // Convert to string and clean
            const cleanCardNumber = cardNumber.toString().trim();
            if (!cleanCardNumber) {
                skippedCount++;
                continue;
            }

            try {
                const existing = await NexCard.findOne({ cardNumber: cleanCardNumber });
                if (existing) {
                    skippedCount++;
                } else {
                    await new NexCard({ cardNumber: cleanCardNumber }).save();
                    addedCount++;
                }
            } catch (err) {
                errors.push(`Error with ${cleanCardNumber}: ${err.message}`);
                skippedCount++;
            }
        }

        // Delete temp file
        fs.unlinkSync(filePath);

        res.json({ 
            message: 'Bulk upload complete', 
            addedCount, 
            skippedCount,
            errors: errors.length > 0 ? errors : undefined 
        });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

// 3. Get All Cards (Inventory)
router.get('/inventory', async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = {};
        
        if (status && status !== 'all') {
            query.status = status;
        }

        if (search && search.trim() !== '') {
            query.cardNumber = { $regex: search.trim(), $options: 'i' };
        }

        const cards = await NexCard.find(query).populate('assignedTo', 'name phone businessName role').sort({ createdAt: -1 });
        res.json(cards);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Delete Card (Only if available)
router.delete('/:id', async (req, res) => {
    try {
        const card = await NexCard.findById(req.params.id);
        if (!card) return res.status(404).json({ error: 'Card not found' });
        if (card.status === 'assigned') return res.status(400).json({ error: 'Cannot delete an assigned card' });

        await NexCard.findByIdAndDelete(req.params.id);
        res.json({ message: 'Card deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
