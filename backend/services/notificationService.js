const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const Notification = require('../models/Notification');
const User = require('../models/User');

const FIREBASE_CONFIG = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
let firebaseApp;

if (FIREBASE_CONFIG) {
    try {
        let rawConfig = FIREBASE_CONFIG.trim();

        // 1. Unescape escaped double quotes if present (e.g. \" or \\" to ")
        if (rawConfig.includes('\\"')) {
            rawConfig = rawConfig.replace(/\\"/g, '"');
        }

        // 2. Remove surrounding outer quotes if added by Coolify / Docker env systems
        if (rawConfig.startsWith('"') && rawConfig.endsWith('"')) {
            rawConfig = rawConfig.slice(1, -1);
        }
        if (rawConfig.startsWith("'") && rawConfig.endsWith("'")) {
            rawConfig = rawConfig.slice(1, -1);
        }

        const serviceAccount = JSON.parse(rawConfig);

        // Ultimate PEM Sanitizer: Auto-heals any key regardless of copy-paste corruptions!
        if (serviceAccount.private_key) {
            let cleanKey = serviceAccount.private_key.trim();

            // 1. Normalize headers and remove any accidental spaces/typos in boundary markers
            cleanKey = cleanKey.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
            cleanKey = cleanKey.replace(/-----BEGIN[ ]+PRIVATE[ ]+KEY-----/, '-----BEGIN PRIVATE KEY-----');
            cleanKey = cleanKey.replace(/-----END[ ]+PRIV[ ]+ATE[ ]+KEY-----/i, '-----END PRIVATE KEY-----');
            cleanKey = cleanKey.replace(/-----END[ ]+PRIVATE[ ]+KEY-----/, '-----END PRIVATE KEY-----');

            // 2. Extract base64 body, strip all spaces, tabs, and newlines
            const body = cleanKey
                .replace('-----BEGIN PRIVATE KEY-----', '')
                .replace('-----END PRIVATE KEY-----', '')
                .replace(/\s+/g, ''); // Purges all whitespace/carriage returns/newlines completely

            // 3. Rebuild body in standard 64-character lines
            const chunks = body.match(/.{1,64}/g);

            // 4. Wrap with perfect PEM headers
            serviceAccount.private_key = `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;
        }

        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        const hasNewlines = serviceAccount.private_key && serviceAccount.private_key.includes('\n');
        console.log('[FIREBASE] ✅ Firebase Admin SDK initialized from Environment Variable.');
        console.log(`[FIREBASE] Private Key: length=${serviceAccount.private_key?.length}, hasActualNewlines=${hasNewlines}`);
        if (!hasNewlines) {
            console.error('[FIREBASE] ❌ CRITICAL: Private Key missing actual newlines — push notifications WILL FAIL!');
        }
    } catch (error) {
        console.error('[FIREBASE] Error parsing FIREBASE_SERVICE_ACCOUNT from Env:', error);
    }
} else if (fs.existsSync(serviceAccountPath)) {
    try {
        const serviceAccount = require(serviceAccountPath);
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('[FIREBASE] Firebase Admin SDK initialized from serviceAccountKey.json.');
    } catch (error) {
        console.error('[FIREBASE] Error initializing Firebase Admin SDK from file:', error);
    }
} else {
    console.warn('[FIREBASE] Firebase credentials not found (JSON file or Env Var). Push notifications disabled.');
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
        
        // 1.5 Emit via Socket.io
        if (global.io) {
            global.io.to(`user_${userId}`).emit('notification_new', notification);
        }

        // 2. Send push notification if user has an FCM token and Firebase is initialized
        const user = await User.findById(userId).select('fcmToken');
        console.log(`[NOTIFY-SERVICE] FCM Token for user ${userId}: ${user?.fcmToken ? 'FOUND' : 'NOT FOUND'}`);

        if (user && user.fcmToken && firebaseApp) {
            console.log(`[NOTIFY-SERVICE] Sending via Firebase FCM to token: ${user.fcmToken.substring(0, 15)}...`);
            const message = {
                notification: {
                    title: title,
                    body: messageEn
                },
                android: {
                    notification: {
                        sound: 'default',
                        channelId: 'default'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default'
                        }
                    }
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
                    console.log('[FIREBASE] ✅ Push sent successfully:', response);
                })
                .catch((error) => {
                    console.error('[FIREBASE] ❌ Push failed:', error.message || error);
                });
        } else {
            console.warn(`[NOTIFY-SERVICE] Skip push: fcmToken=${!!user?.fcmToken}, Firebase=${!!firebaseApp}`);
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
