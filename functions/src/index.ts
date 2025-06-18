// functions/src/index.ts

import * as functions from "firebase-functions"; // V1 functions for config
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
// Import V2 Firestore and Scheduler functions specifically
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { ScheduledEvent } from "firebase-functions/v2/scheduler"; // Import ScheduledEvent type

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
  host: mailConfig.host as string,
  port: parseInt(mailConfig.port as string),
  secure: (mailConfig.secure as string) === "true", // Use 'true' string in config for boolean
  auth: {
    user: mailConfig.user as string,
    pass: mailConfig.pass as string,
  },
});

// --- Helper Functions and Interfaces ---
// Redefine interfaces for Cloud Functions context, including taggedUsers
interface Notification {
  id?: string;
  recipientUserId: string;
  senderUserId: string;
  type: "idea_mention" | "comment_mention";
  entityId: string;
  read: boolean;
  recapEmailSent: boolean;
  timestamp: admin.firestore.Timestamp;
  message: string;
}

interface Idea {
  id?: string;
  shortDescription: string;
  reasoning: string;
  createdBy: string;
  createdAt: admin.firestore.Timestamp;
  taggedUsers?: string[]; // Added taggedUsers
  // other fields...
}

interface Comment {
  id?: string;
  ideaId: string;
  userId: string;
  text: string;
  createdAt: admin.firestore.Timestamp;
  taggedUsers?: string[]; // Added taggedUsers
  // other fields...
}

interface Player {
  userId: string;
  email: string;
  displayName: string;
  // other fields...
  receiveRecapEmails?: boolean;
}

/**
 * Fetches user display name for a given UID.
 * @param uid The user ID.
 * @returns User's display name or 'Unknown User'.
 */
async function getUserDisplayName(uid: string): Promise<string> {
  try {
    const userDoc = await db.collection("players").doc(uid).get();
    if (userDoc.exists) {
      return (userDoc.data() as Player).displayName || "Unknown User";
    }
    return "Unknown User";
  } catch (error) {
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
async function createNotifications(
  recipientUids: string[],
  senderUid: string,
  type: Notification["type"],
  entityId: string,
  entityTitle: string
) {
  const senderDisplayName = await getUserDisplayName(senderUid);
  const notificationPromises = recipientUids
    .map((uid) => {
      // Don't notify sender about their own tag if they are the sender
      if (uid === senderUid) return null;

      let message = "";
      if (type === "idea_mention") {
        message = `${senderDisplayName} mentioned you in an idea: "${entityTitle}"`;
      } else if (type === "comment_mention") {
        message = `${senderDisplayName} mentioned you in a comment on: "${entityTitle}"`;
      }

      const notification: Omit<Notification, "id"> = {
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
  console.log(
    `Created ${notificationPromises.length} notifications of type ${type}.`
  );
}

// --- Cloud Functions ---

/**
 * Triggered when an Idea document is created or updated.
 * Creates notifications for tagged users.
 * Uses Firestore V2 `onDocumentWritten` trigger.
 */
export const onIdeaWrite = onDocumentWritten(
  "ideas/{ideaId}",
  async (event) => {
    const ideaDataAfter = event.data?.after.data() as Idea | undefined;
    const ideaDataBefore = event.data?.before.data() as Idea | undefined;

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
    const newTaggedUsers = taggedUsersAfter.filter(
      (uid: string) => !taggedUsersBefore.includes(uid)
    );

    if (newTaggedUsers.length > 0) {
      console.log(
        `Idea ${ideaId}: New users tagged: ${newTaggedUsers.join(", ")}`
      );
      await createNotifications(
        newTaggedUsers,
        ideaDataAfter.createdBy,
        "idea_mention",
        ideaId,
        ideaDataAfter.shortDescription
      );
    }
    return null;
  }
);

/**
 * Triggered when a Comment document is created or updated.
 * Creates notifications for tagged users.
 * Uses Firestore V2 `onDocumentWritten` trigger.
 */
export const onCommentWrite = onDocumentWritten(
  "comments/{commentId}",
  async (event) => {
    const commentDataAfter = event.data?.after.data() as Comment | undefined;
    const commentDataBefore = event.data?.before.data() as Comment | undefined;

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
    const newTaggedUsers = taggedUsersAfter.filter(
      (uid: string) => !taggedUsersBefore.includes(uid)
    );

    if (newTaggedUsers.length > 0) {
      console.log(
        `Comment ${commentId}: New users tagged: ${newTaggedUsers.join(", ")}`
      );
      // Get the associated idea's short description for the message
      const ideaDoc = await db
        .collection("ideas")
        .doc(commentDataAfter.ideaId)
        .get();
      const ideaTitle = (ideaDoc.data() as Idea)?.shortDescription || "an idea";

      await createNotifications(
        newTaggedUsers,
        commentDataAfter.userId,
        "comment_mention",
        commentId,
        ideaTitle
      );
    }
    return null;
  }
);

/**
 * Scheduled Cloud Function to send daily recap emails.
 * Runs once every 24 hours.
 * Uses Scheduler V2 `onSchedule` trigger.
 */
export const sendDailyRecapEmails = onSchedule(
  "every 24 hours",
  async (context: ScheduledEvent): Promise<void> => {
    const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - 24 * 60 * 60 * 1000
    );

    // Group notifications by recipient
    const notificationsSnapshot = await db
      .collection("notifications")
      .where("recapEmailSent", "==", false)
      .where("timestamp", ">", twentyFourHoursAgo)
      .orderBy("timestamp", "asc")
      .get();

    const notificationsByUser: { [userId: string]: Notification[] } = {};
    notificationsSnapshot.forEach((doc) => {
      const notification = { ...doc.data(), id: doc.id } as Notification;
      if (!notificationsByUser[notification.recipientUserId]) {
        notificationsByUser[notification.recipientUserId] = [];
      }
      notificationsByUser[notification.recipientUserId].push(notification);
    });

    const emailPromises: Promise<any>[] = [];
    const notificationsToUpdate: admin.firestore.WriteBatch = db.batch();

    for (const userId in notificationsByUser) {
      const notifications = notificationsByUser[userId];
      if (notifications.length === 0) continue;

      const userDoc = await db.collection("players").doc(userId).get();
      const userData = userDoc.data() as Player | undefined;

      if (!userData || !userData.email) {
        console.warn(
          `User ${userId} not found or has no email. Skipping recap email.`
        );
        // If user data is missing or email is null, still mark notifications as sent to avoid repeated attempts
        notifications.forEach((n) => {
          const notifRef = db.collection("notifications").doc(n.id as string);
          notificationsToUpdate.update(notifRef, { recapEmailSent: true });
        });
        continue;
      }

      // Check user preference for recap emails
      if (userData.receiveRecapEmails === false) {
        console.log(`User ${userId} opted out of recap emails. Skipping.`);
        // Mark these notifications as 'recapEmailSent' true if user opted out
        notifications.forEach((n) => {
          const notifRef = db.collection("notifications").doc(n.id as string);
          notificationsToUpdate.update(notifRef, { recapEmailSent: true });
        });
        continue;
      }

      // Compile email content
      let emailContent = `<h1>Daily Notification Recap for ${
        userData.displayName || "You"
      }</h1>`;
      emailContent += `<p>Here's a summary of your notifications from the last 24 hours:</p><ul>`;

      notifications.forEach((n) => {
        let link = "";
        if (n.type === "idea_mention") {
          link = `your-platform-url/ideas/${n.entityId}`; // Replace with actual URL structure
        } else if (n.type === "comment_mention") {
          link = `your-platform-url/ideas/${n.entityId}#comment-${n.id}`; // Replace with actual URL structure and comment anchor
        }
        emailContent += `<li><a href="${link}">${n.message}</a> - ${n.timestamp
          .toDate()
          .toLocaleString()}</li>`;

        // Mark notification for update
        const notifRef = db.collection("notifications").doc(n.id as string);
        notificationsToUpdate.update(notifRef, { recapEmailSent: true }); // Mark as sent
      });
      emailContent += `</ul><p>Login to the platform to view all your notifications.</p>`;
      emailContent += `<p>You can manage your notification preferences in your profile settings.</p>`;

      // Send the email
      const mailOptions = {
        from: `Your Platform <${mailConfig.user as string}>`, // Use your configured email sender
        to: userData.email,
        subject: `Daily Recap: New Notifications on Your Platform`,
        html: emailContent,
      };

      emailPromises.push(
        transporter
          .sendMail(mailOptions)
          .then(() =>
            console.log(`Daily recap email sent to ${userData.email}`)
          )
          .catch((error) =>
            console.error(
              `Failed to send daily recap email to ${userData.email}:`,
              error
            )
          )
      );
    }

    // Execute all email sending promises
    await Promise.all(emailPromises);

    // Commit all Firestore updates
    await notificationsToUpdate.commit();
    console.log("Daily recap email process completed.");
    // Explicitly return void to satisfy TypeScript
    return Promise.resolve();
  }
);
