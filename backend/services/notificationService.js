const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const Notification = require('../models/Notification');
const User = require('../models/User');

let firebaseApp;
const serviceAccountPath = path.join(__dirname, '../config/serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
    try {
        const serviceAccount = require(serviceAccountPath);
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('[FIREBASE] Firebase Admin SDK initialized.');
    } catch (error) {
        console.error('[FIREBASE] Error initializing Firebase Admin SDK:', error);
    }
} else {
    console.warn('[FIREBASE] serviceAccountKey.json not found. Push notifications will be disabled.');
}

/**
 * Send a notification to a user
 * @param {string} userId - Target user ID
 * @param {Object} options - { title, messageEn, messageHi, type, refId, data }
 */
const sendNotification = async (userId, { title, messageEn, messageHi, type, refId, data = {} }) => {
    try {
        console.log(`[NOTIFY-SERVICE] Creating notification record for User: ${userId}, Title: ${title}`);
        // 1. Create in-app notification record
        const notification = await Notification.create({
            user: userId,
            title,
            messageEn,
            messageHi: messageHi || messageEn,
            type: type || 'system',
            refId: refId || ''
        });
        console.log(`[NOTIFY-SERVICE] Notification record created: ${notification._id}`);

        // 2. Send push notification if user has an FCM token and Firebase is initialized
        const user = await User.findById(userId).select('fcmToken');
        console.log(`[NOTIFY-SERVICE] FCM Token for user ${userId}: ${user?.fcmToken ? 'FOUND' : 'NOT FOUND'}`);

        if (user && user.fcmToken && firebaseApp) {
            console.log(`[NOTIFY-SERVICE] Sending PUSH via Firebase to token: ${user.fcmToken.substring(0, 10)}...`);
            const message = {
                notification: {
                    title: title,
                    body: messageEn // Defaulting to English for the system notification bar
                },
                data: {
                    ...data,
                    refId: refId || '',
                    type: type || 'system'
                },
                token: user.fcmToken
            };

            await admin.messaging().send(message)
                .then((response) => {
                    console.log('[FIREBASE] Successfully sent message:', response);
                })
                .catch((error) => {
                    console.error('[FIREBASE] Error sending message:', error);
                });
        } else {
            console.warn(`[NOTIFY-SERVICE] Skip push: Token=${!!user?.fcmToken}, FirebaseInit=${!!firebaseApp}`);
        }

        return notification;
    } catch (error) {
        console.error('[NOTIFY-SERVICE] Error sending notification:', error);
    }
};

/**
 * Check if item stock is low and notify the owner
 * @param {string} itemId - ID of the item to check
 */
const checkAndNotifyLowStock = async (itemId) => {
    console.log(`[LOW-STOCK-CHECK] START: Processing Item ID: ${itemId}`);
    try {
        const Item = require('../models/Item');
        const item = await Item.findById(itemId).populate('owner');
        
        if (!item) {
            console.log(`[LOW-STOCK-CHECK] ABORT: Item not found for ID: ${itemId}`);
            return null;
        }
        if (!item.owner) {
            console.log(`[LOW-STOCK-CHECK] ABORT: Owner not found for Item: "${item.name}"`);
            return null;
        }

        let isLow = false;
        let alertMsgEn = '';
        let alertMsgHi = '';

        console.log(`[LOW-STOCK-CHECK] Item Name: "${item.name}", Total Stock: ${item.stockQty}, HasVariants: ${item.hasVariants}`);

        if (item.hasVariants && item.variants && item.variants.length > 0) {
            // Bhai, check if any variant is low (less than or equal to 5)
            const lowVariants = item.variants.filter(v => (v.stockQty || 0) <= 5);
            
            console.log(`[LOW-STOCK-CHECK] Variants Count: ${item.variants.length}, Low Variants Found: ${lowVariants.length}`);
            
            if (lowVariants.length > 0) {
                isLow = true;
                const vLabels = lowVariants.map(v => v.label).join(', ');
                alertMsgEn = `Low Stock Alert: Variants (${vLabels}) for "${item.name}" are below 5 units. Please restock!`;
                alertMsgHi = `लो स्टॉक अलर्ट: "${item.name}" के वेरिएंट्स (${vLabels}) 5 यूनिट से कम हैं। कृपया स्टॉक अपडेट करें!`;
            }
        } else {
            // Bhai, standard item check
            const currentStock = item.stockQty || 0;
            console.log(`[LOW-STOCK-CHECK] Main Stock: ${currentStock}`);
            if (currentStock <= 5) {
                isLow = true;
                alertMsgEn = `Low Stock Alert: "${item.name}" has only ${currentStock} left. Please restock soon!`;
                alertMsgHi = `लो स्टॉक अलर्ट: "${item.name}" में केवल ${currentStock} बचे हैं। कृपया जल्द ही स्टॉक अपडेट करें!`;
            }
        }
        
        if (isLow) {
            console.log(`[LOW-STOCK-CHECK] TRIGGER: Sending notification to Owner ID: ${item.owner._id} (${item.owner.name})`);
            
            const result = await sendNotification(item.owner._id, {
                title: '⚠️ Low Stock Alert',
                messageEn: alertMsgEn,
                messageHi: alertMsgHi,
                type: 'low_stock',
                refId: item._id.toString(),
                data: { itemId: item._id.toString() }
            });
            console.log(`[LOW-STOCK-CHECK] SUCCESS: Notification sent for "${item.name}"`);
            return result;
        }
        
        console.log(`[LOW-STOCK-CHECK] NO-ACTION: Item "${item.name}" stock is sufficient.`);
        return null;
    } catch (error) {
        console.error('[NOTIFY-SERVICE] Error in checkAndNotifyLowStock:', error);
    }
};

module.exports = {
    sendNotification,
    checkAndNotifyLowStock
};
