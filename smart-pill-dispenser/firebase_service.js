const firebaseConfig = {
  apiKey: "AIzaSyBv9WkYzdCLYuRh6QVjZCmntYx6tUH_1XM",
  authDomain: "mediguard---spd.firebaseapp.com",
  databaseURL: "https://mediguard---spd-default-rtdb.firebaseio.com",
  projectId: "mediguard---spd",
  storageBucket: "mediguard---spd.firebasestorage.app",
  messagingSenderId: "124791588896",
  appId: "1:124791588896:web:c96803f60f634d4d369445",
  measurementId: "G-FGD79F2PS2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Global CloudState to mirror the Database structure
const CloudState = {
  medications: [],
  doseHistory: [],
  sensorData: {
    waterDetected: false,
    trayWeight: 0,
    lockEngaged: false
  }
};

// Function to sync our local mock data UP to Firebase (Initial Seed for a new Patient)
async function seedDatabaseIfEmpty(patientUid) {
  const snapshot = await db.ref(`medications/${patientUid}`).once('value');
  if (!snapshot.exists()) {
    console.log(`Seeding Firebase with initial data for patient: ${patientUid}`);
    await db.ref(`medications/${patientUid}`).set(MOCK_MEDICATIONS);
    await db.ref(`doseHistory/${patientUid}`).set(generateMockDoseHistory());
    await db.ref(`sensorData/${patientUid}`).set(CloudState.sensorData);
  }
}

// Function to establish live listeners scoped to a specific Patient
function initializeFirebaseListeners(targetPatientUid, onDataUpdate) {
  // Unsubscribe old listeners first
  db.ref(`medications/${targetPatientUid}`).off();
  db.ref(`doseHistory/${targetPatientUid}`).off();
  db.ref(`sensorData/${targetPatientUid}`).off();

  // Listen for Medications
  db.ref(`medications/${targetPatientUid}`).on('value', (snapshot) => {
    CloudState.medications = snapshot.val() || [];
    if(onDataUpdate) onDataUpdate();
  });

  // Listen for Dose History
  db.ref(`doseHistory/${targetPatientUid}`).on('value', (snapshot) => {
    CloudState.doseHistory = snapshot.val() || [];
    if(onDataUpdate) onDataUpdate();
  });

  // Listen for Hardware Sensors
  db.ref(`sensorData/${targetPatientUid}`).on('value', (snapshot) => {
    CloudState.sensorData = snapshot.val() || { waterDetected: false, trayWeight: 0, lockEngaged: false };
    if(onDataUpdate) onDataUpdate();
  });
}

// Database Write Wrappers
const CloudDB = {
  addMedication: async (patientUid, med) => {
    const newMeds = [...CloudState.medications, med];
    await db.ref(`medications/${patientUid}`).set(newMeds);
  },
  
  updateDoseHistory: async (patientUid, doseId, status, actualTime) => {
    const history = [...CloudState.doseHistory];
    const index = history.findIndex(d => d.id === doseId);
    if (index !== -1) {
      history[index].status = status;
      history[index].actualTime = actualTime;
    } else {
      history.push({
         id: doseId,
         status,
         actualTime
      });
    }
    await db.ref(`doseHistory/${patientUid}`).set(history.map(d => ({
      ...d,
      scheduledTime: d.scheduledTime instanceof Date ? d.scheduledTime.toISOString() : d.scheduledTime,
      actualTime: d.actualTime instanceof Date ? d.actualTime.toISOString() : d.actualTime
    })));
  },

  updateSensorData: async (patientUid, key, value) => {
    await db.ref(`sensorData/${patientUid}/${key}`).set(value);
  },

  // User Profile Cloud Methods
  createUserProfile: async (uid, email, role, linkedEmail = '') => {
    await db.ref(`users/${uid}`).set({
      email,
      role,
      linkedEmail: role === 'caregiver' ? linkedEmail : '',
      name: email.split('@')[0]
    });
  },

  getUserProfile: async (uid) => {
    const snapshot = await db.ref(`users/${uid}`).once('value');
    return snapshot.val();
  },

  // Fetch a Patient's UID based on their email
  getPatientUidByEmail: async (patientEmail) => {
    const usersSnapshot = await db.ref('users').once('value');
    let patientUid = null;
    usersSnapshot.forEach(child => {
      const u = child.val();
      if (u.role === 'patient' && u.email === patientEmail) {
        patientUid = child.key;
      }
    });
    return patientUid;
  },

  // Save FCM registration token for push notifications
  saveUserToken: async (uid, token) => {
    await db.ref(`users/${uid}/fcmToken`).set(token);
  },

  // Send a real-time reminder from Caregiver to Patient
  sendCaregiverReminder: async (patientEmail, message) => {
    const patientUid = await CloudDB.getPatientUidByEmail(patientEmail);
    if (patientUid) {
      await db.ref(`reminders/${patientUid}`).set({
        message: message,
        timestamp: Date.now()
      });
      return true;
    }
    return false;
  }
};

// Initialize Messaging (if supported by the browser)
let messaging = null;
try {
  if (firebase.messaging.isSupported()) {
    messaging = firebase.messaging();
  }
} catch (e) {
  console.warn("Firebase Messaging not supported in this browser session:", e);
}

// Request permissions and fetch registration token
async function requestNotificationPermission(userId) {
  if (!messaging || typeof Notification === 'undefined') return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await messaging.getToken({ 
        vapidKey: 'BPI7hBuVHadL0hMEkglVNuJfhcfjTfWVIByRvm1Fh_bvknsWtjLqTz4HD8VVl6zqmtjSMA9H0HIvvj9iB439TkU' 
      });
      if (token) {
        console.log("FCM Registration Token:", token);
        await CloudDB.saveUserToken(userId, token);
        return token;
      }
    }
  } catch (err) {
    console.error("Failed to register for push notifications:", err);
  }
  return null;
}
