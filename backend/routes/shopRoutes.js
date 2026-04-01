const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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
const Ledger = require('../models/Ledger');
const { sendNotification, checkAndNotifyLowStock } = require('../services/notificationService');

const uploadDir = path.join(__dirname, '../uploads/items');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const bannerDir = path.join(__dirname, '../uploads/banners');
if (!fs.existsSync(bannerDir)) {
    fs.mkdirSync(bannerDir, { recursive: true });
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

const bannerStorage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, bannerDir);
    },
    filename(req, file, cb) {
        cb(null, `banner-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const uploadBanner = multer({ storage: bannerStorage });

// @route   POST /api/shop/items
// @desc    Add a new inventory item
// @access  Private
router.post('/items', protect, upload.single('image'), async (req, res) => {
    try {
        console.log('--- ADD ITEM REQUEST ---');
        console.log('Body:', req.body);
        console.log('File:', req.file);

        const { name, category, price, unit, stockQty, description, variants, hsnCode, cgstPercent, sgstPercent } = req.body;
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
            variants: parsedVariants,
            hsnCode,
            cgstPercent: cgstPercent ? Number(cgstPercent) : 0,
            sgstPercent: sgstPercent ? Number(sgstPercent) : 0
        };

        if (req.file) {
            itemInput.imageUrl = `uploads/items/${req.file.filename}`;
        }

        // --- SMART SYNC: Calculate total stockQty from variants ---
        if (hasVariants && Array.isArray(parsedVariants)) {
            itemInput.stockQty = parsedVariants.reduce((sum, v) => sum + Math.max(0, Number(v.stockQty || 0)), 0);
        } else {
            itemInput.stockQty = Math.max(0, Number(stockQty || 0));
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
        const { category, lat, lng } = req.query;
        let query = {};
        if (category) query.category = category;

        // 10km Geo-filtering logic (Bhai, location ke hisab se filter kar rahe hain)
        if (lat && lng) {
            const nearbyShops = await User.find({
                role: 'shop',
                status: 'approved',
                location: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
                        $maxDistance: 10000 // 10km in meters
                    }
                }
            }).select('_id');
            const shopIds = nearbyShops.map(s => s._id);
            
            if (shopIds.length === 0) {
                return res.json([]); // No shops found within range
            }
            query.owner = { $in: shopIds };
        }

        // Use aggregate to filter by owner status and positive stock
        const items = await Item.aggregate([
            { $match: { ...query, stockQty: { $gt: 0 } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'owner',
                    foreignField: '_id',
                    as: 'owner'
                }
            },
            { $unwind: '$owner' },
            {
                $match: {
                    'owner.status': 'approved'
                }
            },
            {
                $project: {
                    'owner.password': 0,
                    'owner.fcmToken': 0
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        // Filter variants with 0 stock for user display
        const filteredItems = items.map(item => {
            if (item.hasVariants && Array.isArray(item.variants)) {
                return {
                    ...item,
                    variants: item.variants.filter(v => (v.stockQty || 0) > 0)
                };
            }
            return item;
        });

        res.json(filteredItems);
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
        const item = await Item.findById(req.params.id).populate('owner');
        if (!item || !item.owner || item.owner.status !== 'approved') {
            return res.status(404).json({ error: 'Item not found or shop not verified' });
        }
        
        // Remove sensitive owner info
        const safeItem = item.toObject();
        if (safeItem.owner) {
            delete safeItem.owner.password;
            delete safeItem.owner.fcmToken;
        }

        // Filter variants with 0 stock for user display
        if (safeItem.hasVariants && Array.isArray(safeItem.variants)) {
            safeItem.variants = safeItem.variants.filter(v => (v.stockQty || 0) > 0);
        }

        res.json(safeItem);
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

        const { name, category, price, unit, stockQty, description, variants, hsnCode, cgstPercent, sgstPercent } = req.body;
        const hasVariants = req.body.hasVariants === 'true' || req.body.hasVariants === true;

        item.name = name || item.name;
        item.category = category || item.category;
        item.price = price !== undefined ? Number(price) : item.price;
        item.unit = unit || item.unit;
        
        // Safety: Ensure stockQty never saves as negative (fixes ValidationError crashes)
        const newStock = stockQty !== undefined ? Number(stockQty) : item.stockQty;
        item.stockQty = Math.max(0, newStock);

        item.description = description !== undefined ? description : item.description;
        item.hasVariants = hasVariants;
        item.hsnCode = hsnCode || item.hsnCode;
        item.cgstPercent = cgstPercent !== undefined ? Number(cgstPercent) : item.cgstPercent;
        item.sgstPercent = sgstPercent !== undefined ? Number(sgstPercent) : item.sgstPercent;

        if (hasVariants && variants) {
            try {
                let currentVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
                
                if (Array.isArray(currentVariants)) {
                    item.variants = currentVariants.map(v => ({
                        ...v,
                        stockQty: Math.max(0, Number(v.stockQty || 0))
                    }));
                    // --- SMART SYNC: Update total stockQty from variants ---
                    item.stockQty = item.variants.reduce((sum, v) => sum + v.stockQty, 0);
                } else {
                    item.variants = currentVariants;
                }
            } catch (e) {
                console.error('Error parsing variants in update:', e);
            }
        }

        if (req.file) {
            item.imageUrl = `uploads/items/${req.file.filename}`;
        }

        const updatedItem = await item.save();
        
        // Bhai, stock check karein (new stock monitor alert)
        checkAndNotifyLowStock(updatedItem._id).catch(() => {});

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
        const { status, cancelReason, estimatedDeliveryTime } = req.body;

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
        if (estimatedDeliveryTime) {
            order.estimatedDeliveryTime = estimatedDeliveryTime;
        }

        const updatedOrder = await order.save();

        // Notify Buyer about Status Change
        
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

        // Wallet Credit + Debit Logic on Delivery
        if (status === 'DELIVERED' && previousStatus !== 'DELIVERED') {
            // --- AUTOMATED STOCK DEDUCTION ---
            try {
                console.log(`[DEBUG-STOCK] Order #${order._id} - Delivery marked. Processing ${order.items.length} items...`);
                for (const item of order.items) {
                    const qtyToDeduct = item.quantity || 0;
                    
                    if (item.variantLabel) {
                        // --- VARIANT SPECIFIC DEDUCTION ---
                        console.log(`[DEBUG-STOCK] Attempting VARIANT deduction for ${item.name} - ${item.variantLabel}`);
                        
                        // To avoid min: 0 validation crash, we'll fetch and clamp
                        const dbItem = await Item.findById(item.itemRef);
                        if (dbItem && dbItem.variants) {
                            const vIdx = dbItem.variants.findIndex(v => v.label === item.variantLabel);
                            if (vIdx !== -1) {
                                const currentVarStock = dbItem.variants[vIdx].stockQty || 0;
                                dbItem.variants[vIdx].stockQty = Math.max(0, currentVarStock - qtyToDeduct);
                                
                                // --- SMART SYNC: Recalculate main stockQty as sum of all variants ---
                                dbItem.stockQty = dbItem.variants.reduce((sum, v) => sum + (v.stockQty || 0), 0);
                                
                                await dbItem.save();
                                
                                // Bhai, variant stock check karein
                                checkAndNotifyLowStock(dbItem._id).catch(() => {});

                                console.log(`[DEBUG-STOCK] VARIANT SUCCESS: ${item.name} (${item.variantLabel}) New Variant Stock: ${dbItem.variants[vIdx].stockQty}, Total Stock: ${dbItem.stockQty}`);
                            } else {
                                console.log(`[DEBUG-STOCK] VARIANT FAILED: Variant matching label "${item.variantLabel}" not found for item ${item.name}`);
                            }
                        }
                    } else if (item.itemRef) {
                        // --- MAIN STOCK DEDUCTION ---
                        console.log(`[DEBUG-STOCK] Attempting MAIN deduction for ${item.name}, Qty: ${qtyToDeduct}`);
                        const dbItem = await Item.findById(item.itemRef);
                        if (dbItem) {
                            const totalBefore = dbItem.stockQty || 0;
                            dbItem.stockQty = Math.max(0, totalBefore - qtyToDeduct);
                            await dbItem.save();
                            
                            // Bhai, low stock notification check
                            checkAndNotifyLowStock(dbItem._id).catch(() => {});

                            console.log(`[DEBUG-STOCK] MAIN SUCCESS: ${item.name} New Stock: ${dbItem.stockQty}`);
                        } else {
                            console.log(`[DEBUG-STOCK] MAIN FAILED: Item not found in DB for Ref ID: ${item.itemRef}`);
                        }
                    } else {
                        console.log(`[DEBUG-STOCK] SKIP: itemRef is missing/null for item ${item.name}`);
                    }
                }
            } catch (stockErr) {
                console.error('[SHOP] Stock deduction error:', stockErr);
            }

            const owner = await User.findById(order.owner);
            const admin = await User.findOne({ role: 'admin' });
            
            const Settings = require('../models/Settings');
            const settings = await Settings.getSettings();
            const shopCommissionPercent = settings.commissions.shop || 0;
            
            const totalAmount = order.totalAmount || 0;
            const commissionAmount = Math.round((totalAmount * shopCommissionPercent) / 100);
            const payoutAmount = totalAmount - commissionAmount;

            if (owner) {
                if (order.paymentMode === 'WALLET') {
                    // Admin already has the money from user's wallet, credit net payout to owner
                    owner.walletBalance = (owner.walletBalance || 0) + payoutAmount;
                    await owner.save();

                    await Transaction.create({
                        transactionId: `SHOP-PAY-${order._id}-${Date.now()}`,
                        recipient: owner._id,
                        module: 'Shop',
                        amount: payoutAmount,
                        totalAmount: totalAmount,
                        commissionAmount: commissionAmount,
                        type: 'Payout',
                        paymentMode: 'NexCard Wallet',
                        status: 'Completed',
                        referenceId: order._id,
                        note: `Payment for Order #${order._id.toString().slice(-6)} (Total: ₹${totalAmount}, Commission: ₹${commissionAmount})`
                    });
                    console.log(`[SHOP] Credited ₹${payoutAmount} to partner ${owner.name} (Wallet Order)`);
                } else {
                    // CASH order: Owner collected the cash physically, deduct commission from their wallet
                    owner.walletBalance = (owner.walletBalance || 0) - commissionAmount;
                    await owner.save();

                    await Transaction.create({
                        transactionId: `SHOP-COMM-${order._id}-${Date.now()}`,
                        recipient: owner._id,
                        module: 'Shop',
                        amount: commissionAmount,
                        totalAmount: totalAmount,
                        type: 'Debit',
                        paymentMode: 'Cash',
                        status: 'Completed',
                        referenceId: order._id,
                        note: `Admin Commission for Cash Order #${order._id.toString().slice(-6)} (Total: ₹${totalAmount}, Commission: ₹${commissionAmount})`
                    });
                    console.log(`[SHOP] Deducted ₹${commissionAmount} commission from partner ${owner.name} (Cash Order)`);
                }
            }

            // Credit Admin for the commission
            if (admin && commissionAmount > 0) {
                admin.walletBalance = (admin.walletBalance || 0) + commissionAmount;
                await admin.save();

                await Transaction.create({
                    transactionId: `SHOP-ADM-${order._id}-${Date.now()}`,
                    recipient: admin._id,
                    module: 'Platform',
                    amount: commissionAmount,
                    totalAmount: totalAmount,
                    type: 'Credit',
                    paymentMode: 'NexCard Wallet',
                    status: 'Completed',
                    referenceId: order._id,
                    note: `Commission from Shop Order #${order._id.toString().slice(-6)}`
                });
                console.log(`[SHOP] Credited ₹${commissionAmount} commission to Admin`);
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
            soilTestPrice: settings.pricing.soilTestPrice || 250,
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
        console.log('--- CHECKOUT REQUEST ---');
        console.log('Items Count:', items?.length);
        console.log('Payment Method:', paymentMethod);

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Group items by owner (Shop Partner)
        const groupedItems = items.reduce((groups, item) => {
            let owner = item.owner || 'admin';
            
            // If owner is an object (common in some frontend versions), extract its ID
            if (owner && typeof owner === 'object') {
                owner = owner._id || owner.id || 'admin';
            }
            
            const ownerKey = owner.toString();
            if (!groups[ownerKey]) groups[ownerKey] = [];
            groups[ownerKey].push(item);
            return groups;
        }, {});

        console.log('Grouped Owners:', Object.keys(groupedItems));

        const settings = await Settings.getSettings();
        const discountPercentage = settings.pricing.walletDiscountPercentage || 0;

        // Resolve admin ID once if needed
        const adminUser = await User.findOne({ role: 'admin' });
        const adminId = adminUser ? adminUser._id : null;

        const orders = [];
        for (const [ownerId, ownerItems] of Object.entries(groupedItems)) {
            // Resolve owner ID to valid ObjectId
            let resolvedOwnerId = ownerId;
            if (ownerId === 'admin') {
                resolvedOwnerId = adminId;
            }
            
            // If still no valid ID, fallback to buyer or skip (to avoid 500)
            if (!resolvedOwnerId) resolvedOwnerId = req.user.id;

            const rawTotal = ownerItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
            
            let discountApplied = 0;
            let finalAmount = rawTotal;

            if (paymentMethod === 'wallet') {
                discountApplied = Math.round((rawTotal * discountPercentage) / 100);
                finalAmount = rawTotal - discountApplied;
            }

            const orderData = {
                buyer: req.user.id,
                owner: resolvedOwnerId,
                items: await Promise.all(ownerItems.map(async it => {
                    console.log('Processing item:', it.id);
                    const dbItem = (it.id && it.id.match(/^[0-9a-fA-F]{24}$/)) ? await Item.findById(it.id) : null;
                    const cgst = dbItem?.cgstPercent || 0;
                    const sgst = dbItem?.sgstPercent || 0;
                    const totalPrice = it.price * it.qty;
                    const gstTotalPercent = cgst + sgst;
                    
                    // Inclusive Tax Calculation
                    const taxableAmount = totalPrice / (1 + (gstTotalPercent / 100));
                    const gstAmount = totalPrice - taxableAmount;

                    return {
                        itemRef: it.id,
                        name: it.name,
                        price: it.price,
                        quantity: it.qty,
                        unit: it.unit,
                        variantLabel: it.variantLabel,
                        imageUrl: it.image,
                        hsnCode: dbItem?.hsnCode || '',
                        cgstPercent: cgst,
                        sgstPercent: sgst,
                        taxableAmount: Math.round(taxableAmount * 100) / 100,
                        gstAmount: Math.round(gstAmount * 100) / 100
                    };
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

            // Notify Shop Partner (unless it's the admin or same as buyer)
            if (resolvedOwnerId.toString() !== req.user.id) {
                await sendNotification(resolvedOwnerId, {
                    title: 'New Online Order',
                    messageEn: `You have received a new order for ${ownerItems.length} items. Total: ₹${finalAmount}`,
                messageHi: `आपको ${ownerItems.length} आइटम के लिए एक नया ऑर्डर मिला है। कुल: ₹${finalAmount}`,
                type: 'order',
                }).catch(() => { });
            }

            // Update item stock
            for (const it of ownerItems) {
                await Item.findByIdAndUpdate(it.id, { $inc: { stockQty: -it.qty } });
                
                // Bhai, check low stock for every item deduction
                checkAndNotifyLowStock(it.id).catch(() => {});
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
        const banners = await Banner.find({ active: true }).sort({ createdAt: -1 });
        res.json(banners);
    } catch (error) {
        console.error('Fetch Banner error:', error);
        res.status(500).json({ error: 'Failed to fetch banners' });
    }
});

// @route   GET /api/shop/banners/all
// @desc    Get all shop banners (for admin)
// @access  Private
router.get('/banners/all', protect, async (req, res) => {
    try {
        const banners = await Banner.find().sort({ createdAt: -1 });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch all banners' });
    }
});

// @route   POST /api/shop/banners
// @desc    Add a new banner
// @access  Private
router.post('/banners', protect, uploadBanner.single('image'), async (req, res) => {
    try {
        const { title, link } = req.body;
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

        const banner = await Banner.create({
            title,
            link,
            image: `uploads/banners/${req.file.filename}`,
            active: true
        });
        res.status(201).json(banner);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create banner' });
    }
});

// @route   PATCH /api/shop/banners/:id/status
// @desc    Toggle banner active status
// @access  Private
router.patch('/banners/:id/status', protect, async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) return res.status(404).json({ error: 'Banner not found' });

        banner.active = !banner.active;
        await banner.save();
        res.json(banner);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// @route   DELETE /api/shop/banners/:id
// @desc    Delete a banner
// @access  Private
router.delete('/banners/:id', protect, async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) return res.status(404).json({ error: 'Banner not found' });

        await Banner.deleteOne({ _id: req.params.id });
        res.json({ message: 'Banner removed' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete banner' });
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

// @route   GET /api/shop/orders/:id/invoice
// @desc    Generate a GST-compliant Tax Invoice (HTML)
// @access  Private (Owner or Buyer)
router.get('/orders/:id/invoice', protect, async (req, res) => {
    try {
        const order = await ShopOrder.findById(req.params.id)
            .populate('buyer', 'name phone address')
            .populate('owner', 'name businessName phone address gstNumber licenseNumber');

        if (!order) return res.status(404).send('<h1>Order not found</h1>');

        // Authorization check
        const isBuyer = order.buyer._id.toString() === req.user.id;
        const isOwner = order.owner._id.toString() === req.user.id;
        if (!isBuyer && !isOwner && req.user.role !== 'admin') {
            return res.status(401).send('<h1>Not authorized</h1>');
        }

        const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const time = new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const invoiceNo = `INV-${new Date().getFullYear()}-${order._id.toString().slice(-6).toUpperCase()}`;

        // Number to Words Helper
        function numberToWords(num) {
            const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
            const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
            if ((num = num.toString()).length > 9) return 'overflow';
            let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
            if (!n) return '';
            let str = '';
            str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' Crore ' : '';
            str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' Lakh ' : '';
            str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' Thousand ' : '';
            str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + ' Hundred ' : '';
            str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
            return str + ' Rupees Only';
        }

        const itemsHtml = order.items.map((it, idx) => `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${it.name}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${it.hsnCode || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${it.quantity} ${it.unit}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${((it.taxableAmount || it.price * it.quantity) / it.quantity).toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹0.00</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${(it.taxableAmount || it.price * it.quantity).toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${(it.cgstPercent || 0) + (it.sgstPercent || 0)}%</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${(it.price * it.quantity).toFixed(2)}</td>
            </tr>
        `).join('');

        const totalTaxable = order.items.reduce((sum, it) => sum + (it.taxableAmount || (it.price * it.quantity)), 0);
        const totalGst = order.items.reduce((sum, it) => sum + (it.gstAmount || 0), 0);

        // Embed Logo as Base64 for reliability
        let logoBase64 = '';
        try {
            const logoPath = path.join(__dirname, '../uploads/logo.png');
            if (fs.existsSync(logoPath)) {
                logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
            }
        } catch (e) {
            console.error('Logo base64 error:', e);
        }

        const timestamp = new Date().toISOString().replace(/[:.-]/g, '').slice(8, 14);
        const fileName = `Tax_Invoice_${order._id.toString().slice(-6)}_${timestamp}.html`;
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'text/html');

        // Payment Method Display Logic (Bhai, Udhaar wala system yahan handle kar rahe hain)
        let paymentMethodDisplay = order.paymentMode === 'WALLET' ? 'NexCard Wallet' : 'Cash on Delivery';
        if (order.orderType === 'POS') {
            const methods = [];
            const { cash, wallet, due } = order.paymentBreakdown || {};
            if (cash > 0) methods.push(`Cash (₹${cash})`);
            if (wallet > 0) methods.push(`NexCard Wallet (₹${wallet})`);
            if (due > 0) methods.push(`Agri-Credit / Udhaar (₹${due})`);
            paymentMethodDisplay = methods.length > 0 ? methods.join(' + ') : 'POS Sale';
        }

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tax Invoice - ${order._id}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; margin: 0; padding: 20px; }
        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); font-size: 13px; line-height: 24px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .header img { height: 50px; }
        .header .title { text-align: right; }
        .header .title h1 { margin: 0; color: #16A34A; font-size: 24px; }
        .header .title p { margin: 0; font-size: 10px; color: #666; font-weight: bold; }
        .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .info-col { width: 48%; }
        .info-col h3 { font-size: 12px; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 5px; text-transform: uppercase; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f9fafb; font-weight: bold; text-transform: uppercase; font-size: 11px; }
        .summary { display: flex; justify-content: flex-end; }
        .summary-table { width: 250px; }
        .summary-table tr td { padding: 5px 0; border-bottom: 1px solid #eee; }
        .summary-table tr .label { text-align: left; font-weight: bold; }
        .summary-table tr .value { text-align: right; }
        .summary-table tr.grand-total { font-size: 16px; color: #16A34A; font-weight: bold; }
        .footer { margin-top: 40px; border-top: 2px solid #eee; padding-top: 20px; font-size: 11px; color: #777; }
        .signature { margin-top: 50px; text-align: right; }
        .signature-box { display: inline-block; border-bottom: 1px solid #333; width: 200px; text-align: center; }
        @media print { .invoice-box { box-shadow: none; border: none; } }
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div>
                ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height: 60px;">` : '<h2>KRISHINEX</h2>'}
                <div style="margin-top: 10px;">
                    <strong style="font-size: 16px; color: #111;">${order.owner.businessName || order.owner.name}</strong><br>
                    ${order.owner.address}<br>
                    Contact: ${order.owner.phone}<br>
                    GSTIN: ${order.owner.gstNumber || 'N/A'}<br>
                    License: ${order.owner.licenseNumber || 'N/A'}
                </div>
            </div>
            <div class="title">
                <h1>TAX INVOICE</h1>
                <p>Powered By: Knexis Technologies Pvt. Ltd.</p>
                <div style="margin-top: 20px; font-size: 12px; text-align: right;">
                    <strong>Invoice No:</strong> ${invoiceNo}<br>
                    <strong>Order ID:</strong> KNEX-ORD-${order._id.toString().slice(-6).toUpperCase()}<br>
                    <strong>Date & Time:</strong> ${date}, ${time}
                </div>
            </div>
        </div>

        <div class="info-section">
            <div class="info-col">
                <h3>Billed To (Farmer Info)</h3>
                <strong>${order.buyer.name}</strong><br>
                Phone: ${order.buyer.phone}<br>
                ${order.buyer.address}
            </div>
            <div class="info-col" style="text-align: right;">
                <h3>Payment & Delivery</h3>
                Payment Mode: <strong>${paymentMethodDisplay}</strong><br>
                Status: <strong>${order.status}</strong>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px;">S.No</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Item Name</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">HSN</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Qty</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Rate</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Disc.</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Taxable</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">GST%</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="summary">
            <table class="summary-table">
                <tr>
                    <td class="label">Total Taxable:</td>
                    <td class="value">₹${totalTaxable.toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="label">Total GST (CGST+SGST):</td>
                    <td class="value">₹${totalGst.toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="label">Delivery Charges:</td>
                    <td class="value">₹0.00</td>
                </tr>
                <tr class="grand-total">
                    <td class="label">Grand Total:</td>
                    <td class="value">₹${order.totalAmount.toFixed(2)}</td>
                </tr>
            </table>
        </div>

        <div style="margin-top: 10px;">
            <strong>Amount in Words:</strong><br>
            ${numberToWords(Math.round(order.totalAmount))}
        </div>

        <div class="footer">
            <strong>Terms & Conditions:</strong>
            <ul>
                <li>Returns accepted within 7 days for unsealed items only.</li>
                <li>Subject to local jurisdiction.</li>
                <li>This is a computer-generated invoice and does not require a physical signature.</li>
            </ul>
        </div>

        <div class="signature">
            <div class="signature-box">Authorized Signatory</div>
            <p style="font-size: 10px; margin-top: 5px;">(Digital Stamp of ${order.owner.businessName || order.owner.name})</p>
        </div>
        <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
    </div>
</body>
</html>
        `;
        res.send(html);
    } catch (error) {
        console.error('Invoice generation error:', error);
        res.status(500).send('<h1>Error generating invoice</h1>');
    }
});

// @route   GET /api/shop/orders/:id/shipping-label
// @desc    Generate a Shipping Label (4x6 thermal layout)
// @access  Private (Owner or Admin)
router.get('/orders/:id/shipping-label', protect, async (req, res) => {
    try {
        const order = await ShopOrder.findById(req.params.id)
            .populate('buyer', 'name phone address village block district pincode')
            .populate('owner', 'name businessName phone address gstNumber licenseNumber');

        if (!order) return res.status(404).send('<h1>Order not found</h1>');

        // Authorization check (Only owner or admin)
        const isOwner = order.owner._id.toString() === req.user.id;
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(401).send('<h1>Not authorized</h1>');
        }

        const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const displayId = `KNEX-ORD-${order._id.toString().slice(-6).toUpperCase()}`;
        const awbNo = `AWB-${order._id.toString().slice(-8).toUpperCase()}`;
        
        // Mask Phone: 98765*****
        const maskPhone = (p) => p ? p.substring(0, 5) + '*****' : 'N/A';
        const buyerPhone = maskPhone(order.buyer.phone || order.deliveryAddress.phone);
        
        // Calculate dummy weight: 0.5kg per item minimum
        const totalQty = order.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
        const weight = (totalQty * 0.5 < 1 ? 1 : totalQty * 0.5).toFixed(1) + ' KG';

        const collectableAmount = order.paymentMode === 'CASH' ? `₹ ${order.totalAmount.toFixed(2)}` : '₹ 0.00';
        const paymentType = order.paymentMode === 'CASH' ? 'CASH ON DELIVERY (COD)' : 'PREPAID';

        // Embed Logo as Base64 for reliability
        let logoBase64 = '';
        try {
            const logoPath = path.join(__dirname, '../uploads/logo.png');
            if (fs.existsSync(logoPath)) {
                logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
            }
        } catch (e) { }

        const timestamp = new Date().toISOString().replace(/[:.-]/g, '').slice(8, 14);
        const fileName = `Shipping_Label_${order._id.toString().slice(-6)}_${timestamp}.html`;
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'text/html');

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Shipping Label - ${order._id}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Courier', 'Courier New', Courier, monospace; margin: 0; padding: 0; background: #fff; width: 4in; height: 6in; color: #000; }
        
        .main-container { width: 4in; height: 6in; border: 3px solid #000; padding: 10px; display: flex; flex-direction: column; overflow: hidden; }
        
        table { width: 100%; border-collapse: collapse; border-spacing: 0; }
        td { border: 1px solid #000; padding: 5px; vertical-align: top; }
        
        .logo-header { border-bottom: 3px solid #000; padding-bottom: 5px; }
        .logo-text { font-size: 24px; font-weight: 900; color: #16A34A; }
        .courier-info { text-align: right; font-size: 10px; font-weight: bold; }
        
        .barcode-section { text-align: center; padding: 10px 0; border-bottom: 3px solid #000; }
        .barcode-img { width: 120px; height: 120px; }
        .awb-no { font-size: 18px; font-weight: 900; margin-top: 5px; }
        
        .label-text { font-size: 9px; font-weight: 900; text-decoration: underline; margin-bottom: 2px; display: block; }
        .address-val { font-size: 11px; line-height: 1.2; font-weight: bold; }
        .name-val { font-size: 13px; font-weight: 900; display: block; margin-bottom: 3px; }
        
        .info-cell { width: 50%; height: 50px; }
        .info-label { font-size: 9px; font-weight: bold; color: #333; }
        .info-data { font-size: 13px; font-weight: 900; }
        
        .payment-box { text-align: center; padding: 15px 5px; border-top: 3px solid #000; }
        .collect-val { font-size: 24px; font-weight: 900; margin-top: 5px; }
        
        .black-banner { background: #000; color: #fff; text-align: center; padding: 8px; font-size: 16px; font-weight: 900; text-transform: uppercase; margin-top: auto; }
        
        @page { size: 4in 6in; margin: 0; }
        @media print { body { width: 4in; height: 6in; } .main-container { border: 3px solid #000; } }
    </style>
</head>
<body>
    <div class="main-container">
        <!-- Header -->
        <table style="border: none;">
            <tr style="border: none;">
                <td style="border: none; width: 60%;" class="logo-header">
                    ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; vertical-align: middle; margin-right: 5px;">` : ''}
                    <span class="logo-text" style="font-size: 20px; vertical-align: middle;">KRISHINEX</span>
                </td>
                <td style="border: none; text-align: right;" class="logo-header">
                    <span class="courier-info">Courier: KSP Direct<br>Standard Surface</span>
                </td>
            </tr>
        </table>

        <!-- Barcode Area -->
        <div class="barcode-section">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order._id}" class="barcode-img" alt="QR">
            <div class="awb-no">${awbNo}</div>
        </div>

        <!-- Address Grid -->
        <table style="flex: 1;">
            <tr>
                <td style="width: 60%;">
                    <span class="label-text">DELIVER TO:</span>
                    <div class="address-val">
                        <span class="name-val">${order.deliveryAddress.name || order.buyer.name}</span>
                        Phone: ${buyerPhone}<br>
                        ${order.deliveryAddress.fullAddress || order.buyer.address}
                    </div>
                </td>
                <td style="width: 40%; background: #f0f0f0;">
                    <span class="label-text">RETURN/FROM:</span>
                    <div class="address-val" style="font-size: 9px;">
                        <span style="font-weight: 900;">${order.owner.businessName || order.owner.name}</span>
                        KSP-${order.owner._id.toString().slice(-5).toUpperCase()}<br>
                        ${order.owner.address.substring(0, 80)}...
                    </div>
                </td>
            </tr>
        </table>

        <!-- Info Grid -->
        <table>
            <tr>
                <td class="info-cell">
                    <div class="info-label">ORDER ID:</div>
                    <div class="info-data">${displayId}</div>
                </td>
                <td class="info-cell">
                    <div class="info-label">DATE:</div>
                    <div class="info-data">${date}</div>
                </td>
            </tr>
            <tr>
                <td class="info-cell">
                    <div class="info-label">WEIGHT:</div>
                    <div class="info-data">${weight}</div>
                </td>
                <td class="info-cell">
                    <div class="info-label">PAYMENT:</div>
                    <div class="info-data">${paymentType}</div>
                </td>
            </tr>
        </table>

        <!-- Payment Area -->
        <div class="payment-box">
            <div class="info-label">COLLECT FROM CUSTOMER (COD/TAXABLE):</div>
            <div class="collect-val">${collectableAmount}</div>
        </div>

        <div class="black-banner">
            ${order.paymentMode === 'CASH' ? 'CASH ON DELIVERY' : 'PREPAID - DO NOT COLLECT'}
        </div>
        
        <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
    </div>
</body>
</html>
        `;
        res.send(html);
    } catch (error) {
        console.error('Shipping Label generation error:', error);
        res.status(500).send('<h1>Error generating Shipping Label</h1>');
    }
});

// --- POS (POINT OF SALE) SYSTEM ROUTES ---

// @route   GET /api/shop/pos/farmer/:identifier
// @desc    Search farmer by Phone or NexCard Number
// @access  Private (Shop Partner Only)
router.get('/pos/farmer/:identifier', protect, async (req, res) => {
    try {
        const { identifier } = req.params;
        // Search by phone or cardNumber
        const farmer = await User.findOne({
            role: 'farmer',
            $or: [
                { phone: identifier },
                { cardNumber: identifier }
            ]
        }).select('name phone profilePhotoUrl walletBalance creditLimit creditUsed status');

        if (!farmer) {
            return res.status(404).json({ error: 'Farmer not found' });
        }

        if (farmer.status !== 'approved') {
            return res.status(403).json({ error: 'Farmer account is not approved' });
        }

        const availableAgriCredit = (farmer.creditLimit || 0) - (farmer.creditUsed || 0);

        res.json({
            _id: farmer._id,
            name: farmer.name,
            phone: farmer.phone,
            avatarUri: farmer.profilePhotoUrl,
            walletBalance: farmer.walletBalance || 0,
            creditLimit: farmer.creditLimit || 0,
            creditUsed: farmer.creditUsed || 0,
            availableAgriCredit: availableAgriCredit < 0 ? 0 : availableAgriCredit,
            status: farmer.status
        });
    } catch (error) {
        console.error('POS Farmer Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// @route   POST /api/shop/pos/create-order
// @desc    Initiate a POS order and send OTP
// @access  Private (Shop Partner Only)
router.post('/pos/create-order', protect, async (req, res) => {
    try {
        const { farmerId, items, paymentBreakdown } = req.body;
        const shopId = req.user.id;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items selected' });
        }

        const farmer = await User.findById(farmerId);
        if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

        // Calculate total and validate stock
        let totalAmount = 0;
        const processedItems = await Promise.all(items.map(async it => {
            if (it.itemRef) {
                const dbItem = await Item.findById(it.itemRef);
                if (!dbItem) throw new Error(`Item ${it.name} not found`);
                
                const price = it.price || dbItem.price;
                totalAmount += price * it.quantity;

                const cgst = dbItem.cgstPercent || 0;
                const sgst = dbItem.sgstPercent || 0;
                const gstTotalPercent = cgst + sgst;
                const totalPrice = price * it.quantity;
                
                // Inclusive Tax Calculation
                const taxableAmount = totalPrice / (1 + (gstTotalPercent / 100));
                const gstAmount = totalPrice - taxableAmount;

                return {
                    itemRef: it.itemRef,
                    name: it.name,
                    price: price,
                    quantity: it.quantity,
                    unit: it.unit,
                    variantLabel: it.variantLabel,
                    hsnCode: dbItem.hsnCode || '',
                    cgstPercent: cgst,
                    sgstPercent: sgst,
                    taxableAmount: Math.round(taxableAmount * 100) / 100,
                    gstAmount: Math.round(gstAmount * 100) / 100
                };
            } else {
                // Manual Item (Bhai, bina inventory card ke ye item add ho raha hai)
                const price = it.price || 0;
                totalAmount += price * it.quantity;
                return {
                    itemRef: null,
                    name: it.name,
                    price: price,
                    quantity: it.quantity,
                    unit: it.unit || 'Unit',
                    hsnCode: 'MANUAL',
                    cgstPercent: 0,
                    sgstPercent: 0,
                    taxableAmount: price * it.quantity,
                    gstAmount: 0
                };
            }
        }));

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        const order = new ShopOrder({
            buyer: farmerId,
            owner: shopId,
            items: processedItems,
            totalAmount,
            orderType: 'POS',
            paymentBreakdown,
            posOtp: otp,
            posOtpExpires: otpExpires,
            status: 'NEW', // Becomes DELIVERED after OTP
            deliveryAddress: {
                name: farmer.name,
                phone: farmer.phone,
                fullAddress: 'WALK-IN POS'
            }
        });

        await order.save();

        // SEND OTP NOTIFICATION TO FARMER (Bhai, ab kisan ke phone pe otp jayega)
        await sendNotification(farmerId, {
            title: 'POS Verification Code',
            messageEn: `Your POS verification OTP is ${otp}. Valid for 10 minutes.`,
            messageHi: `आपका POS वेरिफिकेशन OTP ${otp} है। यह 10 मिनट के लिए वैध है।`,
            type: 'system',
            refId: order._id.toString()
        }).catch(err => console.error('Failed to send POS-OTP notification:', err));

        console.log(`[POS-OTP] Order #${order._id} for ${farmer.name}: ${otp}`);

        res.status(201).json({
            message: 'OTP sent to farmer',
            orderId: order._id
        });
    } catch (error) {
        console.error('POS Create Order error:', error);
        res.status(500).json({ error: error.message || 'Failed to initiate POS order' });
    }
});

// @route   POST /api/shop/pos/verify-otp
// @desc    Verify OTP and finalize POS transaction
// @access  Private (Shop Partner Only)
router.post('/pos/verify-otp', protect, async (req, res) => {
    try {
        const { orderId, otp, recoveryAmount, farmerId } = req.body;

        // --- BRANCH: MANUAL RECOVERY ---
        // Bhai, agr shop partner seedha recover button dabata hai toh bina order ke Ledger update hoga
        if (orderId === 'MANUAL_RECOVERY') {
            if (!recoveryAmount || !farmerId) {
                return res.status(400).json({ error: 'Farmer ID and Recovery Amount are required' });
            }

            await Ledger.create({
                farmerId: farmerId,
                shopId: req.user.id,
                amount: Number(recoveryAmount),
                method: 'RECOVERY',
                type: 'PAYMENT',
                note: 'Manual Recovery (Cash)'
            });

            console.log(`[LEDGER] Manual Recovery of ₹${recoveryAmount} recorded for Farmer: ${farmerId}`);
            return res.json({ success: true, message: 'Recovery recorded successfully' });
        }

        // --- BRANCH: REGULAR POS ORDER ---
        const order = await ShopOrder.findById(orderId).populate('buyer items.itemRef');

        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.isPosVerified) return res.status(400).json({ error: 'Order already finalized' });

        // Verify OTP
        if (order.posOtp !== otp || new Date() > order.posOtpExpires) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        const farmer = await User.findById(order.buyer);
        const shopPartner = await User.findById(order.owner);
        const adminUser = await User.findOne({ role: 'admin' });

        const { cash, wallet, due, shopDue } = order.paymentBreakdown || {};
        const totalSaleAmount = (cash || 0) + (wallet || 0) + (due || 0) + (shopDue || 0);
        const platformCreditPortion = (wallet || 0) + (due || 0);

        // 1. Validate Payment Capacity
        const availableAgriCredit = (farmer.creditLimit || 0) - (farmer.creditUsed || 0);
        
        if (wallet > (farmer.walletBalance || 0)) {
            return res.status(400).json({ error: `Insufficient NexCard Wallet balance. Available: ₹${farmer.walletBalance}` });
        }
        if (due > availableAgriCredit) {
            return res.status(400).json({ error: `Insufficient Agri-Credit limit. Available: ₹${availableAgriCredit}` });
        }

        // 2. Fetch Shop Commission Settings
        const settings = await Settings.getSettings();
        const shopCommRate = settings.commissions?.shop || 0;
        const totalCommissionAmount = (totalSaleAmount * shopCommRate) / 100;

        // 3. Digital Financial Transfers (Liquidity Flow)
        // Admin Pays Shop Partner for the credit portion (wallet + due) - Total Commission
        // Bhai, agr commission payout se jyada hua toh shop wallet se ktega.
        const netPayout = platformCreditPortion - totalCommissionAmount;

        if (adminUser) {
            // Deduct total credit provided by Admin
            adminUser.walletBalance = (adminUser.walletBalance || 0) - platformCreditPortion;
            // Add commission earned by Admin
            adminUser.walletBalance += totalCommissionAmount;
            await adminUser.save();

            // Create Admin Commission Record
            await Transaction.create({
                transactionId: `POS-COMM-${order._id}-${Date.now()}`,
                recipient: adminUser._id,
                module: 'Shop',
                amount: totalCommissionAmount,
                type: 'Credit',
                paymentMode: 'NexCard Wallet',
                status: 'Completed',
                referenceId: order._id,
                note: `Commission (${shopCommRate}%) on POS Sale #${order._id} (Volume: ₹${totalSaleAmount})`
            });
        }

        if (shopPartner) {
            // Adjust shop partner's wallet: Credit portion payout - total platform commission
            shopPartner.walletBalance = (shopPartner.walletBalance || 0) + netPayout;
            await shopPartner.save();

            // Create Shop Payout Record
            await Transaction.create({
                transactionId: `POS-PAY-${order._id}-${Date.now()}`,
                recipient: shopPartner._id,
                module: 'Shop',
                amount: Math.abs(netPayout),
                type: netPayout >= 0 ? 'Credit' : 'Debit',
                paymentMode: 'NexCard Wallet',
                status: 'Completed',
                referenceId: order._id,
                note: `POS Sale Payout #${order._id} (Net Payout of ₹${platformCreditPortion} less ₹${totalCommissionAmount} Platform Commission)`
            });
        }

        // 4. Update Farmer Balances
        if (wallet > 0) {
            farmer.walletBalance = (farmer.walletBalance || 0) - wallet;
            
            // Log NexCard Wallet Transaction for Farmer
            await Transaction.create({
                transactionId: `POS-FARMER-WLT-${order._id}-${Date.now()}`,
                recipient: farmer._id,
                module: 'Shop',
                amount: wallet,
                type: 'Debit',
                paymentMode: 'NexCard Wallet',
                status: 'Completed',
                referenceId: order._id,
                note: `Deducted for POS Purchase #${order._id} at ${shopPartner.name}`
            });
        }
        if (due > 0) {
            farmer.creditUsed = (farmer.creditUsed || 0) + due;
        }
        await farmer.save();

        // 4b. Dynamic Auto-Repayment (If farmer has debt and wallet balance, sweep it)
        const { processAutoRepayment } = require('../services/repaymentService');
        await processAutoRepayment(farmer._id, order._id);

        // 6. Deduct Inventory Stock (Bhai, manual items ko skip karo yahan)
        for (const itemData of order.items) {
            if (!itemData.itemRef) continue; // Skip if no reference to inventory

            const item = itemData.itemRef; // Populated from Schema
            const qty = itemData.quantity;

            if (itemData.variantLabel) {
                 const vIdx = item.variants.findIndex(v => v.label === itemData.variantLabel);
                 if (vIdx !== -1) {
                     item.variants[vIdx].stockQty = Math.max(0, (item.variants[vIdx].stockQty || 0) - qty);
                     item.stockQty = item.variants.reduce((sum, v) => sum + (v.stockQty || 0), 0);
                 }
            } else {
                item.stockQty = Math.max(0, (item.stockQty || 0) - qty);
            }
            await item.save();
            
            // Bhai, check level for POS stock deduction
            checkAndNotifyLowStock(item._id).catch(() => {});
        }

        // 6. Create Ledger Entries (Bahi-Khata)
        if (cash > 0) {
            await Ledger.create({
                shopId: order.owner,
                farmerId: order.buyer,
                orderId: order._id,
                amount: cash,
                type: 'PAYMENT',
                method: 'CASH',
                note: 'POS Cash Sale'
            });
        }
        if (wallet > 0) {
            await Ledger.create({
                shopId: order.owner,
                farmerId: order.buyer,
                orderId: order._id,
                amount: wallet,
                type: 'PAYMENT',
                method: 'WALLET',
                note: 'POS Credit/Wallet Sale'
            });
        }
        if (due > 0) {
            await Ledger.create({
                shopId: order.owner,
                farmerId: order.buyer,
                orderId: order._id,
                amount: due,
                type: 'PAYMENT', // Admin already paid the shop, so it's not a 'debt' for the shop partner
                method: 'DUE',
                note: 'POS Agri-Credit Sale (Paid by Admin)'
            });
        }

        if (shopDue > 0) {
            await Ledger.create({
                shopId: order.owner,
                farmerId: order.buyer,
                orderId: order._id,
                amount: shopDue,
                type: 'DUE',
                method: 'SHOP_DUE',
                note: 'POS Shop Udhaar (Personal)'
            });
        }

        // 4. Finalize Order Status
        order.isPosVerified = true;
        order.status = 'DELIVERED';
        await order.save();

        res.json({ message: 'Transaction successful', order });
    } catch (error) {
        console.error('POS OTP Verify error:', error);
        res.status(500).json({ error: 'Finalization failed' });
    }
});

// @route   GET /api/shop/ledger/dashboard
// @desc    Get ledger statistics for the shop
router.get('/ledger/dashboard', protect, async (req, res) => {
    try {
        const shopId = req.user.id;
        const { startDate, endDate } = req.query;
        
        let query = { shopId: new mongoose.Types.ObjectId(shopId) };
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const logs = await Ledger.find(query);

        const stats = {
            totalCash: 0,
            totalWallet: 0,
            totalDue: 0, // Shop Udhaar (Personal)
            totalAgriCredit: 0, // Agri-Credit (Platform)
            totalRecovery: 0
        };

        logs.forEach(log => {
            if (log.method === 'CASH') stats.totalCash += log.amount;
            if (log.method === 'WALLET') stats.totalWallet += log.amount;
            if (log.method === 'DUE') stats.totalAgriCredit += log.amount;
            
            // Bhai, sirf wahi udhaar gino jo shop ki apni zimmedari (SHOP_DUE) hai
            if (log.method === 'SHOP_DUE') stats.totalDue += log.amount;
            
            // Bhai, sirf wahi recovery gino jo shop ne khud ki hai (Manual Recovery)
            if (log.method === 'RECOVERY' && !log.note?.toLowerCase().includes('auto')) {
                stats.totalRecovery += log.amount;
                stats.totalDue -= log.amount;
            }
        });

        res.json(stats);
    } catch (error) {
        console.error('Ledger Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch ledger stats' });
    }
});

// @route   GET /api/shop/ledger/history
// @desc    Get detailed transaction history for the shop
router.get('/ledger/history', protect, async (req, res) => {
    try {
        const shopId = req.user.id;
        const { startDate, endDate, method, page = 1, limit = 50 } = req.query;

        let query = { shopId };
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        if (method && method !== 'ALL') {
            query.method = method;
        }

        const logs = await Ledger.find(query)
            .populate('farmerId', 'name phone')
            .populate({
                path: 'orderId',
                populate: {
                    path: 'items.productId',
                    select: 'name price image'
                }
            })
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// @route   POST /api/shop/ledger/remind
// @desc    Send payment reminder to a farmer
router.get('/ledger/dues', protect, async (req, res) => {
    try {
        const shopId = req.user.id;
        // Group ledger by farmer to find net due
        const dues = await Ledger.aggregate([
            { $match: { shopId: new mongoose.Types.ObjectId(shopId) } },
            {
                $group: {
                    _id: '$farmerId',
                    netDue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$method', 'SHOP_DUE'] }, '$amount',
                                { 
                                    $cond: [
                                        { 
                                            $and: [
                                                { $eq: ['$method', 'RECOVERY'] },
                                                { $not: [{ $regexMatch: { input: '$note', regex: /auto/i } }] }
                                            ]
                                        }, 
                                        { $multiply: ['$amount', -1] }, 
                                        0
                                    ] 
                                }
                            ]
                        }
                    }
                }
            },
            { $match: { netDue: { $gt: 0 } } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'farmer'
                }
            },
            { $unwind: '$farmer' }
        ]);

        res.json(dues);
    } catch (error) {
        console.error('Fetch Dues error:', error);
        res.status(500).json({ error: 'Failed to fetch dues' });
    }
});

// @route   GET /api/shop/ledger/dues/:farmerId/details
// @desc    Get detailed debt history for a specific farmer
router.get('/ledger/dues/:farmerId/details', protect, async (req, res) => {
    try {
        const { farmerId } = req.params;
        const shopId = req.user.id;

        const details = await Ledger.find({
            shopId,
            farmerId,
            method: { $in: ['SHOP_DUE', 'RECOVERY'] }
        })
        .sort({ createdAt: -1 });

        res.json(details);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch farmer due details' });
    }
});

router.post('/ledger/remind', protect, async (req, res) => {
    try {
        const { farmerId, amount } = req.body;
        console.log(`[LEDGER-REMIND] Request received for Farmer: ${farmerId}, Amount: ${amount}`);
        const shop = await User.findById(req.user.id).select('name');
        const farmer = await User.findById(farmerId).select('name');

        if (!farmer || !shop) {
            return res.status(404).json({ error: 'Farmer or Shop not found' });
        }

        const shopName = shop.name || 'Shop Partner';
        const farmerName = farmer.name || 'Farmer';

        const messageHi = `नमस्ते ${farmerName}, ${shopName} पर आपका ₹${amount} का बकाया है। कृपया समय पर भुगतान करें।`;
        const messageEn = `Hi ${farmerName}, you have a pending due of ₹${amount} at ${shopName}. Please clear it soon.`;

        await sendNotification(farmerId, {
            title: 'Payment Reminder 📲',
            messageEn,
            messageHi,
            type: 'PAYMENT_REMINDER',
            refId: req.user.id,
            data: { amount: amount.toString(), shopId: req.user.id }
        });

        console.log(`[LEDGER-REMIND] Notification sent successfully to Farmer: ${farmerId}`);
        res.json({ success: true, message: 'Reminder sent successfully' });
    } catch (error) {
        console.error('Reminder error:', error);
        res.status(500).json({ error: error.message });
    }
});

// @route   PATCH /api/shop/location
// @desc    Update shop partner's location (Lat/Lng)
// @access  Private (Shop Partner Only)
router.patch('/location', protect, async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: 'Latitude and Longitude are required' });
        }

        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'shop') {
            return res.status(403).json({ error: 'Only shop partners can update shop location' });
        }

        user.location = {
            type: 'Point',
            coordinates: [Number(longitude), Number(latitude)] // [lng, lat]
        };

        await user.save();
        res.json({ message: 'Shop location updated successfully', location: user.location });
    } catch (error) {
        console.error('Update shop location error:', error);
        res.status(500).json({ error: 'Failed to update shop location' });
    }
});

// TEMPORARY FIX ROUTE - DO NOT USE IN PRODUCTION
router.get('/temp-fix-ledger', protect, async (req, res) => {
    try {
        const result = await Ledger.updateMany(
            { method: 'DUE', type: 'DUE', note: /POS/ },
            { $set: { type: 'PAYMENT', note: 'POS Agri-Credit (Paid by Admin)' } }
        );
        
        // Fix RECOVERY entries to be PAYMENT type
        const recoveryResult = await Ledger.updateMany(
            { method: 'RECOVERY', type: 'DUE' },
            { $set: { type: 'PAYMENT' } }
        );

        res.json({ 
            message: 'Fixed ledger data', 
            posFixed: result.modifiedCount,
            recoveryFixed: recoveryResult.modifiedCount
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
