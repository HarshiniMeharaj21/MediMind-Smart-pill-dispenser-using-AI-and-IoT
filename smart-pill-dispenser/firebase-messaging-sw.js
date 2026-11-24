importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBv9WkYzdCLYuRh6QVjZCmntYx6tUH_1XM",
  authDomain: "mediguard---spd.firebaseapp.com",
  databaseURL: "https://mediguard---spd-default-rtdb.firebaseio.com",
  projectId: "mediguard---spd",
  storageBucket: "mediguard---spd.firebasestorage.app",
  messagingSenderId: "124791588896",
  appId: "1:124791588896:web:c96803f60f634d4d369445",
  measurementId: "G-FGD79F2PS2"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
