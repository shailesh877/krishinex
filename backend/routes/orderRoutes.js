const express = require('express');
const router = express.Router();
const { sendNotification } = require('../services/notificationService');
const Order = require('../models/Order');
const SellRequest = require('../models/SellRequest');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const { protect } = require('../middleware/authMiddleware');

// Helper to parse quantity and always try to get Quintal value
const parseQuantityInQuintals = (qtyStr) => {
    if (!qtyStr) return 0;
    const str = String(qtyStr);
    
    // Look for (XX Quintal) pattern first
    const quintalMatch = str.match(/\(?([\d.]+)\s*Quintal\)?/i);
    if (quintalMatch) {
        return parseFloat(quintalMatch[1]) || 0;
    }
    
    // Fallback: Check if it just says Quintal
    if (str.toLowerCase().includes('quintal')) {
        return parseFloat(str) || 0;
    }
    
    // Fallback: If it says KG, convert to Quintal
    if (str.toLowerCase().includes('kg')) {
        return (parseFloat(str) || 0) / 100;
    }
    
    // Last resort
    return parseFloat(str) || 0;
};

const parsePriceInQuintals = (priceStr) => {
    if (!priceStr) return 0;
    const str = String(priceStr);
    const matches = str.match(/\d+(\.\d+)?/g);
    if (!matches) return 0;
    const prices = matches.map(m => parseFloat(m));
    const qmatch = str.match(/₹?(\d+(\.\d+)?)\s*\/\s*Quintal/i);
    if (qmatch) return parseFloat(qmatch[1]) || 0;
    if (prices.length > 1) return Math.max(...prices);
    if (str.toLowerCase().includes('/ kg') && prices.length === 1) return prices[0] * 100;
    return prices[0] || 0;
};

// @route   POST /api/orders
// @desc    Buyer creates a new order request
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { crop, quantity, variety, location, note } = req.body;

        if (!crop || !quantity || !location) {
            return res.status(400).json({ error: 'Crop, quantity, and location are required.' });
        }

        const order = await Order.create({
            buyer: req.user.id,
            crop,
            quantity,
            variety: variety || '',
            location,
            note: note || ''
        });

        // Auto-notify buyer
        await sendNotification(
            req.user.id,
            'Order Request Submitted',
            `Your request for ${quantity} qtl of ${crop} at ${location} has been submitted. We'll update you soon.`,
            `${location} पर ${quantity} क्विंटल ${crop} की आपकी रिक्वेस्ट भेज दी गई है। हम जल्द अपडेट देंगे।`,
            'order',
            order._id.toString()
        ).catch(() => { }); // silent fail

        res.status(201).json({
            message: 'Order request created successfully',
            order
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// @route   GET /api/orders/my/stats
// @desc    Get total order count + total spend for this buyer
// @access  Private
router.get('/my/stats', protect, async (req, res) => {
    try {
        const orders = await Order.find({ buyer: req.user.id });
        const totalOrdersCount = orders.length;
        const completedOrders = orders.filter(o => o.status === 'completed' || o.assignedStatus === 'delivered');
        
        const totalAmount = completedOrders.reduce((sum, o) => {
            const qty = parseQuantityInQuintals(o.quantity);
            const price = o.pricePerQuintal || 0;
            return sum + (qty * price);
        }, 0);

        res.json({ 
            totalOrders: totalOrdersCount, 
            totalAmount: Math.round(totalAmount), 
            completedOrders: completedOrders.length 
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// @route   GET /api/orders/equipment/stats
// @desc    Get total assigned orders + today's assigned orders for Equipment
// @access  Private
router.get('/equipment/stats', protect, async (req, res) => {
    try {
        const orders = await Order.find({ assignedTo: req.user.id });
        const totalBookings = orders.length;

        // Count today's orders
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayBookings = orders.filter(o => new Date(o.createdAt) >= startOfDay).length;

        res.json({ totalBookings, todayBookings });
    } catch (error) {
        console.error('Equipment stats error:', error);
        res.status(500).json({ error: 'Failed to fetch equipment stats' });
    }
});

// @route   GET /api/orders/assigned
// @desc    Get orders assigned to this user (Farmer/Partner)
// @access  Private
router.get('/assigned', protect, async (req, res) => {
    try {
        const orders = await Order.find({ assignedTo: req.user.id })
            .populate('buyer', 'name phone')
            .populate('mandi', 'name location')
            .sort({ createdAt: -1 });

        const settings = await Settings.getSettings();
        const commissionRate = settings.commissions?.buyerTrading || 0;

        // Map to match frontend AssignedOrder type
        const mappedOrders = orders.map(o => {
            const amount = o.amount || (parseQuantityInQuintals(o.quantity) * (o.pricePerQuintal || 0));
            const rateToUse = o.commissionRate || commissionRate;
            const commission = o.commission || (amount * rateToUse) / 100;
            
            console.log(`[ORDER-DEBUG] OrderID=${o._id}, Amount=${amount}, Rate=${rateToUse}, Comm=${commission}`);
            
            return {
                _id: o._id.toString(),
                farmerName: o.buyer?.name || o.farmerName || 'Trader',
                farmerMobile: o.buyer?.phone || o.farmerMobile || '',
                village: o.village || o.mandi?.name || o.location,
                district: o.district || '',
                state: o.state || '',
                crop: o.crop,
                quantity: o.quantity,
                pricePerQuintal: o.pricePerQuintal || 0,
                pricePerKg: o.pricePerKg || (o.pricePerQuintal ? o.pricePerQuintal / 100 : 0),
                amount: amount,
                commission: commission,
                commissionRate: rateToUse,
                assignedStatus: o.assignedStatus || o.status || 'new',
                cancelReason: o.cancelReason,
                sellRequestId: o.sellRequestId,
                createdAt: o.createdAt
            };
        });

        res.json(mappedOrders);
    } catch (error) {
        console.error('Fetch assigned orders error:', error);
        res.status(500).json({ error: 'Failed to fetch assigned orders' });
    }
});

// @route   PATCH /api/orders/:id/assigned-status
// @desc    Buyer updates their action on an assigned order (ok / delivered / cancelled)
// @access  Private
router.patch('/:id/assigned-status', protect, async (req, res) => {
    try {
        const { assignedStatus, cancelReason, quantity, pricePerQuintal, otp } = req.body;
        console.log(`[KHETIFY-ASSIGN-STATUS] REQ_ID=${req.params.id} STATUS=${assignedStatus}`);
        console.log(`[KHETIFY-ASSIGN-STATUS] BODY:`, JSON.stringify(req.body, null, 2));

        const validStatuses = ['new', 'ok', 'delivered', 'cancelled'];
        if (!validStatuses.includes(assignedStatus)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Fetch order once at the start 
        const order = await Order.findOne({ _id: req.params.id, assignedTo: req.user.id }).populate('sellRequestId');
        if (!order) {
            return res.status(404).json({ error: 'Order not found or not assigned to you' });
        }

        // 1. Handle Quantity/Price Modifications (Partner adjustment)
        if (quantity || pricePerQuintal) {
            if (quantity) order.quantity = quantity;
            if (pricePerQuintal) {
                order.pricePerQuintal = parseFloat(pricePerQuintal);
                order.pricePerKg = order.pricePerQuintal / 100;
            }
            
            // Recalculate amount and commission immediately
            const settings = await Settings.getSettings();
            const rate = order.commissionRate || (settings.commissions?.buyerTrading || 0);
            const qtlValue = parseQuantityInQuintals(order.quantity);
            const baseVal = qtlValue * order.pricePerQuintal;
            
            order.amount = baseVal;
            order.commission = (baseVal * rate) / 100;
            order.commissionRate = rate;
            
            // IMMEDIATE SYNC: Sync these values to the linked SellRequest so Admin/Farmer see them
            if (order.sellRequestId) {
                const sReqUpdate = {
                    adminPrice: order.pricePerQuintal,
                    quantity: order.quantity
                };
                await SellRequest.findByIdAndUpdate(order.sellRequestId._id, sReqUpdate);
                console.log(`[ORDER-SYNC-DEBUG] Synced SellRequest #${order.sellRequestId._id} with Qty=${order.quantity}, Price=${order.pricePerQuintal}`);
            }

            console.log(`[ORDER-EDIT-DEBUG] Applied: Qty=${order.quantity}, Price=${order.pricePerQuintal}, Amt=${order.amount}`);
        }

        // 2. Handle Status Specific Logic
        if (assignedStatus === 'ok') {
            console.log(`[ORDER-OK-DEBUG] Processing acceptance for #${order._id}`);
            if (order.sellRequestId) {
                const sReq = order.sellRequestId;
                if (sReq.otp && sReq.farmer) {
                    const { sendNotification: sNotif } = require('../services/notificationService');
                    const { sendOtp: sOtp } = require('../services/msg91');
                    const farmerUser = await User.findById(sReq.farmer);
                    
                    if (farmerUser) {
                        const buyerName = req.user.businessName || req.user.name;
                        const msgEn = `OTP: ${sReq.otp} - ORDER: #${order._id.toString().slice(-6)} - Trader ${buyerName} has accepted your sell request for ${order.crop}.`;
                        const msgHi = `OTP: ${sReq.otp} - ऑर्डर: #${order._id.toString().slice(-6)} - व्यापारी ${buyerName} ने ${order.crop} के लिए आपके बेचने के अनुरोध को स्वीकार कर लिया है।`;

                        await sNotif(farmerUser._id, {
                            title: `Order #${order._id.toString().slice(-6)} (OTP: ${sReq.otp})`,
                            messageEn: msgEn,
                            messageHi: msgHi,
                            type: 'crop_sale',
                            refId: order._id.toString()
                        });

                        if (farmerUser.phone) {
                            const cleanPhone = farmerUser.phone.replace(/[^0-9]/g, '');
                            await sOtp(cleanPhone, sReq.otp).catch(err => console.error(`SMS Error: ${err.message}`));
                        }
                    }
                }
            }
            order.assignedStatus = 'ok';
        } 
        else if (assignedStatus === 'delivered') {
            if (!order.sellRequestId) {
                return res.status(400).json({ error: 'This order is not linked to a farmer sell request.' });
            }

            // OTP Verification
            if (!otp || otp !== order.sellRequestId.otp) {
                return res.status(400).json({ error: 'Invalid OTP. Please ask the farmer for the 4-digit code.' });
            }

            // Process Wallet Transactions using Updated Order Values
            const settings = await Settings.getSettings();
            const commissionRate = order.commissionRate || (settings.commissions.buyerTrading || 0);
            
            const quantityInQtl = parseQuantityInQuintals(order.quantity);
            const price = order.pricePerQuintal || 0;
            const baseAmount = quantityInQtl * price;
            const commissionAmount = (baseAmount * commissionRate) / 100;

            console.log(`[DELIVERY-FINAL] Order=#${order._id}, Qty=${order.quantity}(${quantityInQtl}), Price=${price}, Final_Amt=${baseAmount}`);

            // Pre-update the order object for persistence
            order.farmerAmount = baseAmount;
            order.pricePerQuintal = price;
            order.pricePerKg = price / 100;
            order.amount = baseAmount; 
            order.amountReceived = baseAmount + commissionAmount;
            order.commission = commissionAmount;
            order.commissionRate = commissionRate;

            const buyer = await User.findById(req.user.id);
            if (buyer) {
                buyer.walletBalance = (buyer.walletBalance || 0) - order.amountReceived;
                await buyer.save();

                // Transactions
                await Transaction.create({
                    transactionId: `BUY-DEL-${order._id}-${Date.now()}`,
                    recipient: buyer._id,
                    module: 'BuyerTrading',
                    amount: baseAmount,
                    type: 'Debit',
                    paymentMode: 'NexCard Wallet',
                    status: 'Completed',
                    referenceId: order._id,
                    note: `Purchase of ${order.crop} (${quantityInQtl} Qtl) - Sent to Farmer`
                });

                if (commissionAmount > 0) {
                    await Transaction.create({
                        transactionId: `BUY-COMM-${order._id}-${Date.now()}`,
                        recipient: buyer._id,
                        module: 'BuyerTrading',
                        amount: commissionAmount,
                        type: 'Debit',
                        paymentMode: 'NexCard Wallet',
                        status: 'Completed',
                        referenceId: order._id,
                        note: `Trading Commission (${commissionRate}%)`
                    });
                }
            }

            const farmer = await User.findById(order.sellRequestId.farmer);
            if (farmer) {
                farmer.walletBalance = (farmer.walletBalance || 0) + baseAmount;
                await farmer.save();

                await Transaction.create({
                    transactionId: `SELL-DEL-${order._id}-${Date.now()}`,
                    recipient: farmer._id,
                    module: 'BuyerTrading',
                    amount: baseAmount,
                    type: 'Credit',
                    paymentMode: 'NexCard Wallet',
                    status: 'Completed',
                    referenceId: order._id,
                    note: `Sale of ${order.crop} (${quantityInQtl} Qtl)`
                });
                
                const { processAutoRepayment } = require('../services/repaymentService');
                await processAutoRepayment(farmer._id, order._id).catch(e => console.error('Repayment error:', e));
            }

            // Credit Admin
            if (commissionAmount > 0) {
                const admin = await User.findOne({ role: 'admin' });
                if (admin) {
                    admin.walletBalance = (admin.walletBalance || 0) + commissionAmount;
                    await admin.save();
                    await Transaction.create({
                        transactionId: `ADM-COMM-${order._id}-${Date.now()}`,
                        recipient: admin._id,
                        module: 'BuyerTrading',
                        amount: commissionAmount,
                        type: 'Credit',
                        paymentMode: 'NexCard Wallet',
                        status: 'Completed',
                        referenceId: order._id,
                        note: `Commission from #${order._id.toString().slice(-6)}`
                    });
                }
            }

            order.assignedStatus = 'delivered';
            order.status = 'completed';
            
            // Sync SellRequest with final delivered values
            if (order.sellRequestId) {
                await SellRequest.findByIdAndUpdate(order.sellRequestId._id, { 
                    status: 'completed',
                    adminPrice: price, 
                    quantity: order.quantity // Sync the final quantity string (e.g. "800 KG")
                });
            }
        } 
        else if (assignedStatus === 'cancelled') {
            order.assignedStatus = 'cancelled';
            if (cancelReason) order.cancelReason = cancelReason;
        }

        await order.save();
        console.log(`[KHETIFY-SAVE-SUCCESS] Order=#${order._id} Qty="${order.quantity}" Price=${order.pricePerQuintal} Amt=${order.amount} Comm=${order.commission}`);
        res.json({ message: 'Order status updated successfully', order });

    } catch (error) {
        console.error('Assigned status update error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// @route   GET /api/orders/my
// @desc    Get all orders for the logged-in buyer
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        const orders = await Order.find({ buyer: req.user.id })
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error('Fetch my orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// @route   GET /api/orders
// @desc    Get all orders (for admin/employee view)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('buyer', 'name phone')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error('Fetch all orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// @route   PATCH /api/orders/:id/status
// @desc    Update order status (admin/employee)
// @access  Private
router.patch('/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Status updated', order });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
