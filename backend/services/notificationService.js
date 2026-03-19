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
        if (user && user.fcmToken && firebaseApp) {
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
        }

        return notification;
    } catch (error) {
        console.error('[NOTIFY-SERVICE] Error sending notification:', error);
    }
};

module.exports = {
    sendNotification
};
