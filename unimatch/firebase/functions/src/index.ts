import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Block non-KIIT users on account creation
export const blockNonKIITUsers = functions.auth.user().onCreate(async (user) => {
    const email = user.email;

    if (!email || !email.endsWith('@kiit.ac.in')) {
        // Disable the user account
        await admin.auth().updateUser(user.uid, {
            disabled: true,
        });

        console.log(`Blocked non-KIIT user: ${email}`);
    }
});

// Send connection request
export const sendRequest = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const fromUid = context.auth.uid;
    const toUid = data.toUid;

    if (!toUid) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing toUid');
    }

    // Check if request already exists
    const existingRequest = await db.collection('requests')
        .where('fromUid', '==', fromUid)
        .where('toUid', '==', toUid)
        .where('status', '==', 'pending')
        .get();

    if (!existingRequest.empty) {
        throw new functions.https.HttpsError('already-exists', 'Request already sent');
    }

    // Create request
    const requestRef = await db.collection('requests').add({
        fromUid,
        toUid,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create notification for receiver
    await db.collection('notifications').doc(toUid).collection('items').add({
        type: 'request',
        fromUid,
        message: 'You have a new connection request!',
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        data: {
            requestId: requestRef.id,
        },
    });

    return {
        success: true,
        requestId: requestRef.id,
    };
});

// Respond to connection request
export const respondRequest = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const currentUid = context.auth.uid;
    const requestId = data.requestId;
    const accepted = data.accepted;

    if (!requestId || accepted === undefined) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing requestId or accepted');
    }

    // Get request
    const requestDoc = await db.collection('requests').doc(requestId).get();

    if (!requestDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Request not found');
    }

    const request = requestDoc.data()!;

    // Verify user is the receiver
    if (request.toUid !== currentUid) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized');
    }

    // Update request status
    const newStatus = accepted ? 'accepted' : 'rejected';
    await db.collection('requests').doc(requestId).update({
        status: newStatus,
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If accepted, create match
    let matchId = null;
    if (accepted) {
        const matchRef = await db.collection('matches').add({
            users: [request.fromUid, request.toUid],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        matchId = matchRef.id;

        // Create notification for sender
        await db.collection('notifications').doc(request.fromUid).collection('items').add({
            type: 'match',
            fromUid: currentUid,
            message: 'Your connection request was accepted!',
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            data: {
                matchId,
            },
        });
    }

    return {
        success: true,
        status: newStatus,
        matchId,
    };
});

// Trigger on new message to send notification
export const onNewMessage = functions.firestore
    .document('chats/{matchId}/messages/{messageId}')
    .onCreate(async (snapshot, context) => {
        const message = snapshot.data();
        const matchId = context.params.matchId;
        const senderId = message.senderId;

        // Get match to find the other user
        const matchDoc = await db.collection('matches').doc(matchId).get();

        if (!matchDoc.exists) {
            console.log('Match not found');
            return;
        }

        const match = matchDoc.data()!;
        const users = match.users as string[];
        const receiverId = users.find((uid: string) => uid !== senderId);

        if (!receiverId) {
            console.log('Receiver not found');
            return;
        }

        // Get sender info
        const senderDoc = await db.collection('users').doc(senderId).get();
        const senderName = senderDoc.exists ? senderDoc.data()!.fullName : 'Someone';

        // Create notification
        await db.collection('notifications').doc(receiverId).collection('items').add({
            type: 'message',
            fromUid: senderId,
            message: `New message from ${senderName}`,
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            data: {
                matchId,
            },
        });

        console.log(`Notification sent to ${receiverId} for message from ${senderId}`);
    });
