const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { protect } = require('../middleware/authMiddleware');
const Item = require('../models/Item');
const ShopOrder = require('../models/ShopOrder');
const Banner = require('../models/Banner');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');

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

// @route   POST /api/shop/items
// @desc    Add a new inventory item
// @access  Private
router.post('/items', protect, upload.single('image'), async (req, res) => {
    try {
        console.log('--- ADD ITEM REQUEST ---');
        console.log('Body:', req.body);
        console.log('File:', req.file);

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
        console.log('Item created successfully:', item._id);
        res.status(201).json(item);
    } catch (error) {
        console.error('Add Shop Item error detail:', error);
        res.status(500).json({ error: error.message || 'Failed to add item' });
    }
});

// @route   GET /api/shop/items/my
// @desc    Get all items for the logged in shop provider
// @access  Private
router.get('/items/my', protect, async (req, res) => {
    try {
        const items = await Item.find({ owner: req.user.id }).sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        console.error('Fetch Shop Items error:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

// @route   GET /api/shop/items
// @desc    Get all active shop items (for farmers)
// @access  Public
router.get('/items', async (req, res) => {
    try {
        const { category } = req.query;
        let query = {};
        if (category) query.category = category;

        const items = await Item.find(query).sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        console.error('Fetch All Shop Items error:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

// @route   GET /api/shop/items/:id
// @desc    Get a single shop item by ID
// @access  Public
router.get('/items/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json(item);
    } catch (error) {
        console.error('Fetch Single Item error:', error);
        res.status(500).json({ error: 'Failed to fetch item' });
    }
});

// @route   PUT /api/shop/items/:id
// @desc    Edit an existing shop item
// @access  Private
router.put('/items/:id', protect, upload.single('image'), async (req, res) => {
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
        console.error('Update Shop Item error:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// @route   GET /api/shop/dashboard
// @desc    Get dashboard statistics for the shop provider
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
    try {
        const ownerId = req.user.id;
        
        // Calculate start of today in IST (GMT+5:30)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffset);
        istNow.setUTCHours(0, 0, 0, 0);
        const startOfToday = new Date(istNow.getTime() - istOffset);

        // Lifetime stats
        const totalOrders = await ShopOrder.countDocuments({ owner: ownerId });
        const totalDelivered = await ShopOrder.countDocuments({ owner: ownerId, status: 'DELIVERED' });

        // Today stats (based on when created)
        const todayNew = await ShopOrder.countDocuments({
            owner: ownerId,
            status: 'NEW',
            createdAt: { $gte: startOfToday }
        });
        const todayAccepted = await ShopOrder.countDocuments({
            owner: ownerId,
            status: 'ACCEPTED',
            createdAt: { $gte: startOfToday }
        });
        const todayDelivered = await ShopOrder.countDocuments({
            owner: ownerId,
            status: 'DELIVERED',
            createdAt: { $gte: startOfToday }
        });

        res.json({
            lifetime: { totalOrders, totalDelivered },
            today: { new: todayNew, accepted: todayAccepted, delivered: todayDelivered }
        });
    } catch (error) {
        console.error('Fetch Shop Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// @route   DELETE /api/shop/items/:id
// @desc    Delete a shop item
// @access  Private
router.delete('/items/:id', protect, async (req, res) => {
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
        console.error('Delete Shop Item error:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// @route   GET /api/shop/orders
// @desc    Get all orders for the shop provider
// @access  Private
router.get('/orders', protect, async (req, res) => {
    try {
        const orders = await ShopOrder.find({ owner: req.user.id })
            .populate('buyer', 'name phone address location')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error('Fetch Shop Orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// @route   PATCH /api/shop/orders/:id/status
// @desc    Update order status
// @access  Private
router.patch('/orders/:id/status', protect, async (req, res) => {
    try {
        const { status, cancelReason } = req.body;

        const order = await ShopOrder.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.owner.toString() !== req.user.id) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const previousStatus = order.status;
        order.status = status;
        if (cancelReason) {
            order.cancelReason = cancelReason;
        }

        const updatedOrder = await order.save();

        // Notify Buyer about Status Change
        const { sendNotification } = require('../services/notificationService');
        
        let statusMsgEn = '';
        let statusMsgHi = '';
        let titleEn = 'Order Update';

        switch (status) {
            case 'ACCEPTED':
                statusMsgEn = `Your order #${order._id.toString().slice(-6)} has been accepted and is being prepared.`;
                statusMsgHi = `आपका ऑर्डर #${order._id.toString().slice(-6)} स्वीकार कर लिया गया है और तैयार किया जा रहा है।`;
                break;
            case 'IN_PROGRESS':
                statusMsgEn = `Your order #${order._id.toString().slice(-6)} is now in progress/out for delivery.`;
                statusMsgHi = `आपका ऑर्डर #${order._id.toString().slice(-6)} अब प्रगति पर है/डिलिवरी के लिए निकल गया है।`;
                break;
            case 'DELIVERED':
                titleEn = 'Order Delivered';
                statusMsgEn = `Yay! Your order #${order._id.toString().slice(-6)} has been delivered successfully.`;
                statusMsgHi = `बधाई हो! आपका ऑर्डर #${order._id.toString().slice(-6)} सफलतापूर्वक डिलिवर हो गया है।`;
                break;
            case 'CANCELLED':
                titleEn = 'Order Cancelled';
                statusMsgEn = `Your order #${order._id.toString().slice(-6)} has been cancelled. ${cancelReason ? 'Reason: ' + cancelReason : ''}`;
                statusMsgHi = `आपका ऑर्डर #${order._id.toString().slice(-6)} रद्द कर दिया गया है। ${cancelReason ? 'कारण: ' + cancelReason : ''}`;
                break;
        }

        if (statusMsgEn) {
            await sendNotification(order.buyer, {
                title: titleEn,
                messageEn: statusMsgEn,
                messageHi: statusMsgHi,
                type: 'status',
                refId: order._id.toString()
            });
        }

        // Wallet Credit Logic for Shop Partner
        if (status === 'DELIVERED' && previousStatus !== 'DELIVERED') {
            const owner = await User.findById(order.owner);
            if (owner) {
                const amount = order.totalAmount || 0;
                owner.walletBalance = (owner.walletBalance || 0) + amount;
                await owner.save();

                // Create Transaction record
                await Transaction.create({
                    transactionId: `SHOP-${order._id}-${Date.now()}`,
                    recipient: owner._id,
                    module: 'Shop',
                    amount: amount,
                    type: 'Payout',
                    paymentMode: 'NexCard Wallet',
                    status: 'Completed',
                    referenceId: order._id,
                    note: `Payment for Order #${order._id.toString().slice(-6)}`
                });
                console.log(`[SHOP] Credited ${amount} to partner ${owner.name} for order ${order._id}`);
            }
        }

        res.json(updatedOrder);
    } catch (error) {
        console.error('Update Shop Order status error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// @route   GET /api/shop/orders/:id
// @desc    Get a single shop order by ID
// @access  Private
router.get('/orders/:id', protect, async (req, res) => {
    try {
        const order = await ShopOrder.findById(req.params.id)
            .populate('owner', 'name phone')
            .populate('buyer', 'name phone address');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if the user is the buyer or the owner
        const isBuyer = order.buyer._id.toString() === req.user.id;
        const isOwner = order.owner._id.toString() === req.user.id;

        if (!isBuyer && !isOwner) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        res.json(order);
    } catch (error) {
        console.error('Fetch Single Shop Order error:', error);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
});

// @route   GET /api/shop/wallet-config
// @desc    Get wallet discount percentage and user wallet balance
// @access  Private
router.get('/wallet-config', protect, async (req, res) => {
    try {
        const [settings, user] = await Promise.all([
            Settings.getSettings(),
            User.findById(req.user.id).select('walletBalance')
        ]);
        res.json({
            walletDiscountPercentage: settings.pricing.walletDiscountPercentage || 0,
            walletBalance: user ? user.walletBalance : 0
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch wallet config' });
    }
});

// @route   POST /api/shop/checkout
// @desc    Place a new shop order
// @access  Private
router.post('/checkout', protect, async (req, res) => {
    try {
        const { items, deliveryAddress, paymentMethod } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Group items by owner (Shop Partner)
        const groupedItems = items.reduce((groups, item) => {
            const owner = item.owner || 'admin'; // Fallback if no owner
            if (!groups[owner]) groups[owner] = [];
            groups[owner].push(item);
            return groups;
        }, {});

        const settings = await Settings.getSettings();
        const discountPercentage = settings.pricing.walletDiscountPercentage || 0;

        const orders = [];
        for (const [ownerId, ownerItems] of Object.entries(groupedItems)) {
            const rawTotal = ownerItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
            
            let discountApplied = 0;
            let finalAmount = rawTotal;

            if (paymentMethod === 'wallet') {
                discountApplied = Math.round((rawTotal * discountPercentage) / 100);
                finalAmount = rawTotal - discountApplied;
            }

            const orderData = {
                buyer: req.user.id,
                owner: ownerId === 'admin' ? req.user.id : ownerId,
                items: ownerItems.map(it => ({
                    itemRef: it.id,
                    name: it.name,
                    price: it.price,
                    quantity: it.qty,
                    unit: it.unit,
                    imageUrl: it.image
                })),
                totalAmount: finalAmount,
                discountApplied,
                discountPercentage,
                deliveryAddress,
                paymentMode: paymentMethod === 'cod' ? 'CASH' : 'WALLET',
                status: 'NEW'
            };

            const order = await ShopOrder.create(orderData);
            orders.push(order);

            // If wallet payment, check and deduct balance
            if (paymentMethod === 'wallet') {
                const user = await User.findById(req.user.id);
                if (user.walletBalance < finalAmount) {
                    return res.status(400).json({ error: `Insufficient wallet balance. Need ₹${finalAmount}` });
                }
                user.walletBalance -= finalAmount;
                await user.save();

                // Create transaction linked to order
                await Transaction.create({
                    transactionId: `SHOP-WALLET-${Date.now()}-${order._id.toString().slice(-4)}`,
                    recipient: req.user.id,
                    module: 'Shop',
                    amount: finalAmount,
                    type: 'Debit',
                    paymentMode: 'NexCard Wallet',
                    status: 'Completed',
                    referenceId: order._id,
                    note: `Payment for Shop Order (Discount: ₹${discountApplied})`
                });
            }

            // Notify Shop Partner
            const { sendNotification } = require('../services/notificationService');
            await sendNotification(ownerId, {
                title: 'New Online Order',
                messageEn: `You have received a new order for ${ownerItems.length} items. Total: ₹${finalAmount}`,
                messageHi: `आपको ${ownerItems.length} आइटम के लिए एक नया ऑर्डर मिला है। कुल: ₹${finalAmount}`,
                type: 'order',
                refId: order._id.toString()
            }).catch(() => { });

            // Update item stock
            for (const it of ownerItems) {
                await Item.findByIdAndUpdate(it.id, { $inc: { stockQty: -it.qty } });
            }
        }

        res.status(201).json({ message: 'Orders placed successfully', orders });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Checkout failed' });
    }
});

// @route   GET /api/shop/my-orders
// @desc    Get all orders placed by the current user
// @access  Private
router.get('/my-orders', protect, async (req, res) => {
    try {
        const orders = await ShopOrder.find({ buyer: req.user.id })
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Fetch My Shop Orders error:', error);
        res.status(500).json({ error: 'Failed to fetch your orders' });
    }
});

// @route   GET /api/shop/banners
// @desc    Get active shop banners
// @access  Public
router.get('/banners', async (req, res) => {
    try {
        const banners = await Banner.find({ active: true });
        res.json(banners);
    } catch (error) {
        console.error('Fetch Banner error:', error);
        res.status(500).json({ error: 'Failed to fetch banners' });
    }
});

// @route   GET /api/shop/wallet
// @desc    Get wallet balance and transaction history
// @access  Private
router.get('/wallet', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('walletBalance');
        const transactions = await Transaction.find({ recipient: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            balance: user ? user.walletBalance : 0,
            transactions
        });
    } catch (error) {
        console.error('Fetch Shop Wallet error:', error);
        res.status(500).json({ error: 'Failed to fetch wallet info' });
    }
});

module.exports = router;
