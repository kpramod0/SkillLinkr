
"use client"

import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';

export function NotificationManager() {
    const router = useRouter();

    useEffect(() => {
        if (Capacitor.getPlatform() === 'web') return;

        const registerPush = async () => {
            try {
                // Wait a moment for the native bridge to be fully ready
                await new Promise(resolve => setTimeout(resolve, 1000));

                console.log('Initializing Push Notifications...');

                // Request permission
                let permStatus = await PushNotifications.checkPermissions();

                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }

                if (permStatus.receive !== 'granted') {
                    console.log('User denied push notification permissions');
                    return;
                }

                // Register with FCM
                // await PushNotifications.register();
                // console.log('Push Notifications registered request sent');

                // Listeners
                PushNotifications.addListener('registration', (token) => {
                    console.log('Push Registration Success. Token:', token.value);
                });

                PushNotifications.addListener('registrationError', (error) => {
                    console.error('Push Registration Error:', error);
                });

                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    console.log('Push Received:', notification);
                });

                PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                    console.log('Push Action Performed:', notification);
                    const data = notification.notification.data;
                    if (data?.url) router.push(data.url);
                });

            } catch (error) {
                console.error('Error initializing push notifications:', error);
            }
        };

        registerPush();

        // Cleanup listener usually not needed for singleton manager, but good practice if checking cleanup
        return () => {
            if (Capacitor.getPlatform() !== 'web') {
                PushNotifications.removeAllListeners();
            }
        };

    }, [router]);

    return null; // Logic only component
}
