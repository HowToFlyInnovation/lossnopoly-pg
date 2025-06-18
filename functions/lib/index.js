"use strict";
// functions/src/index.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDailyRecapEmails = exports.onCommentWrite = exports.onIdeaWrite = void 0;
const functions = __importStar(require("firebase-functions")); // V1 functions for config
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
// Import V2 Firestore and Scheduler functions specifically
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
// --- Configuration for Email Sending ---
// IMPORTANT: Configure these in Firebase Functions environment variables:
// firebase functions:config:set mail.host="YOUR_SMTP_HOST" mail.port="YOUR_SMTP_PORT" mail.secure="YOUR_SMTP_SECURE_BOOL" mail.user="YOUR_SMTP_USERNAME" mail.pass="YOUR_SMTP_PASSWORD"
// Example for Gmail:
// firebase functions:config:set mail.host="smtp.gmail.com" mail.port="465" mail.secure="true" mail.user="your_email@gmail.com" mail.pass="your_app_password"
// For other services, consult their SMTP documentation.
const mailConfig = functions.config().mail;
// Ensure mailConfig values are treated as strings for nodemailer
const transporter = nodemailer.createTransport({
    host: mailConfig.host,
    port: parseInt(mailConfig.port),
    secure: mailConfig.secure === "true", // Use 'true' string in config for boolean
    auth: {
        user: mailConfig.user,
        pass: mailConfig.pass,
    },
});
/**
 * Fetches user display name for a given UID.
 * @param uid The user ID.
 * @returns User's display name or 'Unknown User'.
 */
async function getUserDisplayName(uid) {
    try {
        const userDoc = await db.collection("players").doc(uid).get();
        if (userDoc.exists) {
            return userDoc.data().displayName || "Unknown User";
        }
        return "Unknown User";
    }
    catch (error) {
        console.error(`Error fetching display name for ${uid}:`, error);
        return "Unknown User";
    }
}
/**
 * Creates notification documents in Firestore.
 * @param recipientUids Array of UIDs to notify.
 * @param senderUid UID of the user who triggered the notification.
 * @param type Type of notification ('idea_mention' or 'comment_mention').
 * @param entityId ID of the idea or comment.
 * @param entityTitle A title for the entity (e.g., idea short description or comment snippet).
 */
async function createNotifications(recipientUids, senderUid, type, entityId, entityTitle) {
    const senderDisplayName = await getUserDisplayName(senderUid);
    const notificationPromises = recipientUids
        .map((uid) => {
        // Don't notify sender about their own tag if they are the sender
        if (uid === senderUid)
            return null;
        let message = "";
        if (type === "idea_mention") {
            message = `${senderDisplayName} mentioned you in an idea: "${entityTitle}"`;
        }
        else if (type === "comment_mention") {
            message = `${senderDisplayName} mentioned you in a comment on: "${entityTitle}"`;
        }
        const notification = {
            recipientUserId: uid,
            senderUserId: senderUid,
            type: type,
            entityId: entityId,
            read: false,
            recapEmailSent: false,
            timestamp: admin.firestore.Timestamp.now(),
            message: message,
        };
        return db.collection("notifications").add(notification);
    })
        .filter(Boolean); // Filter out nulls
    await Promise.all(notificationPromises);
    console.log(`Created ${notificationPromises.length} notifications of type ${type}.`);
}
// --- Cloud Functions ---
/**
 * Triggered when an Idea document is created or updated.
 * Creates notifications for tagged users.
 * Uses Firestore V2 `onDocumentWritten` trigger.
 */
exports.onIdeaWrite = (0, firestore_1.onDocumentWritten)("ideas/{ideaId}", async (event) => {
    var _a, _b;
    const ideaDataAfter = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
    const ideaDataBefore = (_b = event.data) === null || _b === void 0 ? void 0 : _b.before.data();
    if (!ideaDataAfter) {
        // Document deleted
        return null;
    }
    const ideaId = event.params.ideaId;
    const taggedUsersAfter = ideaDataAfter.taggedUsers || [];
    const taggedUsersBefore = ideaDataBefore
        ? ideaDataBefore.taggedUsers || []
        : [];
    // Identify newly tagged users
    const newTaggedUsers = taggedUsersAfter.filter((uid) => !taggedUsersBefore.includes(uid));
    if (newTaggedUsers.length > 0) {
        console.log(`Idea ${ideaId}: New users tagged: ${newTaggedUsers.join(", ")}`);
        await createNotifications(newTaggedUsers, ideaDataAfter.createdBy, "idea_mention", ideaId, ideaDataAfter.shortDescription);
    }
    return null;
});
/**
 * Triggered when a Comment document is created or updated.
 * Creates notifications for tagged users.
 * Uses Firestore V2 `onDocumentWritten` trigger.
 */
exports.onCommentWrite = (0, firestore_1.onDocumentWritten)("comments/{commentId}", async (event) => {
    var _a, _b, _c;
    const commentDataAfter = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
    const commentDataBefore = (_b = event.data) === null || _b === void 0 ? void 0 : _b.before.data();
    if (!commentDataAfter) {
        // Document deleted
        return null;
    }
    const commentId = event.params.commentId;
    const taggedUsersAfter = commentDataAfter.taggedUsers || [];
    const taggedUsersBefore = commentDataBefore
        ? commentDataBefore.taggedUsers || []
        : [];
    // Identify newly tagged users
    const newTaggedUsers = taggedUsersAfter.filter((uid) => !taggedUsersBefore.includes(uid));
    if (newTaggedUsers.length > 0) {
        console.log(`Comment ${commentId}: New users tagged: ${newTaggedUsers.join(", ")}`);
        // Get the associated idea's short description for the message
        const ideaDoc = await db
            .collection("ideas")
            .doc(commentDataAfter.ideaId)
            .get();
        const ideaTitle = ((_c = ideaDoc.data()) === null || _c === void 0 ? void 0 : _c.shortDescription) || "an idea";
        await createNotifications(newTaggedUsers, commentDataAfter.userId, "comment_mention", commentId, ideaTitle);
    }
    return null;
});
/**
 * Scheduled Cloud Function to send daily recap emails.
 * Runs once every 24 hours.
 * Uses Scheduler V2 `onSchedule` trigger.
 */
exports.sendDailyRecapEmails = (0, scheduler_1.onSchedule)("every 24 hours", async (context) => {
    const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    // Group notifications by recipient
    const notificationsSnapshot = await db
        .collection("notifications")
        .where("recapEmailSent", "==", false)
        .where("timestamp", ">", twentyFourHoursAgo)
        .orderBy("timestamp", "asc")
        .get();
    const notificationsByUser = {};
    notificationsSnapshot.forEach((doc) => {
        const notification = Object.assign(Object.assign({}, doc.data()), { id: doc.id });
        if (!notificationsByUser[notification.recipientUserId]) {
            notificationsByUser[notification.recipientUserId] = [];
        }
        notificationsByUser[notification.recipientUserId].push(notification);
    });
    const emailPromises = [];
    const notificationsToUpdate = db.batch();
    for (const userId in notificationsByUser) {
        const notifications = notificationsByUser[userId];
        if (notifications.length === 0)
            continue;
        const userDoc = await db.collection("players").doc(userId).get();
        const userData = userDoc.data();
        if (!userData || !userData.email) {
            console.warn(`User ${userId} not found or has no email. Skipping recap email.`);
            // If user data is missing or email is null, still mark notifications as sent to avoid repeated attempts
            notifications.forEach((n) => {
                const notifRef = db.collection("notifications").doc(n.id);
                notificationsToUpdate.update(notifRef, { recapEmailSent: true });
            });
            continue;
        }
        // Check user preference for recap emails
        if (userData.receiveRecapEmails === false) {
            console.log(`User ${userId} opted out of recap emails. Skipping.`);
            // Mark these notifications as 'recapEmailSent' true if user opted out
            notifications.forEach((n) => {
                const notifRef = db.collection("notifications").doc(n.id);
                notificationsToUpdate.update(notifRef, { recapEmailSent: true });
            });
            continue;
        }
        // Compile email content
        let emailContent = `<h1>Daily Notification Recap for ${userData.displayName || "You"}</h1>`;
        emailContent += `<p>Here's a summary of your notifications from the last 24 hours:</p><ul>`;
        notifications.forEach((n) => {
            let link = "";
            if (n.type === "idea_mention") {
                link = `your-platform-url/ideas/${n.entityId}`; // Replace with actual URL structure
            }
            else if (n.type === "comment_mention") {
                link = `your-platform-url/ideas/${n.entityId}#comment-${n.id}`; // Replace with actual URL structure and comment anchor
            }
            emailContent += `<li><a href="${link}">${n.message}</a> - ${n.timestamp
                .toDate()
                .toLocaleString()}</li>`;
            // Mark notification for update
            const notifRef = db.collection("notifications").doc(n.id);
            notificationsToUpdate.update(notifRef, { recapEmailSent: true }); // Mark as sent
        });
        emailContent += `</ul><p>Login to the platform to view all your notifications.</p>`;
        emailContent += `<p>You can manage your notification preferences in your profile settings.</p>`;
        // Send the email
        const mailOptions = {
            from: `Your Platform <${mailConfig.user}>`, // Use your configured email sender
            to: userData.email,
            subject: `Daily Recap: New Notifications on Your Platform`,
            html: emailContent,
        };
        emailPromises.push(transporter
            .sendMail(mailOptions)
            .then(() => console.log(`Daily recap email sent to ${userData.email}`))
            .catch((error) => console.error(`Failed to send daily recap email to ${userData.email}:`, error)));
    }
    // Execute all email sending promises
    await Promise.all(emailPromises);
    // Commit all Firestore updates
    await notificationsToUpdate.commit();
    console.log("Daily recap email process completed.");
    // Explicitly return void to satisfy TypeScript
    return Promise.resolve();
});
//# sourceMappingURL=index.js.map