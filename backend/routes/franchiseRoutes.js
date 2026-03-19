const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Item = require('../models/Item');
const FranchiseSale = require('../models/FranchiseSale');
const Transaction = require('../models/Transaction');

// Setup multer for Item images
const uploadDir = path.join(__dirname, '../uploads/items');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        cb(null, `item-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// Middleware to check if user is a franchise (ksp)
const checkFranchise = (req, res, next) => {
    if (req.user && req.user.role === 'ksp') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Franchise only' });
    }
};

// @route   GET /api/franchise/dashboard
// @desc    Get dashboard stats for current franchise
router.get('/dashboard', protect, checkFranchise, async (req, res) => {
    try {
        const franchiseId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalSales = await FranchiseSale.countDocuments({ franchise: franchiseId });
        const todaySales = await FranchiseSale.countDocuments({ franchise: franchiseId, createdAt: { $gte: today } });
        
        const salesVolume = await FranchiseSale.aggregate([
            { $match: { franchise: require('mongoose').Types.ObjectId(franchiseId), status: 'Completed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        const inventoryCount = await Item.countDocuments({ owner: franchiseId });

        res.json({
            stats: {
                totalSales,
                todaySales,
                totalRevenue: salesVolume.length > 0 ? salesVolume[0].total : 0,
                inventoryCount
            }
        });
    } catch (error) {
        console.error('Franchise Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
});

// @route   POST /api/franchise/items
// @desc    Add a new inventory item
// @access  Private
router.post('/items', protect, checkFranchise, upload.single('image'), async (req, res) => {
    try {
        const { name, category, price, unit, stockQty, description, variants } = req.body;
        const hasVariants = req.body.hasVariants === 'true' || req.body.hasVariants === true;
        
        let parsedVariants = [];
        if (hasVariants) {
            try {
                parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
            } catch (e) {
                console.error('Error parsing variants:', e);
            }
        }

        const itemInput = {
            owner: req.user.id,
            name,
            category,
            price: price ? Number(price) : 0,
            unit,
            stockQty: stockQty ? Number(stockQty) : 0,
            description,
            hasVariants: hasVariants === 'true' || hasVariants === true,
            variants: parsedVariants
        };

        if (req.file) {
            itemInput.imageUrl = `uploads/items/${req.file.filename}`;
        }

        const item = await Item.create(itemInput);
        res.status(201).json(item);
    } catch (error) {
        console.error('Add Franchise Item error detail:', error);
        res.status(500).json({ error: error.message || 'Failed to add item' });
    }
});

// @route   GET /api/franchise/items/my
// @desc    Get all items for the logged in franchise
// @access  Private
router.get('/items/my', protect, checkFranchise, async (req, res) => {
    try {
        const items = await Item.find({ owner: req.user.id }).sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        console.error('Fetch Franchise Items error:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

// @route   PUT /api/franchise/items/:id
// @desc    Edit an existing franchise item
// @access  Private
router.put('/items/:id', protect, checkFranchise, upload.single('image'), async (req, res) => {
    try {
        let item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        if (item.owner.toString() !== req.user.id) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const { name, category, price, unit, stockQty, description, variants } = req.body;
        const hasVariants = req.body.hasVariants === 'true' || req.body.hasVariants === true;

        item.name = name || item.name;
        item.category = category || item.category;
        item.price = price !== undefined ? Number(price) : item.price;
        item.unit = unit || item.unit;
        item.stockQty = stockQty !== undefined ? Number(stockQty) : item.stockQty;
        item.description = description !== undefined ? description : item.description;
        item.hasVariants = hasVariants;

        if (hasVariants && variants) {
            try {
                item.variants = typeof variants === 'string' ? JSON.parse(variants) : variants;
            } catch (e) {
                console.error('Error parsing variants in update:', e);
            }
        }

        if (req.file) {
            item.imageUrl = `uploads/items/${req.file.filename}`;
        }

        const updatedItem = await item.save();
        res.json(updatedItem);
    } catch (error) {
        console.error('Update Franchise Item error:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// @route   DELETE /api/franchise/items/:id
// @desc    Delete a franchise item
// @access  Private
router.delete('/items/:id', protect, checkFranchise, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        if (item.owner.toString() !== req.user.id) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        await Item.deleteOne({ _id: req.params.id });
        res.json({ message: 'Item removed' });
    } catch (error) {
        console.error('Delete Franchise Item error:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// @route   POST /api/franchise/sales/record
// @desc    Record a new OTC sale
router.post('/sales/record', protect, checkFranchise, async (req, res) => {
    try {
        const { buyerId, buyerName, buyerPhone, items, totalAmount, paymentMode, notes } = req.body;
        const franchiseId = req.user.id;

        if (!items || items.length === 0 || !totalAmount) {
            return res.status(400).json({ error: 'Items and total amount are required' });
        }

        const saleId = `KSP-SALE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        // If NexCard Wallet payment, deduct from farmer's balance
        if (paymentMode === 'NexCard Wallet') {
            if (!buyerId) return res.status(400).json({ error: 'Farmer ID required for wallet payment' });
            
            const buyer = await User.findById(buyerId);
            if (!buyer) return res.status(404).json({ error: 'Farmer not found' });
            if (buyer.walletBalance < totalAmount) {
                return res.status(400).json({ error: 'Insufficient wallet balance' });
            }

            buyer.walletBalance -= totalAmount;
            await buyer.save();

            // Create transaction for farmer (Debit)
            await Transaction.create({
                transactionId: `TXN-${saleId}-D`,
                recipient: buyerId,
                module: 'KSP',
                amount: totalAmount,
                type: 'Debit',
                paymentMode: 'NexCard Wallet',
                status: 'Completed',
                note: `Purchase at Franchise (Sale ID: ${saleId})`
            });

            // Credit Franchise wallet
            const franchise = await User.findById(franchiseId);
            franchise.walletBalance += totalAmount;
            await franchise.save();

            // Create transaction for franchise (Credit)
            await Transaction.create({
                transactionId: `TXN-${saleId}-C`,
                recipient: franchiseId,
                module: 'KSP',
                amount: totalAmount,
                type: 'Credit',
                paymentMode: 'NexCard Wallet',
                status: 'Completed',
                note: `Sale to ${buyerName || buyer.name} (Sale ID: ${saleId})`
            });
        }

        // Record Sale
        const sale = await FranchiseSale.create({
            franchise: franchiseId,
            buyer: buyerId,
            buyerName,
            buyerPhone,
            items,
            totalAmount,
            paymentMode,
            saleId,
            notes
        });

        // Update Stock
        for (const it of items) {
            if (it.itemRef) {
                await Item.findByIdAndUpdate(it.itemRef, { $inc: { stockQty: -it.quantity } });
            }
        }

        res.status(201).json({ message: 'Sale recorded successfully', sale });
    } catch (error) {
        console.error('Record Sale error:', error);
        res.status(500).json({ error: 'Failed to record sale' });
    }
});

// @route   GET /api/franchise/sales
// @desc    Get sales history
router.get('/sales', protect, checkFranchise, async (req, res) => {
    try {
        const sales = await FranchiseSale.find({ franchise: req.user.id })
            .populate('buyer', 'name phone')
            .sort({ createdAt: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sales ledger' });
    }
});

// @route   POST /api/franchise/verify-farmer
// @desc    Verify farmer by phone or card number
router.post('/verify-farmer', protect, checkFranchise, async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ error: 'Please provide phone or card number' });

        const farmer = await User.findOne({ 
            $or: [{ phone: identifier }, { cardNumber: identifier }],
            role: 'farmer'
        }).select('_id name phone walletBalance cardNumber');

        if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

        res.json(farmer);
    } catch (error) {
        console.error('Verify farmer error:', error);
        res.status(500).json({ error: 'Failed to verify farmer' });
    }
});

// @route   POST /api/franchise/recharge
// @desc    Recharge a farmer's wallet (Franchise acting as collection point)
router.post('/recharge', protect, checkFranchise, async (req, res) => {
    try {
        const { cardNumber, amount } = req.body;
        if (!cardNumber || !amount) return res.status(400).json({ error: 'Card number and amount required' });

        const farmer = await User.findOne({ cardNumber, role: 'farmer' });
        if (!farmer) return res.status(404).json({ error: 'Farmer with this card not found' });

        const franchise = await User.findById(req.user.id);

        // Record Transaction
        const txnId = `RECH-KSP-${Date.now()}`;
        await Transaction.create({
            transactionId: txnId,
            recipient: farmer._id,
            module: 'KSP',
            amount: Number(amount),
            type: 'Credit',
            paymentMode: 'Cash',
            status: 'Completed',
            performedBy: franchise._id,
            note: `Recharge by KSP Franchise: ${franchise.name}`
        });

        farmer.walletBalance += Number(amount);
        await farmer.save();

        res.json({ message: 'Recharge successful', newBalance: farmer.walletBalance });
    } catch (error) {
        res.status(500).json({ error: 'Recharge failed' });
    }
});

// @route   GET /api/franchise/wallet
// @desc    Get franchise wallet balance and transaction history
router.get('/wallet', protect, checkFranchise, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('walletBalance');
        
        // Find transactions where franchise is recipient OR they performed the transaction
        const transactions = await Transaction.find({
            $or: [
                { recipient: req.user.id },
                { performedBy: req.user.id, module: 'KSP' },
                { transactionId: { $regex: '^TXN-KSP' } } // optional fallback
            ]
        }).sort({ createdAt: -1 });

        res.json({
            balance: user ? user.walletBalance : 0,
            transactions
        });
    } catch (error) {
        console.error('Fetch Franchise Wallet error:', error);
        res.status(500).json({ error: 'Failed to fetch wallet info' });
    }
});

module.exports = router;
