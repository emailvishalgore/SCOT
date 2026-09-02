importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// =========================================================================
// 🔥 SERVICE WORKER FIREBASE INITIALIZATION
// =========================================================================
// Must use the exact same credentials as your src/firebase.js configuration.
firebase.initializeApp({
  apiKey: "AIzaSyAsT4m1UXClW6Z7-kbQMn3yf2RoH_wQYuQ",
  authDomain: "scot-website-bd617.firebaseapp.com",
  projectId: "scot-website-bd617",
  storageBucket: "scot-website-bd617.appspot.com",
  messagingSenderId: "128590748101",
  appId: "1:128590748101:web:1dc7e2eab8845fa91a93ac"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background push message received: ', payload);
  const notificationTitle = payload.notification.title || "SCOT Update";
  const notificationOptions = {
    body: payload.notification.body || "",
    icon: '/logo.png', // Fallback icon path (you can adjust)
    badge: '/logo.png', // Icon displayed in status bars
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
