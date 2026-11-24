/* ============================================
   MediGuard - Smart Pill Dispenser
   Main Application JavaScript
   ============================================ */

// ============================================
// 1. CONSTANTS & MOCK DATA
// ============================================

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const MEAL_SLOTS = [
  { id: 'm_before', title: 'Morning', subtitle: 'Before Food', defaultTime: '08:00', compartment: 1 },
  { id: 'm_after', title: 'Morning', subtitle: 'After Food', defaultTime: '09:00', compartment: 2 },
  { id: 'a_before', title: 'Afternoon', subtitle: 'Before Food', defaultTime: '13:00', compartment: 3 },
  { id: 'a_after', title: 'Afternoon', subtitle: 'After Food', defaultTime: '14:00', compartment: 4 },
  { id: 'n_before', title: 'Night', subtitle: 'Before Food', defaultTime: '20:00', compartment: 5 },
  { id: 'n_after', title: 'Night', subtitle: 'After Food', defaultTime: '21:00', compartment: 6 }
];

const MOCK_USER = {
  name: 'Harshini',
  age: 72,
  email: 'harshini@example.com',
  caregiverName: 'Priya',
  caregiverPhone: '+91 98765 43210',
  caregiverEmail: 'priya@example.com',
  fingerprintEnrolled: true
};

const MOCK_MEDICATIONS = [
  {
    id: 'med1',
    name: 'Metformin',
    dosage: '500mg',
    type: 'tablet',
    pillCount: 28,
    refillThreshold: 7,
    mealSlots: ['m_after', 'n_after'],
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    instructions: 'Take with food',
    color: '#00D4FF'
  },
  {
    id: 'med2',
    name: 'Amlodipine',
    dosage: '5mg',
    type: 'tablet',
    pillCount: 30,
    refillThreshold: 5,
    mealSlots: ['m_before'],
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    instructions: 'Take on empty stomach',
    color: '#A78BFA'
  },
  {
    id: 'med3',
    name: 'Atorvastatin',
    dosage: '10mg',
    type: 'tablet',
    pillCount: 4,
    refillThreshold: 7,
    mealSlots: ['n_before'],
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    instructions: 'Take before bedtime',
    color: '#F472B6'
  },
  {
    id: 'med4',
    name: 'Vitamin D3',
    dosage: '1000IU',
    type: 'capsule',
    pillCount: 45,
    refillThreshold: 10,
    mealSlots: ['m_after'],
    days: ['Mon', 'Wed', 'Fri'],
    instructions: 'Take with breakfast',
    color: '#FBBF24'
  }
];

const MOCK_SENSOR_DATA = {
  weight: { current: 12.5, unit: 'g', lastUpdated: new Date() },
  waterDetected: false,
  batteryLevel: 78,
  dispenserLocked: false,
  lastDispenseTime: new Date(Date.now() - 3600000),
  isOnline: true,
  compartmentStatus: [true, true, true, true, false, false]
};

// ============================================
// 2. APP STATE
// ============================================

const AppState = {
  currentScreen: 'home',
  previousScreen: null,
  user: { ...MOCK_USER },
  medications: [...MOCK_MEDICATIONS],
  sensorData: { ...MOCK_SENSOR_DATA },
  settings: {
    voiceReminders: true,
    fingerprint: true,
    notifications: true,
    notificationSound: true,
    reminderAdvance: 15,
    mealTimes: {
      'm_before': '08:00',
      'm_after': '09:00',
      'a_before': '13:00',
      'a_after': '14:00',
      'n_before': '20:00',
      'n_after': '21:00'
    }
  },
  historyTab: 'calendar',
  historyFilter: 'all',
  selectedDay: new Date(),
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
  scheduleDay: new Date()
};

// Generate realistic dose history for last 30 days
function generateMockDoseHistory() {
  const history = [];
  const now = new Date();
  
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const dayName = DAYS_SHORT[date.getDay()];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    MOCK_MEDICATIONS.forEach(med => {
      if (!med.days.includes(dayName)) return;

      med.mealSlots.forEach(slotId => {
        const time = AppState.settings.mealTimes[slotId];
        const [h, m] = time.split(':').map(Number);
        const scheduledTime = new Date(date);
        scheduledTime.setHours(h, m, 0, 0);

        // Skip future doses
        if (scheduledTime > now) return;

        const isMorning = h < 12;
        let takenChance;

        if (isMorning) {
          takenChance = isWeekend ? 0.75 : 0.90;
        } else {
          takenChance = 0.70;
        }

        const random = Math.random();
        let status, actualTime;

        if (random < takenChance) {
          const lateChance = Math.random();
          const delayMinutes = lateChance < 0.7 ? Math.floor(Math.random() * 10) :
                               lateChance < 0.9 ? Math.floor(Math.random() * 20) + 10 :
                               Math.floor(Math.random() * 30) + 20;
          actualTime = new Date(scheduledTime.getTime() + delayMinutes * 60000);
          status = delayMinutes > 15 ? 'late' : 'taken';
        } else {
          status = 'missed';
          actualTime = null;
        }

        const slotInfo = MEAL_SLOTS.find(s => s.id === slotId);

        history.push({
          id: `dose-${med.id}-${scheduledTime.getTime()}`,
          medicationId: med.id,
          medicationName: med.name,
          dosage: med.dosage,
          compartment: slotInfo ? slotInfo.compartment : 1,
          scheduledTime: scheduledTime,
          actualTime: actualTime,
          status: status,
          verifiedBy: status !== 'missed' ? 'fingerprint' : null,
          color: med.color
        });
      });
    });
  }

  return history;
}

AppState.doseHistory = generateMockDoseHistory();

let countdownInterval = null;

// ============================================
// 3. UTILITY FUNCTIONS
// ============================================

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatTime(date) {
  if (!date) return '--:--';
  // Firebase returns timestamps as plain numbers — convert them to Date objects
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(date) {
  if (!date) return '';
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateFull(date) {
  if (!date) return '';
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function isSameDay(d1, d2) {
  const a = (d1 instanceof Date) ? d1 : new Date(d1);
  const b = (d2 instanceof Date) ? d2 : new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function getMedicationIcon(type) {
  switch (type) {
    case 'tablet': return 'medication';
    case 'capsule': return 'vaccines';
    case 'liquid': return 'local_drink';
    case 'injection': return 'syringe';
    default: return 'medication';
  }
}

function getDayDosesForDate(date) {
  return AppState.doseHistory.filter(d => isSameDay(d.scheduledTime, date));
}

function getTodaysDoses() {
  return getDayDosesForDate(new Date());
}

function getTodaysScheduledDoses() {
  const today = new Date();
  const dayName = DAYS_SHORT[today.getDay()];
  const doses = [];

  AppState.medications.forEach(med => {
    if (!med.days.includes(dayName)) return;
    med.mealSlots.forEach(slotId => {
      const time = AppState.settings.mealTimes[slotId];
      if (!time) return;
      const [h, m] = time.split(':').map(Number);
      const scheduledTime = new Date(today);
      scheduledTime.setHours(h, m, 0, 0);

      const existing = AppState.doseHistory.find(d => {
        const dTime = (d.scheduledTime instanceof Date) ? d.scheduledTime : new Date(d.scheduledTime);
        return d.medicationId === med.id && isSameDay(d.scheduledTime, today) &&
          dTime.getHours() === h && dTime.getMinutes() === m;
      });

      const slotInfo = MEAL_SLOTS.find(s => s.id === slotId);

      doses.push({
        id: `dose-${med.id}-${scheduledTime.getTime()}`,
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.dosage,
        type: med.type,
        compartment: slotInfo ? slotInfo.compartment : 1,
        slotName: slotInfo ? `${slotInfo.title} - ${slotInfo.subtitle}` : '',
        scheduledTime: scheduledTime,
        actualTime: existing ? existing.actualTime : null,
        status: existing ? existing.status : (scheduledTime < new Date() ? 'missed' : 'pending'),
        color: med.color,
        instructions: med.instructions
      });
    });
  });

  return doses.sort((a, b) => a.scheduledTime - b.scheduledTime);
}

function getNextDose() {
  const now = new Date();
  const todaysDoses = getTodaysScheduledDoses();
  const pendingDoses = todaysDoses.filter(d => d.status === 'pending' && d.scheduledTime > now);

  if (pendingDoses.length > 0) {
    return pendingDoses[0];
  }

  // Check tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDayName = DAYS_SHORT[tomorrow.getDay()];

  for (const med of AppState.medications) {
    if (!med.days.includes(tomorrowDayName)) continue;
    for (const slotId of med.mealSlots) {
      const time = AppState.settings.mealTimes[slotId];
      if (!time) continue;
      const [h, m] = time.split(':').map(Number);
      const scheduledTime = new Date(tomorrow);
      scheduledTime.setHours(h, m, 0, 0);
      
      const slotInfo = MEAL_SLOTS.find(s => s.id === slotId);
      
      return {
        medicationName: med.name,
        dosage: med.dosage,
        scheduledTime: scheduledTime,
        compartment: slotInfo ? slotInfo.compartment : 1,
        color: med.color,
        status: 'pending'
      };
    }
  }
  return null;
}

function getCountdownString(targetTime) {
  const now = new Date();
  const diff = targetTime - now;
  if (diff <= 0) return '00:00:00';

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getLowMedications() {
  return AppState.medications.filter(m => m.pillCount <= m.refillThreshold);
}

// ============================================
// 4. AI PREDICTION ENGINE
// ============================================

function calculateTimeOfDayMissRate(history) {
  const rates = {};
  history.forEach(record => {
    const hour = ((record.scheduledTime instanceof Date) ? record.scheduledTime : new Date(record.scheduledTime)).getHours();
    const period = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    if (!rates[period]) rates[period] = { total: 0, missed: 0 };
    rates[period].total++;
    if (record.status === 'missed') rates[period].missed++;
  });

  Object.keys(rates).forEach(period => {
    rates[period].rate = rates[period].total > 0 ? 
      Math.round((rates[period].missed / rates[period].total) * 100) : 0;
  });

  return rates;
}

function calculateDayOfWeekMissRate(history) {
  const rates = {};
  DAYS_SHORT.forEach(day => rates[day] = { total: 0, missed: 0, rate: 0 });

  history.forEach(record => {
    const day = DAYS_SHORT[record.scheduledTime.getDay()];
    rates[day].total++;
    if (record.status === 'missed') rates[day].missed++;
  });

  Object.keys(rates).forEach(day => {
    rates[day].rate = rates[day].total > 0 ?
      Math.round((rates[day].missed / rates[day].total) * 100) : 0;
  });

  return rates;
}

function calculateOverallAdherence(history, days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = history.filter(r => r.scheduledTime >= cutoff);
  if (recent.length === 0) return 100;

  const taken = recent.filter(r => r.status === 'taken' || r.status === 'late').length;
  return Math.round((taken / recent.length) * 100);
}

function getCurrentStreak(history) {
  const today = new Date();
  let streak = 0;

  for (let i = 0; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayDoses = getDayDosesForDate(date);

    if (dayDoses.length === 0) {
      if (i === 0) continue;
      break;
    }

    const allTaken = dayDoses.every(d => d.status === 'taken' || d.status === 'late');
    if (allTaken) {
      streak++;
    } else {
      if (i > 0) break;
    }
  }

  return streak;
}

function predictNextMiss(history, medications) {
  const predictions = [];
  const timeRates = calculateTimeOfDayMissRate(history);
  const dayRates = calculateDayOfWeekMissRate(history);

  medications.forEach(med => {
    const medHistory = history.filter(h => h.medicationId === med.id);
    const missed = medHistory.filter(h => h.status === 'missed').length;
    const total = medHistory.length;
    const missRate = total > 0 ? Math.round((missed / total) * 100) : 0;

    // Find worst time and day for this med
    let worstDay = 'Mon', worstDayRate = 0;
    Object.entries(dayRates).forEach(([day, data]) => {
      if (data.rate > worstDayRate) {
        worstDay = day;
        worstDayRate = data.rate;
      }
    });

    let worstTime = 'Evening', worstTimeRate = 0;
    Object.entries(timeRates).forEach(([period, data]) => {
      if (data.rate > worstTimeRate) {
        worstTime = period;
        worstTimeRate = data.rate;
      }
    });

    const riskLevel = missRate > 30 ? 'high' : missRate > 15 ? 'medium' : 'low';

    predictions.push({
      medicationId: med.id,
      medicationName: med.name,
      dosage: med.dosage,
      color: med.color,
      missRate: missRate,
      riskLevel: riskLevel,
      worstDay: worstDay,
      worstTime: worstTime,
      recommendation: missRate > 20 ?
        `Set a reminder 30 minutes before your ${worstTime.toLowerCase()} dose` :
        'Keep up the great work! Your adherence is good.'
    });
  });

  return predictions;
}

function generateInsight(predictions) {
  const highRisk = predictions.filter(p => p.riskLevel === 'high');
  if (highRisk.length > 0) {
    const med = highRisk[0];
    return `You often miss your ${med.worstTime.toLowerCase()} ${med.medicationName} dose. We've set an early reminder for you!`;
  }

  const medRisk = predictions.filter(p => p.riskLevel === 'medium');
  if (medRisk.length > 0) {
    const med = medRisk[0];
    return `Your ${med.medicationName} adherence could improve on ${med.worstDay}s. Try setting a ${med.worstDay} alarm.`;
  }

  return 'Great job! Your medication adherence has been excellent this week. 🎉';
}

// ============================================
// 5. COMPONENT RENDERING FUNCTIONS
// ============================================

function renderProgressRing(percentage, size = 60, strokeWidth = 4, color = 'var(--accent)') {
  const radius = (size / 2) - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return `
    <div class="progress-ring" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}">
        <circle class="bg" cx="${size/2}" cy="${size/2}" r="${radius}" stroke-width="${strokeWidth}"/>
        <circle class="fill" cx="${size/2}" cy="${size/2}" r="${radius}" stroke-width="${strokeWidth}"
          style="stroke:${color};stroke-dasharray:${circumference};stroke-dashoffset:${offset}"/>
      </svg>
      <div class="progress-ring-label">${percentage}%</div>
    </div>
  `;
}

function renderDoseCard(dose) {
  const statusBadge = {
    'taken': '<span class="badge badge-success">✅ Taken</span>',
    'missed': '<span class="badge badge-danger">❌ Missed</span>',
    'late': '<span class="badge badge-warning">⚠️ Late</span>',
    'pending': '<span class="badge badge-pending">⏳ Pending</span>'
  };

  let actionButton = '';
  if (AppState.role === 'caregiver') {
    if (dose.status !== 'taken') {
      actionButton = `
        <div style="display:flex;gap:6px;flex-direction:column;margin-top:8px">
          <button class="btn btn-primary btn-sm" onclick="sendCaregiverReminder('${dose.id}')" style="padding:6px 8px;font-size:11px;justify-content:center">
            <span class="material-icons-round" style="font-size:14px">notifications_active</span> Remind
          </button>
          <button class="btn btn-secondary btn-sm" onclick="manualOverrideDose('${dose.id}')" style="padding:6px 8px;font-size:11px;justify-content:center">
            <span class="material-icons-round" style="font-size:14px">check_circle</span> Override
          </button>
        </div>
      `;
    }
  } else {
    if (dose.status === 'pending') {
      actionButton = `
        <button class="btn btn-primary btn-sm" onclick="handleTakeDose('${dose.id}', '${dose.medicationId}', '${dose.medicationName}', '${dose.dosage}', ${dose.compartment})">
          <span class="material-icons-round" style="font-size:16px">fingerprint</span> Take
        </button>
      `;
    }
  }

  const med = AppState.medications.find(m => m.id === dose.medicationId);
  const iconBg = `background:${dose.color}22;color:${dose.color}`;
  
  const slotDisplay = dose.slotName ? 
    `<div style="font-size:11px;color:var(--accent);margin-top:4px;font-weight:600;display:flex;align-items:center;gap:4px">
      <span class="material-icons-round" style="font-size:14px">inventory_2</span>
      Comp ${dose.compartment} · ${dose.slotName}
    </div>` : '';

  return `
    <div class="dose-card ${dose.status}" style="--dose-color:${dose.color}">
      <div class="dose-card-icon" style="${iconBg}">
        <span class="material-icons-round">${getMedicationIcon(med?.type || 'tablet')}</span>
      </div>
      <div class="dose-card-info">
        <div class="dose-card-name">${dose.medicationName}</div>
        <div class="dose-card-dosage">${dose.dosage}${dose.instructions ? ' · ' + dose.instructions : ''}</div>
        <div class="dose-card-time">
          <span class="material-icons-round" style="font-size:14px">schedule</span>
          ${formatTime(dose.scheduledTime)}
          ${dose.actualTime ? ' → ' + formatTime(dose.actualTime) : ''}
        </div>
        ${slotDisplay}
      </div>
      <div class="dose-card-action">
        ${statusBadge[dose.status] || ''}
        ${actionButton}
      </div>
    </div>
  `;
}

function renderStatCard(icon, value, label, iconBg = 'var(--accent-glow)', iconColor = 'var(--accent)') {
  return `
    <div class="stat-card">
      <div class="stat-icon" style="background:${iconBg};color:${iconColor}">
        <span class="material-icons-round">${icon}</span>
      </div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

function renderSectionHeader(title, actionText = '', actionOnClick = '') {
  return `
    <div class="section-header">
      <div class="section-title">${title}</div>
      ${actionText ? `<button class="section-action" onclick="${actionOnClick}">${actionText}</button>` : ''}
    </div>
  `;
}

function renderBottomNav() {
  let items = [];
  if (AppState.role === 'caregiver') {
    items = [
      { id: 'home', icon: 'dashboard', label: 'Dashboard' },
      { id: 'schedule', icon: 'calendar_today', label: 'Patient Status' },
      { id: 'alerts', icon: 'notifications_active', label: 'Alerts' },
      { id: 'settings', icon: 'person', label: 'Profile' }
    ];
  } else {
    items = [
      { id: 'home', icon: 'dashboard', label: 'Home' },
      { id: 'schedule', icon: 'calendar_today', label: 'Schedule' },
      { id: 'add', icon: 'add', label: '' },
      { id: 'history', icon: 'bar_chart', label: 'History' },
      { id: 'settings', icon: 'person', label: 'Profile' }
    ];
  }

  return `
    <nav class="bottom-nav">
      ${items.map(item => {
        if (item.id === 'add') {
          return `
            <button class="nav-item-add" onclick="navigateTo('add')" aria-label="Add Medication">
              <span class="material-icons-round">add</span>
            </button>
          `;
        }
        return `
          <button class="nav-item ${AppState.currentScreen === item.id ? 'active' : ''}"
                  onclick="navigateTo('${item.id}')">
            <span class="material-icons-round">${item.icon}</span>
            <span>${item.label}</span>
          </button>
        `;
      }).join('')}
    </nav>
  `;
}

// Caregiver Actions
async function sendCaregiverReminder(doseId) {
  showToast('Sending reminder...', 'info');
  const dose = AppState.doseHistory.find(d => d.id === doseId);
  const medName = dose ? dose.medicationName : 'medication';
  const msg = `Please take your dose of ${medName}!`;

  if (AppState.role === 'caregiver' && AppState.user.linkedEmail) {
    const success = await CloudDB.sendCaregiverReminder(AppState.user.linkedEmail, msg);
    if (success) {
      showToast('Reminder sent to patient successfully!', 'success');
    } else {
      showToast('Could not find linked patient account', 'danger');
    }
  } else {
    showToast('No linked patient email found', 'warning');
  }
}

function manualOverrideDose(doseId) {
  if (confirm("Are you sure you want to manually mark this dose as taken?")) {
    const dose = AppState.doseHistory.find(d => d.id === doseId);
    if (dose) {
      dose.status = 'taken';
      dose.actualTime = new Date();
      // Sync to Firebase under Patient's UID
      db.ref(`doseHistory/${AppState.patientUid}`).set(AppState.doseHistory.map(d => ({
        ...d,
        scheduledTime: d.scheduledTime instanceof Date ? d.scheduledTime.toISOString() : d.scheduledTime,
        actualTime: d.actualTime instanceof Date ? d.actualTime.toISOString() : d.actualTime
      })));
      showToast('Dose manually marked as taken', 'success');
      renderApp();
    }
  }
}

// ============================================
// 6. SCREEN RENDERING FUNCTIONS
// ============================================

function renderHomeScreen() {
  const todaysDoses = getTodaysScheduledDoses();
  const nextDose = getNextDose();
  const adherence = calculateOverallAdherence(AppState.doseHistory, 7);
  const streak = getCurrentStreak(AppState.doseHistory);
  const lowMeds = getLowMedications();
  const predictions = predictNextMiss(AppState.doseHistory, AppState.medications);
  const insight = generateInsight(predictions);
  const minPills = Math.min(...AppState.medications.map(m => m.pillCount));
  const pillWarning = minPills <= 10;

  const countdownClass = nextDose && (nextDose.scheduledTime - new Date()) < 300000 ? 'urgent' : '';

  return `
    <div class="screen" id="home-screen">
      <!-- Greeting -->
      <div class="greeting">
        <div class="greeting-text">
          ${AppState.role === 'caregiver' ? `Monitoring Patient, ${AppState.patientName || 'User'}` : `${getGreeting()}, ${AppState.user.name}`} <span class="greeting-wave">👋</span>
        </div>
        <div class="greeting-date">${formatDateFull(new Date())}</div>
      </div>

      <!-- Dispenser Status -->
      <div class="flex-between mb-md" style="padding:8px 12px;background:var(--bg-card);border-radius:var(--radius-md);border:1px solid var(--border-subtle)">
        <div class="status-indicator">
          <span class="status-dot ${AppState.sensorData.isOnline ? 'online' : 'offline'}"></span>
          Dispenser ${AppState.sensorData.isOnline ? 'Online' : 'Offline'}
        </div>
        <div class="status-indicator">
          <span class="material-icons-round" style="font-size:16px;color:${AppState.sensorData.batteryLevel > 30 ? 'var(--success)' : 'var(--danger)'}">
            ${AppState.sensorData.batteryLevel > 60 ? 'battery_full' : AppState.sensorData.batteryLevel > 30 ? 'battery_half' : 'battery_low'}
          </span>
          ${AppState.sensorData.batteryLevel}%
        </div>
      </div>

      <!-- Next Dose Countdown -->
      ${nextDose ? `
        <div class="card" style="text-align:center;margin-bottom:var(--space-lg)">
          <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:var(--space-sm)">Next Dose In</div>
          <div class="countdown-time ${countdownClass}" id="countdown-display">
            ${getCountdownString(nextDose.scheduledTime)}
          </div>
          <div class="countdown-med-name" style="color:${nextDose.color}">${nextDose.medicationName}</div>
          <div class="countdown-med-dosage">${nextDose.dosage}</div>
          ${(nextDose.scheduledTime - new Date()) < 1800000 && nextDose.status === 'pending' && AppState.role === 'patient' ? `
            <button class="btn btn-primary mt-lg" onclick="handleTakeDose('${nextDose.id || ''}', '${nextDose.medicationId || ''}', '${nextDose.medicationName}', '${nextDose.dosage}')">
              <span class="material-icons-round">fingerprint</span> Take Now
            </button>
          ` : ''}
        </div>
      ` : `
        <div class="card text-center mb-lg">
          <div class="countdown-med-name">All doses complete! 🎉</div>
          <div class="countdown-med-dosage">Great job today</div>
        </div>
      `}

      <!-- Today's Schedule -->
      ${renderSectionHeader("Today's Schedule", `${todaysDoses.filter(d => d.status === 'taken' || d.status === 'late').length}/${todaysDoses.length} done`)}
      <div style="margin-bottom:var(--space-lg)">
        ${todaysDoses.length > 0 ? todaysDoses.map(d => renderDoseCard(d)).join('') : `
          <div class="card text-center">
            <span class="material-icons-round" style="font-size:48px;color:var(--text-muted)">event_available</span>
            <p class="text-muted mt-sm">No doses scheduled for today</p>
          </div>
        `}
      </div>

      <!-- Quick Stats -->
      ${renderSectionHeader('Quick Stats')}
      <div class="stats-row">
        ${renderStatCard('favorite', `${adherence}%`, 'Adherence', 'var(--accent-glow)', 'var(--accent)')}
        ${renderStatCard('local_fire_department', `${streak}`, 'Day Streak', 'var(--success-bg)', 'var(--success)')}
        ${renderStatCard('medication', `${minPills}`, 'Pills Left', pillWarning ? 'var(--danger-bg)' : 'var(--accent-glow)', pillWarning ? 'var(--danger)' : 'var(--accent)')}
      </div>

      <!-- AI Insight -->
      ${renderSectionHeader('AI Insights', 'View All', "navigateTo('predictions')")}
      <div class="insight-card" onclick="navigateTo('predictions')">
        <div class="insight-card-label">
          <span class="material-icons-round" style="font-size:16px">psychology</span>
          AI PREDICTION
        </div>
        <div class="insight-card-text">${insight}</div>
      </div>

      <!-- Refill Alerts -->
      ${lowMeds.length > 0 ? `
        ${renderSectionHeader('Refill Alerts')}
        ${lowMeds.map(med => `
          <div class="refill-alert" style="margin-bottom:var(--space-sm)">
            <div class="refill-alert-icon">💊</div>
            <div>
              <div style="font-weight:600;font-size:14px">${med.name} is running low</div>
              <div class="refill-alert-text">
                <span class="refill-alert-count">${med.pillCount} pills</span> remaining (threshold: ${med.refillThreshold})
              </div>
            </div>
          </div>
        `).join('')}
      ` : ''}

      <!-- Quick Actions -->
      ${renderSectionHeader('Quick Actions')}
      <div class="quick-actions" style="margin-bottom:var(--space-3xl)">
        <div class="quick-action-card" onclick="navigateTo('sensors')">
          <div class="quick-action-icon" style="background:var(--accent-glow);color:var(--accent)">
            <span class="material-icons-round">sensors</span>
          </div>
          <div>
            <div class="quick-action-text">Sensor Status</div>
            <div class="quick-action-sub">View dispenser data</div>
          </div>
        </div>
        <div class="quick-action-card" onclick="navigateTo('predictions')">
          <div class="quick-action-icon" style="background:var(--info-bg);color:var(--info)">
            <span class="material-icons-round">insights</span>
          </div>
          <div>
            <div class="quick-action-text">AI Insights</div>
            <div class="quick-action-sub">View predictions</div>
          </div>
        </div>
      </div>
    </div>
    ${renderBottomNav()}
  `;
}

function renderScheduleScreen() {
  const today = new Date();
  const selectedDate = AppState.scheduleDay;
  const dayName = DAYS_SHORT[selectedDate.getDay()];

  // Generate week days
  const weekDays = [];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    weekDays.push(d);
  }

  // Get scheduled medications for selected day
  const scheduledMeds = [];
  AppState.medications.forEach(med => {
    if (!med.days.includes(dayName)) return;
    med.mealSlots.forEach(slotId => {
      const time = AppState.settings.mealTimes[slotId];
      if (!time) return;
      const [h, m] = time.split(':').map(Number);
      const scheduledTime = new Date(selectedDate);
      scheduledTime.setHours(h, m, 0, 0);

      const existing = AppState.doseHistory.find(d => {
        const dTime = (d.scheduledTime instanceof Date) ? d.scheduledTime : new Date(d.scheduledTime);
        return d.medicationId === med.id && isSameDay(d.scheduledTime, selectedDate) &&
          dTime.getHours() === h && dTime.getMinutes() === m;
      });

      const slotInfo = MEAL_SLOTS.find(s => s.id === slotId);

      scheduledMeds.push({
        id: `dose-${med.id}-${scheduledTime.getTime()}`,
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.dosage,
        type: med.type,
        compartment: slotInfo ? slotInfo.compartment : 1,
        slotName: slotInfo ? `${slotInfo.title} - ${slotInfo.subtitle}` : '',
        scheduledTime: scheduledTime,
        actualTime: existing ? existing.actualTime : null,
        status: existing ? existing.status : (scheduledTime < new Date() ? 'missed' : 'pending'),
        color: med.color,
        instructions: med.instructions
      });
    });
  });

  scheduledMeds.sort((a, b) => a.scheduledTime - b.scheduledTime);
  const completed = scheduledMeds.filter(d => d.status === 'taken' || d.status === 'late').length;

  return `
    <div class="screen" id="schedule-screen">
      <div class="app-header">
        <div class="header-title">${AppState.role === 'caregiver' ? "Patient's Schedule" : "Your Schedule"}</div>
        <div class="header-subtitle">${formatDate(selectedDate)}</div>
      </div>

      <!-- Day Selector -->
      <div class="day-selector" style="margin-top:var(--space-lg)">
        ${weekDays.map(d => `
          <button class="day-btn ${isSameDay(d, selectedDate) ? 'active' : ''}"
                  onclick="selectScheduleDay(${d.getTime()})">
            <div class="day-btn-name">${DAYS_SHORT[d.getDay()]}</div>
            <div class="day-btn-date">${d.getDate()}</div>
          </button>
        `).join('')}
      </div>

      <!-- Timeline -->
      <div style="margin-top:var(--space-xl)">
        ${scheduledMeds.length > 0 ? `
          <div class="timeline">
            ${scheduledMeds.map(dose => `
              <div class="timeline-item ${dose.status}">
                <div class="timeline-time">${formatTime(dose.scheduledTime)}</div>
                ${renderDoseCard(dose)}
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="card text-center" style="padding:var(--space-3xl)">
            <span class="material-icons-round" style="font-size:48px;color:var(--text-muted)">event_busy</span>
            <p class="text-muted mt-md">No medications scheduled for ${DAYS_FULL[selectedDate.getDay()]}</p>
          </div>
        `}
      </div>

      <!-- Summary -->
      ${scheduledMeds.length > 0 ? `
        <div class="card text-center" style="margin-top:var(--space-lg);margin-bottom:var(--space-3xl)">
          <div style="font-size:14px;color:var(--text-secondary)">
            <strong style="color:var(--accent)">${completed}</strong> of <strong>${scheduledMeds.length}</strong> doses completed
          </div>
          <div style="height:4px;background:var(--bg-tertiary);border-radius:2px;margin-top:var(--space-sm);overflow:hidden">
            <div style="height:100%;width:${scheduledMeds.length > 0 ? (completed/scheduledMeds.length)*100 : 0}%;background:var(--success);border-radius:2px;transition:width 0.5s ease"></div>
          </div>
        </div>
      ` : ''}
    </div>
    ${renderBottomNav()}
  `;
}

function renderAddMedicationScreen() {
  const colors = ['#00D4FF', '#A78BFA', '#F472B6', '#FBBF24', '#00E5A0', '#FF6B6B', '#FB923C', '#38BDF8'];
  const types = [
    { id: 'tablet', icon: 'medication', label: 'Tablet' },
    { id: 'capsule', icon: 'vaccines', label: 'Capsule' },
    { id: 'liquid', icon: 'local_drink', label: 'Liquid' },
    { id: 'injection', icon: 'syringe', label: 'Injection' }
  ];

  return `
    <div class="screen" id="add-screen">
      <div class="app-header">
        <div class="header-row">
          <button class="header-back-btn" onclick="navigateTo('home')">
            <span class="material-icons-round">arrow_back</span>
            Back
          </button>
          <div class="header-title">Add Medication</div>
        </div>
      </div>

      <form id="add-med-form" style="margin-top:var(--space-lg)">
        <div class="form-group">
          <label class="form-label">Medicine Name</label>
          <input type="text" class="form-input" id="med-name" placeholder="e.g. Metformin" required>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--space-md)">
          <div class="form-group">
            <label class="form-label">Dosage</label>
            <input type="text" class="form-input" id="med-dosage" placeholder="e.g. 500" required>
          </div>
          <div class="form-group">
            <label class="form-label">Unit</label>
            <select class="form-select" id="med-unit">
              <option value="mg">mg</option>
              <option value="ml">ml</option>
              <option value="IU">IU</option>
              <option value="mcg">mcg</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Type</label>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-sm)">
            ${types.map(t => `
              <button type="button" class="btn-icon" style="width:100%;height:60px;border-radius:var(--radius-md);flex-direction:column;gap:4px"
                      onclick="selectMedType(this, '${t.id}')" data-type="${t.id}">
                <span class="material-icons-round" style="font-size:22px">${t.icon}</span>
                <span style="font-size:10px">${t.label}</span>
              </button>
            `).join('')}
          </div>
          <input type="hidden" id="med-type" value="tablet">
        </div>

        <div class="form-group">
          <label class="form-label">Meal Schedule (Compartments)</label>
          <div class="meal-slot-grid">
            ${MEAL_SLOTS.map(slot => `
              <button type="button" class="meal-slot-btn" data-slot="${slot.id}" onclick="toggleMealSlot(this)">
                <span class="material-icons-round meal-slot-icon">
                  ${slot.title === 'Morning' ? 'light_mode' : slot.title === 'Afternoon' ? 'wb_sunny' : 'dark_mode'}
                </span>
                <span class="meal-slot-title">${slot.title}</span>
                <span class="meal-slot-subtitle">${slot.subtitle}</span>
                <span class="badge badge-info" style="margin-top:4px;font-size:9px;background:var(--bg-secondary)">Comp ${slot.compartment}</span>
              </button>
            `).join('')}
          </div>
          <div class="text-muted" style="font-size:12px;margin-top:4px">Select one or more meal times for this medication.</div>
        </div>

        <div class="form-group">
          <label class="form-label">Days</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button type="button" class="btn btn-sm btn-primary" onclick="toggleAllDays()" id="all-days-btn">Every Day</button>
            ${DAYS_SHORT.map(day => `
              <button type="button" class="btn btn-sm btn-secondary day-toggle active" data-day="${day}"
                      onclick="toggleDay(this)" style="min-width:40px">${day}</button>
            `).join('')}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md)">
          <div class="form-group">
            <label class="form-label">Pill Count</label>
            <input type="number" class="form-input" id="med-pill-count" value="30" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Refill Alert At</label>
            <input type="number" class="form-input" id="med-refill" value="7" min="1">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Special Instructions</label>
          <textarea class="form-textarea" id="med-instructions" placeholder="e.g. Take with food, before bed..."></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Color</label>
          <div class="color-picker">
            ${colors.map((c, i) => `
              <button type="button" class="color-option ${i === 0 ? 'selected' : ''}" style="background:${c}"
                      data-color="${c}" onclick="selectColor(this, '${c}')"></button>
            `).join('')}
          </div>
          <input type="hidden" id="med-color" value="#00D4FF">
        </div>

        <button type="submit" class="btn btn-primary btn-block" style="margin-top:var(--space-xl);margin-bottom:var(--space-3xl)">
          <span class="material-icons-round">save</span>
          Save Medication
        </button>
      </form>
    </div>
    ${renderBottomNav()}
  `;
}

function renderHistoryScreen() {
  const activeTab = AppState.historyTab;

  let tabContent = '';

  if (activeTab === 'calendar') {
    tabContent = renderCalendarTab();
  } else if (activeTab === 'list') {
    tabContent = renderListTab();
  } else {
    tabContent = renderAnalyticsTab();
  }

  return `
    <div class="screen" id="history-screen">
      <div class="app-header">
        <div class="header-title">History</div>
        <div class="header-subtitle">Track your medication journey</div>
      </div>

      <div class="tabs" style="margin-top:var(--space-lg)">
        <button class="tab ${activeTab === 'calendar' ? 'active' : ''}" onclick="switchHistoryTab('calendar')">Calendar</button>
        <button class="tab ${activeTab === 'list' ? 'active' : ''}" onclick="switchHistoryTab('list')">List</button>
        <button class="tab ${activeTab === 'analytics' ? 'active' : ''}" onclick="switchHistoryTab('analytics')">Analytics</button>
      </div>

      ${tabContent}
    </div>
    ${renderBottomNav()}
  `;
}

function renderCalendarTab() {
  const month = AppState.calendarMonth;
  const year = AppState.calendarYear;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const today = new Date();

  let calendarDays = '';

  // Previous month padding
  const prevMonth = new Date(year, month, 0);
  for (let i = startDay - 1; i >= 0; i--) {
    const day = prevMonth.getDate() - i;
    calendarDays += `<div class="calendar-day other-month">${day}</div>`;
  }

  // Current month days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dayDoses = getDayDosesForDate(date);
    const isToday = isSameDay(date, today);
    const isSelected = isSameDay(date, AppState.selectedDay);

    let dayClass = 'no-data';
    if (dayDoses.length > 0) {
      const taken = dayDoses.filter(d => d.status === 'taken' || d.status === 'late').length;
      const ratio = taken / dayDoses.length;
      if (ratio >= 0.9) dayClass = 'all-taken';
      else if (ratio >= 0.5) dayClass = 'some-missed';
      else dayClass = 'most-missed';
    }

    calendarDays += `
      <div class="calendar-day ${dayClass} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
           onclick="selectCalendarDay(${date.getTime()})"
           style="${isSelected ? 'border-color:var(--accent);font-weight:700' : ''}">
        ${day}
      </div>
    `;
  }

  // Next month padding
  const remaining = 42 - (startDay + lastDay.getDate());
  for (let i = 1; i <= remaining; i++) {
    calendarDays += `<div class="calendar-day other-month">${i}</div>`;
  }

  // Selected day detail
  const selectedDoses = getDayDosesForDate(AppState.selectedDay);

  return `
    <div class="calendar-nav">
      <button class="btn-icon" onclick="changeCalendarMonth(-1)">
        <span class="material-icons-round">chevron_left</span>
      </button>
      <div class="calendar-month">${MONTHS[month]} ${year}</div>
      <button class="btn-icon" onclick="changeCalendarMonth(1)">
        <span class="material-icons-round">chevron_right</span>
      </button>
    </div>

    <div class="calendar-grid">
      ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="calendar-header">${d}</div>`).join('')}
      ${calendarDays}
    </div>

    <!-- Selected Day Detail -->
    <div style="margin-top:var(--space-xl)">
      ${renderSectionHeader(formatDate(AppState.selectedDay))}
      ${selectedDoses.length > 0 ? selectedDoses.map(d => renderDoseCard(d)).join('') : `
        <div class="card text-center" style="padding:var(--space-xl)">
          <p class="text-muted">No dose records for this day</p>
        </div>
      `}
    </div>
  `;
}

function renderListTab() {
  const filter = AppState.historyFilter;
  let filtered = [...AppState.doseHistory].reverse();

  if (filter !== 'all') {
    filtered = filtered.filter(d => d.status === filter);
  }

  // Group by date
  const grouped = {};
  filtered.forEach(d => {
    const key = formatDate(d.scheduledTime);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  });

  return `
    <div style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-lg);flex-wrap:wrap">
      ${['all', 'taken', 'missed', 'late'].map(f => `
        <button class="btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}" onclick="setHistoryFilter('${f}')">
          ${f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      `).join('')}
    </div>

    ${Object.keys(grouped).length > 0 ? Object.entries(grouped).slice(0, 10).map(([date, doses]) => `
      <div style="margin-bottom:var(--space-xl)">
        <div style="font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:var(--space-sm);text-transform:uppercase;letter-spacing:0.5px">${date}</div>
        ${doses.map(d => `
          <div class="dose-card ${d.status}" style="--dose-color:${d.color}">
            <div class="dose-card-icon" style="background:${d.color}22;color:${d.color}">
              <span class="material-icons-round">medication</span>
            </div>
            <div class="dose-card-info">
              <div class="dose-card-name">${d.medicationName}</div>
              <div class="dose-card-dosage">${d.dosage}</div>
              <div class="dose-card-time">
                <span class="material-icons-round" style="font-size:14px">schedule</span>
                ${formatTime(d.scheduledTime)}
                ${d.actualTime ? ' → ' + formatTime(d.actualTime) : ''}
              </div>
            </div>
            <div>
              ${d.status === 'taken' ? '<span class="badge badge-success">✅ Taken</span>' :
                d.status === 'missed' ? '<span class="badge badge-danger">❌ Missed</span>' :
                '<span class="badge badge-warning">⚠️ Late</span>'}
              ${d.verifiedBy ? `<div style="font-size:10px;color:var(--text-muted);margin-top:4px;text-align:right">🔒 ${d.verifiedBy}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `).join('') : `
      <div class="card text-center" style="padding:var(--space-3xl)">
        <span class="material-icons-round" style="font-size:48px;color:var(--text-muted)">search_off</span>
        <p class="text-muted mt-md">No records found</p>
      </div>
    `}
  `;
}

function renderAnalyticsTab() {
  const adherence7 = calculateOverallAdherence(AppState.doseHistory, 7);
  const adherence30 = calculateOverallAdherence(AppState.doseHistory, 30);
  const streak = getCurrentStreak(AppState.doseHistory);
  const dayRates = calculateDayOfWeekMissRate(AppState.doseHistory);
  const timeRates = calculateTimeOfDayMissRate(AppState.doseHistory);

  const totalDoses = AppState.doseHistory.length;
  const takenDoses = AppState.doseHistory.filter(d => d.status === 'taken').length;
  const missedDoses = AppState.doseHistory.filter(d => d.status === 'missed').length;
  const lateDoses = AppState.doseHistory.filter(d => d.status === 'late').length;

  // Generate last 7 days adherence
  const last7days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayDoses = getDayDosesForDate(date);
    const taken = dayDoses.filter(d => d.status === 'taken' || d.status === 'late').length;
    const rate = dayDoses.length > 0 ? Math.round((taken / dayDoses.length) * 100) : 0;
    last7days.push({ day: DAYS_SHORT[date.getDay()], rate: rate });
  }

  return `
    <!-- Overall Stats -->
    <div class="stats-row" style="margin-bottom:var(--space-xl)">
      <div class="stat-card">
        ${renderProgressRing(adherence7, 56, 4, 'var(--accent)')}
        <div class="stat-label mt-sm">7-Day</div>
      </div>
      <div class="stat-card">
        ${renderProgressRing(adherence30, 56, 4, 'var(--info)')}
        <div class="stat-label mt-sm">30-Day</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--success)">${streak}</div>
        <div class="stat-label">Streak</div>
      </div>
    </div>

    <!-- 7-Day Bar Chart -->
    ${renderSectionHeader('Last 7 Days')}
    <div class="chart-container">
      <div class="bar-chart">
        ${last7days.map(d => `
          <div class="bar-chart-item">
            <div class="bar-chart-value">${d.rate}%</div>
            <div class="bar-chart-bar" style="height:${Math.max(d.rate, 5)}%;background:${d.rate >= 80 ? 'var(--success)' : d.rate >= 50 ? 'var(--warning)' : 'var(--danger)'}"></div>
            <div class="bar-chart-label">${d.day}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Time of Day Analysis -->
    ${renderSectionHeader('By Time of Day')}
    <div class="card">
      ${Object.entries(timeRates).map(([period, data]) => `
        <div class="flex-between" style="padding:var(--space-sm) 0;${period !== Object.keys(timeRates).pop() ? 'border-bottom:1px solid var(--border-subtle)' : ''}">
          <div>
            <div style="font-weight:600;font-size:14px">${period}</div>
            <div style="font-size:12px;color:var(--text-muted)">${data.total} doses total</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700;color:${data.rate > 20 ? 'var(--danger)' : 'var(--success)'}">${data.rate}% missed</div>
            <div style="font-size:12px;color:var(--text-muted)">${data.missed} missed</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Summary Counts -->
    ${renderSectionHeader('Summary')}
    <div class="card" style="margin-bottom:var(--space-3xl)">
      <div class="flex-between" style="padding:var(--space-sm) 0;border-bottom:1px solid var(--border-subtle)">
        <span>Total Doses</span>
        <strong>${totalDoses}</strong>
      </div>
      <div class="flex-between" style="padding:var(--space-sm) 0;border-bottom:1px solid var(--border-subtle)">
        <span style="color:var(--success)">✅ Taken On Time</span>
        <strong style="color:var(--success)">${takenDoses}</strong>
      </div>
      <div class="flex-between" style="padding:var(--space-sm) 0;border-bottom:1px solid var(--border-subtle)">
        <span style="color:var(--warning)">⚠️ Taken Late</span>
        <strong style="color:var(--warning)">${lateDoses}</strong>
      </div>
      <div class="flex-between" style="padding:var(--space-sm) 0">
        <span style="color:var(--danger)">❌ Missed</span>
        <strong style="color:var(--danger)">${missedDoses}</strong>
      </div>
    </div>
  `;
}

function renderSettingsScreen() {
  const user = AppState.user;
  const settings = AppState.settings;
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return `
    <div class="screen" id="settings-screen">
      <div class="app-header">
        <div class="header-title">Settings</div>
      </div>

      <!-- Profile -->
      <div class="card" style="text-align:center;margin-top:var(--space-lg)">
        <div class="avatar" style="margin:0 auto var(--space-md)">${initials}</div>
        <div style="font-family:Outfit;font-weight:700;font-size:20px">${user.name}</div>
        <div class="text-secondary" style="font-size:14px">${user.email}</div>
      </div>

      <!-- Reminders -->
      <div class="settings-group" style="margin-top:var(--space-2xl)">
        <div class="settings-group-title">Reminders</div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:var(--accent-glow);color:var(--accent)">
              <span class="material-icons-round">record_voice_over</span>
            </div>
            <div>
              <div class="settings-item-text">Voice Reminders</div>
              <div class="settings-item-subtitle">Speak medication name at dose time</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${settings.voiceReminders ? 'checked' : ''} onchange="toggleSetting('voiceReminders')">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:var(--warning-bg);color:var(--warning)">
              <span class="material-icons-round">notifications_active</span>
            </div>
            <div>
              <div class="settings-item-text">Notification Sound</div>
              <div class="settings-item-subtitle">Play alert sound for reminders</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${settings.notificationSound ? 'checked' : ''} onchange="toggleSetting('notificationSound')">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:var(--info-bg);color:var(--info)">
              <span class="material-icons-round">timer</span>
            </div>
            <div>
              <div class="settings-item-text">Reminder Advance</div>
              <div class="settings-item-subtitle">${settings.reminderAdvance} min before dose time</div>
            </div>
          </div>
          <select class="form-select" style="width:auto;padding:8px 12px" onchange="updateReminderAdvance(this.value)">
            ${[5, 10, 15, 30].map(m => `<option value="${m}" ${settings.reminderAdvance === m ? 'selected' : ''}>${m} min</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Meal Times -->
      <div class="settings-group">
        <div class="settings-group-title">Meal Times (Dispenser Compartments)</div>
        ${MEAL_SLOTS.map(slot => `
          <div class="settings-item">
            <div class="settings-item-left">
              <div class="settings-item-icon" style="background:var(--bg-tertiary);color:var(--text-secondary)">
                <span class="material-icons-round">
                  ${slot.title === 'Morning' ? 'light_mode' : slot.title === 'Afternoon' ? 'wb_sunny' : 'dark_mode'}
                </span>
              </div>
              <div>
                <div class="settings-item-text">${slot.title} - ${slot.subtitle}</div>
                <div class="settings-item-subtitle">Compartment ${slot.compartment}</div>
              </div>
            </div>
            <input type="time" class="form-input" style="width:120px;padding:8px 12px" 
                   value="${settings.mealTimes[slot.id]}" 
                   onchange="updateMealTime('${slot.id}', this.value)">
          </div>
        `).join('')}
      </div>

      <!-- Security -->
      <div class="settings-group">
        <div class="settings-group-title">Security</div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:var(--success-bg);color:var(--success)">
              <span class="material-icons-round">fingerprint</span>
            </div>
            <div>
              <div class="settings-item-text">Fingerprint Verification</div>
              <div class="settings-item-subtitle">Require fingerprint to mark dose as taken</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${settings.fingerprint ? 'checked' : ''} onchange="toggleSetting('fingerprint')">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Caregiver -->
      <div class="settings-group">
        <div class="settings-group-title">Caregiver</div>
        <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:var(--space-md)">
          <div class="flex-between">
            <div class="settings-item-left">
              <div class="settings-item-icon" style="background:var(--danger-bg);color:var(--danger)">
                <span class="material-icons-round">people</span>
              </div>
              <div>
                <div class="settings-item-text">${user.caregiverName}</div>
                <div class="settings-item-subtitle">${user.caregiverPhone}</div>
              </div>
            </div>
          </div>
          <div style="padding-left:50px">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--space-sm)">
              Email: ${user.caregiverEmail}
            </div>
            <button class="btn btn-sm btn-secondary" onclick="testCaregiverAlert()">
              <span class="material-icons-round" style="font-size:16px">notification_important</span>
              Test Alert
            </button>
          </div>
        </div>
      </div>

      <!-- Dispenser -->
      <div class="settings-group">
        <div class="settings-group-title">Dispenser</div>
        <div class="settings-item" onclick="navigateTo('sensors')">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:var(--accent-glow);color:var(--accent)">
              <span class="material-icons-round">sensors</span>
            </div>
            <div>
              <div class="settings-item-text">Sensor Dashboard</div>
              <div class="settings-item-subtitle">View dispenser status & sensor data</div>
            </div>
          </div>
          <span class="material-icons-round" style="color:var(--text-muted)">chevron_right</span>
        </div>
      </div>

      <!-- Voice Test -->
      <div class="settings-group">
        <div class="settings-group-title">Voice</div>
        <div class="settings-item" onclick="testVoice()">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:var(--accent-glow);color:var(--accent)">
              <span class="material-icons-round">volume_up</span>
            </div>
            <div>
              <div class="settings-item-text">Test Voice Reminder</div>
              <div class="settings-item-subtitle">Hear a sample medication reminder</div>
            </div>
          </div>
          <span class="material-icons-round" style="color:var(--text-muted)">play_arrow</span>
        </div>
      </div>

      <!-- About -->
      <div class="settings-group">
        <div class="settings-group-title">About</div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:var(--bg-tertiary);color:var(--text-secondary)">
              <span class="material-icons-round">info</span>
            </div>
            <div>
              <div class="settings-item-text">MediGuard</div>
              <div class="settings-item-subtitle">Version 1.0.0</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Logout -->
      <button class="btn btn-danger btn-block" style="margin-bottom:var(--space-3xl)" onclick="handleLogout()">
        <span class="material-icons-round">logout</span>
        Log Out
      </button>
    </div>
    ${renderBottomNav()}
  `;
}

function renderPredictionScreen() {
  const predictions = predictNextMiss(AppState.doseHistory, AppState.medications);
  const dayRates = calculateDayOfWeekMissRate(AppState.doseHistory);
  const timeRates = calculateTimeOfDayMissRate(AppState.doseHistory);
  const overallAdherence = calculateOverallAdherence(AppState.doseHistory, 30);

  const overallRisk = overallAdherence >= 85 ? 'low' : overallAdherence >= 70 ? 'medium' : 'high';
  const riskLabel = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' };
  const riskColor = { low: 'var(--success)', medium: 'var(--warning)', high: 'var(--danger)' };

  return `
    <div class="screen" id="prediction-screen">
      <div class="app-header">
        <div class="header-row">
          <button class="header-back-btn" onclick="navigateTo('home')">
            <span class="material-icons-round">arrow_back</span>
            Back
          </button>
        </div>
        <div class="header-title" style="margin-top:var(--space-sm)">AI Predictions</div>
        <div class="header-subtitle">Behavior analysis & adherence insights</div>
      </div>

      <!-- Overall Risk -->
      <div class="risk-card ${overallRisk}" style="margin-top:var(--space-xl);text-align:center">
        <span class="material-icons-round" style="font-size:48px;color:${riskColor[overallRisk]}">
          ${overallRisk === 'low' ? 'verified' : overallRisk === 'medium' ? 'warning' : 'error'}
        </span>
        <div style="font-family:Outfit;font-weight:700;font-size:24px;margin-top:var(--space-sm);color:${riskColor[overallRisk]}">
          ${riskLabel[overallRisk]}
        </div>
        <div class="text-secondary" style="font-size:14px;margin-top:4px">
          ${overallAdherence}% overall adherence (30 days)
        </div>
      </div>

      <!-- Per-Medication Predictions -->
      ${renderSectionHeader('Medication Analysis')}
      ${predictions.map(pred => `
        <div class="card" style="margin-bottom:var(--space-md)">
          <div class="flex-between">
            <div class="flex gap-md" style="align-items:center">
              <div style="width:8px;height:8px;border-radius:50%;background:${pred.color}"></div>
              <div>
                <div style="font-weight:600">${pred.medicationName}</div>
                <div class="text-muted" style="font-size:12px">${pred.dosage}</div>
              </div>
            </div>
            <span class="badge badge-${pred.riskLevel === 'low' ? 'success' : pred.riskLevel === 'medium' ? 'warning' : 'danger'}">
              ${pred.missRate}% miss rate
            </span>
          </div>
          <div class="risk-meter" style="margin-top:var(--space-md)">
            <div class="risk-meter-fill" style="width:${pred.missRate}%;background:${pred.riskLevel === 'low' ? 'var(--success)' : pred.riskLevel === 'medium' ? 'var(--warning)' : 'var(--danger)'}"></div>
          </div>
          <div style="margin-top:var(--space-md);font-size:13px">
            <div class="text-secondary">
              <span class="material-icons-round" style="font-size:14px;vertical-align:middle">pattern</span>
              Most misses: <strong>${pred.worstDay}s</strong> in the <strong>${pred.worstTime.toLowerCase()}</strong>
            </div>
            <div style="margin-top:6px;color:var(--accent)">
              <span class="material-icons-round" style="font-size:14px;vertical-align:middle">lightbulb</span>
              ${pred.recommendation}
            </div>
          </div>
        </div>
      `).join('')}

      <!-- Day of Week Pattern -->
      ${renderSectionHeader('Miss Rate by Day')}
      <div class="chart-container">
        <div class="bar-chart">
          ${DAYS_SHORT.map(day => {
            const rate = dayRates[day]?.rate || 0;
            return `
              <div class="bar-chart-item">
                <div class="bar-chart-value">${rate}%</div>
                <div class="bar-chart-bar" style="height:${Math.max(rate, 5)}%;background:${rate > 25 ? 'var(--danger)' : rate > 15 ? 'var(--warning)' : 'var(--success)'}"></div>
                <div class="bar-chart-label">${day}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Time of Day Pattern -->
      ${renderSectionHeader('Miss Rate by Time')}
      <div class="card" style="margin-bottom:var(--space-3xl)">
        ${Object.entries(timeRates).map(([period, data]) => `
          <div style="padding:var(--space-md) 0;${period !== Object.keys(timeRates).pop() ? 'border-bottom:1px solid var(--border-subtle)' : ''}">
            <div class="flex-between">
              <div>
                <span style="font-size:20px">${period === 'Morning' ? '🌅' : period === 'Afternoon' ? '☀️' : '🌙'}</span>
                <span style="font-weight:600;margin-left:8px">${period}</span>
              </div>
              <span style="font-weight:700;color:${data.rate > 20 ? 'var(--danger)' : 'var(--success)'}">${data.rate}%</span>
            </div>
            <div class="risk-meter" style="margin-top:6px">
              <div class="risk-meter-fill" style="width:${data.rate}%;background:${data.rate > 20 ? 'var(--danger)' : data.rate > 10 ? 'var(--warning)' : 'var(--success)'}"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
// Hardware Simulation Functions
function speakAlert(message) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("Speech Synthesis not supported in this browser.");
  }
}

function simulateWaterSensor() {
  const sensor = AppState.sensorData;
  sensor.waterDetected = !sensor.waterDetected;
  
  if (sensor.waterDetected) {
    sensor.dispenserLocked = true;
    showToast('Water detected! Dispenser locked.', 'warning');
    speakAlert("Please clean the tray before next dose.");
  } else {
    sensor.dispenserLocked = false;
    showToast('Tray dried. Dispenser unlocked.', 'success');
  }
  
  if (AppState.currentScreen === 'sensors') renderApp();
}

function simulateDispenseCycle() {
  const sensor = AppState.sensorData;
  if (sensor.dispenserLocked) {
    showToast('Cannot dispense: Dispenser is locked!', 'danger');
    return;
  }
  
  // 1. Prepare to dispense
  sensor.weight.current = 0.0;
  sensor.weight.lastUpdated = new Date();
  if (AppState.currentScreen === 'sensors') renderApp();
  showToast('Dispensing pill...', 'info');
  
  // 2. Pill lands in slanted tray
  setTimeout(() => {
    sensor.weight.current = 2.5;
    sensor.weight.lastUpdated = new Date();
    if (AppState.currentScreen === 'sensors') renderApp();
    showToast('Pill dispensed into slanted tray', 'success');
    
    // 3. User picks it up
    setTimeout(() => {
      sensor.weight.current = 0.0;
      sensor.weight.lastUpdated = new Date();
      if (AppState.currentScreen === 'sensors') renderApp();
      showToast('Pill removed from tray', 'info');
    }, 4000);
    
  }, 1500);
}

}

function renderSensorScreen() {
  const sensor = AppState.sensorData;

  return `
    <div class="screen" id="sensor-screen">
      <div class="app-header">
        <div class="header-row">
          <button class="header-back-btn" onclick="navigateTo('home')">
            <span class="material-icons-round">arrow_back</span>
            Back
          </button>
        </div>
        <div class="header-title" style="margin-top:var(--space-sm)">Sensor Dashboard</div>
        <div class="header-subtitle">Real-time dispenser status</div>
      </div>

      <!-- Hardware Simulator Controls -->
      ${renderSectionHeader('Hardware Simulation')}
      <div class="card" style="margin-bottom:var(--space-xl); background: rgba(0, 212, 255, 0.05); border-color: var(--accent);">
        <div style="font-size:12px; color:var(--accent); margin-bottom:var(--space-sm); font-weight:600;">TESTING CONTROLS</div>
        <div class="flex gap-sm" style="flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" onclick="simulateWaterSensor()" style="flex:1;min-width:120px;justify-content:center;">
            <span class="material-icons-round" style="font-size:16px">water_drop</span>
            Toggle Spill
          </button>
          <button class="btn btn-secondary btn-sm" onclick="simulateDispenseCycle()" style="flex:1;min-width:120px;justify-content:center;">
            <span class="material-icons-round" style="font-size:16px">scale</span>
            Dispense Pill
          </button>
        </div>
      </div>

      <!-- Connection Status -->
      <div class="card" style="margin-top:var(--space-xl)">
        <div class="flex-between">
          <div class="flex gap-md" style="align-items:center">
            <span class="status-dot ${sensor.isOnline ? 'online' : 'offline'}" style="width:12px;height:12px"></span>
            <div>
              <div style="font-weight:600;font-size:16px">Dispenser ${sensor.isOnline ? 'Online' : 'Offline'}</div>
              <div class="text-muted" style="font-size:12px">Last seen: ${formatTime(new Date())}</div>
            </div>
          </div>
          <span class="material-icons-round" style="font-size:32px;color:${sensor.isOnline ? 'var(--success)' : 'var(--danger)'}">
            ${sensor.isOnline ? 'wifi' : 'wifi_off'}
          </span>
        </div>
      </div>

      <!-- Battery -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span class="material-icons-round" style="font-size:18px;vertical-align:middle;margin-right:6px">battery_std</span>
            Battery Level
          </div>
          <span style="font-family:Outfit;font-weight:700;font-size:24px;color:${sensor.batteryLevel > 50 ? 'var(--success)' : sensor.batteryLevel > 20 ? 'var(--warning)' : 'var(--danger)'}">
            ${sensor.batteryLevel}%
          </span>
        </div>
        <div class="battery-bar">
          <div class="battery-fill ${sensor.batteryLevel > 50 ? 'high' : sensor.batteryLevel > 20 ? 'medium' : 'low'}"
               style="width:${sensor.batteryLevel}%"></div>
        </div>
        <div class="text-muted" style="font-size:12px;margin-top:var(--space-sm)">
          Estimated ${Math.round(sensor.batteryLevel * 0.5)} hours remaining
        </div>
      </div>

      <!-- Weight Sensor -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span class="material-icons-round" style="font-size:18px;vertical-align:middle;margin-right:6px">scale</span>
            Slanted Tray Load Cell
          </div>
        </div>
        <div style="text-align:center;padding:var(--space-lg) 0">
          <div class="gauge-container">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle class="gauge-bg" cx="60" cy="60" r="52" stroke-dasharray="245" stroke-dashoffset="82" transform="rotate(135, 60, 60)"/>
              <circle class="gauge-fill" cx="60" cy="60" r="52" stroke="var(--accent)" stroke-dasharray="245" stroke-dashoffset="${245 - (sensor.weight.current / 30) * 163}" transform="rotate(135, 60, 60)"/>
            </svg>
            <div class="gauge-label">
              <div class="gauge-value">${sensor.weight.current}</div>
              <div class="gauge-unit">${sensor.weight.unit}</div>
            </div>
          </div>
        </div>
        <div class="text-muted text-center" style="font-size:12px">
          Last updated: ${formatTime(sensor.weight.lastUpdated)}
        </div>
      </div>

      <!-- Water Detection -->
      <div class="card" style="border-color:${sensor.waterDetected ? 'rgba(255,184,0,0.3)' : 'var(--border-subtle)'}">
        <div class="flex-between">
          <div class="flex gap-md" style="align-items:center">
            <span class="material-icons-round" style="font-size:28px;color:${sensor.waterDetected ? 'var(--warning)' : 'var(--success)'}">
              ${sensor.waterDetected ? 'water_drop' : 'check_circle'}
            </span>
            <div>
              <div style="font-weight:600">Water Detection</div>
              <div class="text-muted" style="font-size:13px">
                ${sensor.waterDetected ? '⚠️ Moisture detected! Please dry the tray.' : '✅ Tray is dry'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Compartment Status -->
      ${renderSectionHeader('Compartment Status')}
      <div class="compartment-grid">
        ${sensor.compartmentStatus.slice(0, 6).map((filled, i) => {
          const slot = MEAL_SLOTS[i];
          return `
          <div class="compartment ${filled ? 'filled' : 'empty'}">
            <div class="compartment-number">${i + 1}</div>
            <div class="compartment-label">${slot.title}<br>${slot.subtitle}</div>
            <span class="material-icons-round" style="font-size:14px;margin-top:4px">${filled ? 'check' : 'close'}</span>
          </div>
        `}).join('')}
      </div>

      <!-- Lock & Last Dispense -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);margin-top:var(--space-lg);margin-bottom:var(--space-3xl)">
        <div class="card text-center">
          <span class="material-icons-round" style="font-size:32px;color:${sensor.dispenserLocked ? 'var(--danger)' : 'var(--success)'}">
            ${sensor.dispenserLocked ? 'lock' : 'lock_open'}
          </span>
          <div style="font-weight:600;font-size:14px;margin-top:var(--space-sm)">
            ${sensor.dispenserLocked ? 'Locked' : 'Unlocked'}
          </div>
          <div class="text-muted" style="font-size:11px">Dispenser Lock</div>
        </div>
        <div class="card text-center">
          <span class="material-icons-round" style="font-size:32px;color:var(--accent)">history</span>
          <div style="font-weight:600;font-size:14px;margin-top:var(--space-sm)">
            ${formatTime(sensor.lastDispenseTime)}
          </div>
          <div class="text-muted" style="font-size:11px">Last Dispense</div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// 7. NAVIGATION & ROUTING
// ============================================

function navigateTo(screen) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  AppState.previousScreen = AppState.currentScreen;
  AppState.currentScreen = screen;
  renderApp();
}

function renderApp() {
  const app = document.getElementById('app');
  let html = '';

  switch (AppState.currentScreen) {
    case 'home':
      html = renderHomeScreen();
      break;
    case 'schedule':
      html = renderScheduleScreen();
      break;
    case 'add':
      html = renderAddMedicationScreen();
      break;
    case 'history':
      html = renderHistoryScreen();
      break;
    case 'alerts':
      html = renderAlertsScreen();
      break;
    case 'settings':
      html = renderSettingsScreen();
      break;
    case 'predictions':
      html = renderPredictionScreen();
      break;
    case 'sensors':
      html = renderSensorScreen();
      break;
    default:
      html = renderHomeScreen();
  }

  app.innerHTML = html;

  // Start countdown timer on home screen
  if (AppState.currentScreen === 'home') {
    startCountdown();
  }

  // Attach form handler on add screen
  if (AppState.currentScreen === 'add') {
    setTimeout(() => {
      const form = document.getElementById('add-med-form');
      if (form) {
        form.addEventListener('submit', handleAddMedication);
      }
    }, 100);
  }
}

// ============================================
// 8. EVENT HANDLERS & INTERACTIVITY
// ============================================

function startCountdown() {
  const nextDose = getNextDose();
  if (!nextDose) return;

  countdownInterval = setInterval(() => {
    const display = document.getElementById('countdown-display');
    if (display) {
      const countdown = getCountdownString(nextDose.scheduledTime);
      display.textContent = countdown;

      const diff = nextDose.scheduledTime - new Date();
      if (diff < 300000) {
        display.classList.add('urgent');
      }

      if (diff <= 0) {
        clearInterval(countdownInterval);
        display.textContent = "NOW!";
        display.classList.add('urgent');

        // Trigger voice reminder
        if (AppState.settings.voiceReminders) {
          speakReminder(nextDose.medicationName, nextDose.dosage);
        }
      }
    }
  }, 1000);
}

function handleTakeDose(doseId, medId, medName, dosage) {
  if (AppState.settings.fingerprint) {
    showFingerprintModal(doseId, medId, medName, dosage);
  } else {
    markDoseAsTaken(doseId, medId, medName);
  }
}

function showFingerprintModal(doseId, medId, medName, dosage) {
  const modal = document.getElementById('modal-container');
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="event.stopPropagation()">
      <div class="modal-content">
        <div class="modal-icon fingerprint-scanning">
          <span class="material-icons-round" style="font-size:80px;color:var(--accent)">fingerprint</span>
        </div>
        <div class="modal-title">Verifying Identity</div>
        <div class="modal-text">Place your finger on the sensor to verify and record your dose of ${medName} ${dosage}</div>
        <div id="fingerprint-status" class="text-accent">Scanning...</div>
      </div>
    </div>
  `;

  // Simulate fingerprint scan
  setTimeout(() => {
    const statusEl = document.getElementById('fingerprint-status');
    if (statusEl) {
      statusEl.innerHTML = `
        <div style="animation:scaleIn 0.3s ease">
          <span class="material-icons-round" style="font-size:64px;color:var(--success)">check_circle</span>
          <div style="font-family:Outfit;font-weight:700;font-size:20px;color:var(--success);margin-top:var(--space-sm)">Verified!</div>
        </div>
      `;

      // Update the modal icon to success
      const modalIcon = modal.querySelector('.modal-icon');
      if (modalIcon) {
        modalIcon.innerHTML = '';
      }
    }

    setTimeout(() => {
      closeModal();
      markDoseAsTaken(doseId, medId, medName);
    }, 1000);
  }, 2000);
}

function markDoseAsTaken(doseId, medId, medName) {
  const now = new Date();

  // Find existing record and update, or create new
  const existingIndex = AppState.doseHistory.findIndex(d => d.id === doseId);
  if (existingIndex >= 0) {
    AppState.doseHistory[existingIndex].status = 'taken';
    AppState.doseHistory[existingIndex].actualTime = now;
    AppState.doseHistory[existingIndex].verifiedBy = AppState.settings.fingerprint ? 'fingerprint' : 'manual';
  } else {
    // Create new record for today's dose
    const todaysDoses = getTodaysScheduledDoses();
    const dose = todaysDoses.find(d => d.medicationId === medId && d.status === 'pending');
    if (dose) {
      AppState.doseHistory.push({
        id: dose.id,
        medicationId: medId,
        medicationName: medName,
        dosage: dose.dosage,
        scheduledTime: dose.scheduledTime,
        actualTime: now,
        status: 'taken',
        verifiedBy: AppState.settings.fingerprint ? 'fingerprint' : 'manual',
        color: dose.color
      });
    }
  }

  // Decrease pill count
  const med = AppState.medications.find(m => m.id === medId);
  if (med && med.pillCount > 0) {
    med.pillCount--;
  }

  // Sync to Firebase under Patient's UID
  db.ref(`doseHistory/${AppState.user.uid}`).set(AppState.doseHistory.map(d => ({
    ...d,
    scheduledTime: d.scheduledTime instanceof Date ? d.scheduledTime.toISOString() : d.scheduledTime,
    actualTime: d.actualTime instanceof Date ? d.actualTime.toISOString() : d.actualTime
  })));
  db.ref(`medications/${AppState.user.uid}`).set(AppState.medications);

  showToast(`${medName} dose recorded successfully!`, 'success');
  renderApp();
}

function closeModal() {
  const modal = document.getElementById('modal-container');
  modal.style.display = 'none';
  modal.innerHTML = '';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="material-icons-round" style="font-size:20px">
      ${type === 'success' ? 'check_circle' : type === 'danger' ? 'error' : type === 'warning' ? 'warning' : 'info'}
    </span>
    ${message}
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Voice Reminder
function speakReminder(medName, dosage) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(
      `It's time to take your ${medName}, ${dosage}. Please take your medicine.`
    );
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }
}

function testVoice() {
  speakReminder('Metformin', '500 milligrams');
  showToast('Playing voice reminder...', 'info');
}

function testCaregiverAlert() {
  showToast(`Alert sent to ${AppState.user.caregiverName} (${AppState.user.caregiverPhone})`, 'warning');
}

// Schedule Screen
function selectScheduleDay(timestamp) {
  AppState.scheduleDay = new Date(timestamp);
  renderApp();
}

// History Screen
function switchHistoryTab(tab) {
  AppState.historyTab = tab;
  renderApp();
}

function setHistoryFilter(filter) {
  AppState.historyFilter = filter;
  renderApp();
}

function selectCalendarDay(timestamp) {
  AppState.selectedDay = new Date(timestamp);
  renderApp();
}

function changeCalendarMonth(delta) {
  AppState.calendarMonth += delta;
  if (AppState.calendarMonth > 11) {
    AppState.calendarMonth = 0;
    AppState.calendarYear++;
  } else if (AppState.calendarMonth < 0) {
    AppState.calendarMonth = 11;
    AppState.calendarYear--;
  }
  renderApp();
}

// Settings
function toggleSetting(key) {
  AppState.settings[key] = !AppState.settings[key];
  showToast(`${key.replace(/([A-Z])/g, ' $1').trim()} ${AppState.settings[key] ? 'enabled' : 'disabled'}`, 'info');
}

function updateReminderAdvance(value) {
  AppState.settings.reminderAdvance = parseInt(value);
  showToast(`Reminder set to ${value} minutes before dose`, 'info');
}

function updateMealTime(slotId, timeStr) {
  AppState.settings.mealTimes[slotId] = timeStr;
  showToast('Meal time updated', 'success');
  AppState.doseHistory = generateMockDoseHistory();
}

// Add Medication Form
function selectMedType(btn, type) {
  document.querySelectorAll('[data-type]').forEach(b => {
    b.style.background = '';
    b.style.borderColor = '';
    b.style.color = '';
  });
  btn.style.background = 'var(--accent-glow)';
  btn.style.borderColor = 'var(--accent)';
  btn.style.color = 'var(--accent)';
  document.getElementById('med-type').value = type;
}

function toggleMealSlot(btn) {
  btn.classList.toggle('active');
}

function handleLogout() {
  AppState.isLoggedIn = false;
  AppState.currentScreen = 'login';
  showToast('Logged out successfully', 'info');
  renderApp();
}

function toggleDay(btn) {
  btn.classList.toggle('active');
  if (btn.classList.contains('active')) {
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-primary');
  } else {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  }
}

function toggleAllDays() {
  const dayBtns = document.querySelectorAll('.day-toggle');
  const allActive = Array.from(dayBtns).every(b => b.classList.contains('active'));

  dayBtns.forEach(btn => {
    if (allActive) {
      btn.classList.remove('active', 'btn-primary');
      btn.classList.add('btn-secondary');
    } else {
      btn.classList.add('active', 'btn-primary');
      btn.classList.remove('btn-secondary');
    }
  });
}

function selectColor(btn, color) {
  document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('med-color').value = color;
}

function handleAddMedication(e) {
  e.preventDefault();

  const name = document.getElementById('med-name').value;
  const dosage = document.getElementById('med-dosage').value;
  const unit = document.getElementById('med-unit').value;
  const type = document.getElementById('med-type').value;
  const pillCount = parseInt(document.getElementById('med-pill-count').value);
  const refillThreshold = parseInt(document.getElementById('med-refill').value);
  const instructions = document.getElementById('med-instructions').value;
  const color = document.getElementById('med-color').value;

  // Get active meal slots
  const mealSlotBtns = document.querySelectorAll('.meal-slot-btn.active');
  const mealSlots = Array.from(mealSlotBtns).map(btn => btn.dataset.slot);

  // Get active days
  const activeDays = Array.from(document.querySelectorAll('.day-toggle.active')).map(btn => btn.dataset.day);

  if (!name || !dosage || mealSlots.length === 0 || activeDays.length === 0) {
    showToast('Please select at least one meal time and day', 'warning');
    return;
  }

  const newMed = {
    id: 'med' + Date.now(),
    name,
    dosage: dosage + unit,
    type,
    pillCount: isNaN(pillCount) ? 30 : pillCount,
    refillThreshold: isNaN(refillThreshold) ? 7 : refillThreshold,
    mealSlots,
    days: activeDays,
    instructions,
    color
  };

  AppState.medications.push(newMed);
  
  // Re-generate history to ensure the new med's history is created
  AppState.doseHistory = generateMockDoseHistory();

  // Sync to Firebase under Patient's UID
  db.ref(`medications/${AppState.user.uid}`).set(AppState.medications);
  db.ref(`doseHistory/${AppState.user.uid}`).set(AppState.doseHistory.map(d => ({
    ...d,
    scheduledTime: d.scheduledTime instanceof Date ? d.scheduledTime.toISOString() : d.scheduledTime,
    actualTime: d.actualTime instanceof Date ? d.actualTime.toISOString() : d.actualTime
  })));

  showToast(`${name} added successfully!`, 'success');
  navigateTo('home');
}

// ============================================
// 9. SPLASH & LOGIN SCREENS
// ============================================

function renderSplashScreen() {
  return `
    <div style="height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg-primary);animation:fadeIn 0.5s ease">
      <div style="animation:pillDrop 1s ease forwards;margin-bottom:24px">
        <div class="capsule-pill">
          <div class="capsule-pill-left"></div>
          <div class="capsule-pill-right"></div>
        </div>
      </div>
      <div style="font-family:Outfit;font-weight:700;font-size:32px;color:var(--text-primary);animation:fadeIn 0.8s ease 0.3s both">MediGuard</div>
      <div style="color:var(--text-muted);font-size:14px;margin-top:8px;animation:fadeIn 0.8s ease 0.5s both">Smart Pill Dispenser</div>
      <div style="margin-top:40px;animation:fadeIn 1s ease 0.7s both">
        <div style="width:40px;height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden">
          <div style="width:100%;height:100%;background:var(--accent);border-radius:2px;animation:shimmer 1.2s ease infinite;background:linear-gradient(90deg,var(--accent) 0%,var(--accent-dark) 50%,var(--accent) 100%);background-size:200% 100%"></div>
        </div>
      </div>
    </div>
  `;
}

function renderLoginScreen() {
  const isSignUp = AppState.authMode === 'signup';
  
  return `
    <div class="screen" style="display:flex;flex-direction:column;justify-content:center;min-height:100vh;padding-bottom:0;animation:fadeIn 0.5s ease">
      <div style="text-align:center;margin-bottom:30px">
        <div style="display:flex;justify-content:center;margin:0 auto 20px">
          <div class="capsule-pill-small">
            <div class="capsule-pill-left"></div>
            <div class="capsule-pill-right"></div>
          </div>
        </div>
        <h1 style="font-family:Outfit;font-weight:700;font-size:28px;margin:0">Welcome to MediGuard</h1>
        <p style="color:var(--text-secondary);font-size:14px;margin-top:8px;line-height:1.5">AI-powered medication management<br>for a healthier you</p>
      </div>

      <div class="card" style="margin-bottom:16px">
        <h2 style="font-family:Outfit;font-size:20px;margin-bottom:20px;text-align:center">${isSignUp ? 'Create Your Account' : 'Sign In'}</h2>
        
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="auth-email" placeholder="example@mediguard.com" value="">
        </div>
        
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label">Password</label>
          <input type="password" class="form-input" id="auth-password" placeholder="••••••••" value="">
        </div>

        ${isSignUp ? `
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">I am a...</label>
            <select class="form-input" id="auth-role" onchange="toggleCaregiverLinkField(this.value)">
              <option value="patient">Patient (Primary)</option>
              <option value="caregiver">Caregiver (Linked)</option>
            </select>
          </div>

          <div class="form-group" id="caregiver-link-group" style="margin-bottom:16px; display:none;">
            <label class="form-label">Patient Email to Link</label>
            <input type="email" class="form-input" id="auth-linked-email" placeholder="patient@example.com" value="">
          </div>
        ` : ''}

        ${isSignUp ? `
          <button class="btn btn-primary btn-block" onclick="handleSignUp()" style="padding:14px;justify-content:center;margin-top:10px">
            <span class="material-icons-round">person_add</span> Register Account
          </button>
        ` : `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px">
            <button class="btn btn-primary" onclick="handleSignIn('patient')" style="padding:14px;justify-content:center">
              <span class="material-icons-round">person</span> Patient
            </button>
            <button class="btn btn-secondary" onclick="handleSignIn('caregiver')" style="padding:14px;justify-content:center;background:var(--bg-tertiary)">
              <span class="material-icons-round">medical_services</span> Caregiver
            </button>
          </div>
        `}
      </div>

      <div style="text-align:center;margin-top:16px">
        <button class="btn btn-secondary" onclick="toggleAuthMode()" style="background:transparent;border:none;color:var(--accent);font-weight:600">
          ${isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </button>
      </div>

      <div style="text-align:center;margin-top:32px;padding-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;color:var(--text-muted);font-size:12px">
          <span>🔒 Secure Cloud</span>
          <span>·</span>
          <span>🧠 AI-Powered</span>
          <span>·</span>
          <span>📡 IoT Sync</span>
        </div>
      </div>
    </div>
  `;
}

function toggleAuthMode() {
  AppState.authMode = AppState.authMode === 'signup' ? 'signin' : 'signup';
  renderApp();
}

function toggleCaregiverLinkField(role) {
  const field = document.getElementById('caregiver-link-group');
  if (field) {
    field.style.display = role === 'caregiver' ? 'block' : 'none';
  }
}

async function handleSignIn(role) {
  const email = document.getElementById('auth-email')?.value.trim();
  const pass = document.getElementById('auth-password')?.value;

  if (!email || !pass) {
    showToast('Please enter your email and password', 'warning');
    return;
  }

  showToast('Signing in...', 'info');

  try {
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    const profile = await CloudDB.getUserProfile(cred.user.uid);
    
    if (profile) {
      // Validate that the user matches the clicked sign-in portal
      if (profile.role !== role) {
        showToast(`This account is registered as a ${profile.role.toUpperCase()}, not a ${role.toUpperCase()}.`, 'danger');
        auth.signOut();
        return;
      }
      showLoginSuccess(profile.role, profile.name, cred.user.uid, profile.linkedEmail);
    } else {
      // Fallback if profile doesn't exist yet
      showLoginSuccess(role, email.split('@')[0], cred.user.uid);
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function handleSignUp() {
  const email = document.getElementById('auth-email')?.value.trim();
  const pass = document.getElementById('auth-password')?.value;
  const role = document.getElementById('auth-role')?.value;
  const linkedEmail = document.getElementById('auth-linked-email')?.value.trim();

  if (!email || !pass) {
    showToast('Please fill in email and password', 'warning');
    return;
  }
  if (role === 'caregiver' && !linkedEmail) {
    showToast('Please provide the patient email to link', 'warning');
    return;
  }

  showToast('Creating account...', 'info');

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await CloudDB.createUserProfile(cred.user.uid, email, role, linkedEmail);
    showLoginSuccess(role, email.split('@')[0], cred.user.uid, linkedEmail);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function syncCloudStateToApp() {
  if (CloudState.medications && CloudState.medications.length > 0) {
    AppState.medications = CloudState.medications;
  }
  if (CloudState.doseHistory && CloudState.doseHistory.length > 0) {
    AppState.doseHistory = CloudState.doseHistory;
  }
  if (CloudState.sensorData) {
    AppState.sensorData = CloudState.sensorData;
  }
}

async function showLoginSuccess(role, name, uid, linkedEmail = '') {
  AppState.isLoggedIn = true;
  AppState.role = role;
  AppState.user.name = name;
  AppState.user.uid = uid;
  AppState.user.linkedEmail = linkedEmail;
  AppState.currentScreen = 'home';
  
  // Request notification permission and get token
  requestNotificationPermission(uid);

  // Setup database listener & seeding based on role
  if (role === 'patient') {
    await seedDatabaseIfEmpty(uid);
    initializeFirebaseListeners(uid, () => { syncCloudStateToApp(); renderApp(); });
    listenForReminders(uid);
    showToast(`Welcome back, ${name}!`, 'success');
    renderApp();
  } else if (role === 'caregiver') {
    showToast('Connecting to patient data...', 'info');
    const patientUid = await CloudDB.getPatientUidByEmail(linkedEmail);
    if (patientUid) {
      AppState.patientUid = patientUid; // Store patientUid for writes/overrides
      const patientProfile = await CloudDB.getUserProfile(patientUid);
      AppState.patientName = patientProfile ? patientProfile.name : linkedEmail.split('@')[0];
      initializeFirebaseListeners(patientUid, () => { syncCloudStateToApp(); renderApp(); });
      showToast(`Welcome back! Monitoring Patient`, 'success');
      renderApp();
    } else {
      showToast(`Linked patient email (${linkedEmail}) not registered in system!`, 'danger');
      // Force logout if we can't link to a patient
      auth.signOut();
      AppState.isLoggedIn = false;
      AppState.currentScreen = 'login';
      renderApp();
    }
  }
}

let lastReminderTimestamp = null;
let reminderListener = null;

function listenForReminders(uid) {
  // Clean up any previous listener
  if (reminderListener) {
    db.ref(`reminders/${uid}`).off('value', reminderListener);
    reminderListener = null;
  }

  let isFirstLoad = true;

  reminderListener = db.ref(`reminders/${uid}`).on('value', (snapshot) => {
    const reminder = snapshot.val();

    // On the VERY FIRST call after attaching the listener, Firebase immediately
    // fires with whatever is currently in the database (the old data).
    // We skip this first call completely to avoid triggering old reminders.
    if (isFirstLoad) {
      isFirstLoad = false;
      return;
    }

    // From now on, every call means the caregiver just pushed a NEW reminder.
    if (reminder && reminder.message) {
      triggerLocalAlert(reminder.message);
    }
  });
}

function triggerLocalAlert(message) {
  // 1. Show the visual toast FIRST so it never fails
  try {
    showToast(message, 'warning');
  } catch (e) {}

  // 2. Try to speak it out loud (Phones often block this if no screen tap happened recently)
  try {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.log("Audio playback blocked by phone", e);
  }

  // 3. Trigger OS Banner safely
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification('MediGuard Alert', {
            body: message,
            icon: './icon-192.png'
          });
        });
      } else {
        new Notification('MediGuard Alert', {
          body: message,
          icon: './icon-192.png'
        });
      }
    }
  } catch (e) {
    console.log("Local OS notification restricted by browser", e);
  }
}

function renderAlertsScreen() {
  const missedDoses = AppState.doseHistory.filter(d => d.status === 'missed' || d.status === 'late').slice(0, 5);
  const lowMeds = getLowMedications();
  
  return `
    <div class="screen" id="alerts-screen">
      <div class="app-header">
        <div class="header-title">Caregiver Alerts</div>
        <div class="header-subtitle">Recent patient notifications</div>
      </div>

      <div style="margin-top:var(--space-xl)">
        ${renderSectionHeader('Medication Alerts')}
        ${missedDoses.length > 0 ? missedDoses.map(dose => `
          <div class="card" style="margin-bottom:var(--space-md); border-left: 4px solid var(--danger);">
            <div class="flex-between">
              <div class="flex gap-md" style="align-items:center">
                <span class="material-icons-round" style="font-size:24px;color:var(--danger)">warning</span>
                <div>
                  <div style="font-weight:600">${dose.medicationName}</div>
                  <div class="text-muted" style="font-size:12px">Scheduled: ${formatTime(dose.scheduledTime)} · ${formatDateFull(dose.scheduledTime)}</div>
                </div>
              </div>
              <span class="badge badge-${dose.status}">${dose.status.toUpperCase()}</span>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px">
               <button class="btn btn-primary btn-sm" onclick="sendCaregiverReminder('${dose.id}')" style="flex:1;justify-content:center;font-size:12px">
                 <span class="material-icons-round" style="font-size:14px">notifications_active</span> Remind
               </button>
               <button class="btn btn-secondary btn-sm" onclick="manualOverrideDose('${dose.id}')" style="flex:1;justify-content:center;font-size:12px">
                 <span class="material-icons-round" style="font-size:14px">check_circle</span> Override
               </button>
            </div>
          </div>
        `).join('') : `
          <div class="card text-center text-muted">
            <span class="material-icons-round" style="font-size:32px;color:var(--success)">check_circle</span>
            <div style="margin-top:8px">No missed doses!</div>
          </div>
        `}

        ${renderSectionHeader('Inventory Alerts')}
        ${lowMeds.length > 0 ? lowMeds.map(med => `
          <div class="card" style="margin-bottom:var(--space-md); border-left: 4px solid var(--warning);">
            <div class="flex gap-md" style="align-items:center">
              <span class="material-icons-round" style="font-size:24px;color:var(--warning)">inventory_2</span>
              <div>
                <div style="font-weight:600">${med.name} running low</div>
                <div class="text-muted" style="font-size:12px">Only ${med.pillCount} pills left (Threshold: ${med.refillThreshold})</div>
              </div>
            </div>
          </div>
        `).join('') : `
           <div class="card text-center text-muted">
             <span class="material-icons-round" style="font-size:32px;color:var(--success)">inventory</span>
             <div style="margin-top:8px">Inventory levels good.</div>
           </div>
        `}
      </div>
      ${renderBottomNav()}
    </div>
  `;
}

// ============================================
// 10. NAVIGATION UPDATE (with auth guard)
// ============================================

const originalRenderApp = renderApp;

// Override renderApp to include auth check
renderApp = function() {
  const app = document.getElementById('app');

  if (AppState.currentScreen === 'splash') {
    app.innerHTML = renderSplashScreen();
    return;
  }

  if (!AppState.isLoggedIn && AppState.currentScreen !== 'login') {
    AppState.currentScreen = 'login';
  }

  if (AppState.currentScreen === 'login') {
    app.innerHTML = renderLoginScreen();
    return;
  }

  // Call original render for authenticated screens
  let html = '';
  switch (AppState.currentScreen) {
    case 'home': html = renderHomeScreen(); break;
    case 'schedule': html = renderScheduleScreen(); break;
    case 'alerts': html = renderAlertsScreen(); break;
    case 'add': html = renderAddMedicationScreen(); break;
    case 'history': html = renderHistoryScreen(); break;
    case 'settings': html = renderSettingsScreen(); break;
    case 'predictions': html = renderPredictionScreen(); break;
    case 'sensors': html = renderSensorScreen(); break;
    default: html = renderHomeScreen();
  }

  app.innerHTML = html;

  if (AppState.currentScreen === 'home') {
    startCountdown();
  }

  if (AppState.currentScreen === 'add') {
    setTimeout(() => {
      const form = document.getElementById('add-med-form');
      if (form) {
        form.addEventListener('submit', handleAddMedication);
      }
    }, 100);
  }
};

// ============================================
// 11. INITIALIZATION
// ============================================

// Add isLoggedIn to state
AppState.isLoggedIn = false;
AppState.role = null; // 'patient' or 'caregiver'
AppState.authMode = 'signin'; // 'signin' or 'signup'
AppState.currentScreen = 'splash';

document.addEventListener('DOMContentLoaded', async () => {
  // Show splash screen first
  renderApp();

  // After 2.5s, transition to login
  setTimeout(() => {
    AppState.currentScreen = 'login';
    renderApp();
  }, 2500);

  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('SW registered:', reg.scope);
        reg.update(); // Force check for new sw.js
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New update available. Reloading...');
              window.location.reload(true);
            }
          };
        };
      })
      .catch(err => console.log('SW registration failed:', err));
  }
});
