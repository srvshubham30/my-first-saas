// ==========================================================================
// 1. DATABASE SETUP & CONFIGURATIONS (TOP)
// ==========================================================================
let store = JSON.parse(localStorage.getItem('Grind90_MultiSaaS_Data')) || {
    activeId: null,
    challenges: {}
};

let currentEditingDay = null;

// USERS VALUE STATE ACCUMULATION
// let userProfile = {
//     isPremium: false // Mock testing: Change to true to test unlock state!
// };

// ==========================================================================
// 2. DOM ENGINE HOOKS
// ==========================================================================
const totalMetricCount = document.getElementById('total-metric-count');
const challengeSelector = document.getElementById('challenge-selector');
const activeChallengeTitle = document.getElementById('active-challenge-title');
const grid = document.getElementById('challenge-grid');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const progressPercent = document.getElementById('progress-percent');
const streakCount = document.getElementById('streak-count');

const modal = document.getElementById('day-modal');
const modalTitle = document.getElementById('modal-title');
const metricInput = document.getElementById('metric-input');
const noteInput = document.getElementById('note-input');
const autofillHint = document.getElementById('autofill-hint');

const daysSelect = document.getElementById('new-challenge-days');

// ==========================================================================
// 3. APPLICATION INITIALIZATION
// ==========================================================================
function init() {
    const keys = Object.keys(store.challenges);
    
    if (!store.activeId || !store.challenges[store.activeId]) {
        store.activeId = keys.length > 0 ? keys[0] : null;
    }
    
    refreshSelectorDropdown();
    challengeSelector.value = store.activeId || '';
    renderDashboard();
}

// ==========================================================================
// 4. RENDERING & UX CORE LOGIC
// ==========================================================================
function renderDashboard() {
    const activeChallenge = store.challenges[store.activeId];
    
    if (!activeChallenge) {
        activeChallengeTitle.innerText = "No active challenges. Create one above!";
        grid.innerHTML = '';
        updateAnalyticsVisibility(0, 0, 0, 0, 0);
        return;
    }

    activeChallengeTitle.innerText = activeChallenge.name;
    
    const start = new Date(activeChallenge.startDate);
    const today = new Date();
    const timeDiff = today - start;
    const currentDayIndex = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;

    grid.innerHTML = '';
    const totalDays = activeChallenge.totalDays;

    for (let i = 1; i <= totalDays; i++) {
        const card = document.createElement('div');
        card.classList.add('day-card');
        
        const dayKey = `day_${i}`;
        const isCompleted = activeChallenge.days[dayKey]?.completed;

        if (isCompleted) card.classList.add('completed');
        if (i === currentDayIndex) card.classList.add('current-day');

        card.innerHTML = `
            <span>${i}</span>
            <span class="indicator">${isCompleted ? '✓' : (i === currentDayIndex ? 'Today' : '')}</span>
        `;

        card.addEventListener('click', () => openDayConfiguration(i));
        grid.appendChild(card);
    }
    
    calculateAnalytics(activeChallenge, totalDays);
}

// Open modal logic with Smart Auto-Fill system integration
function openDayConfiguration(dayNumber) {
    currentEditingDay = dayNumber;
    const activeChallenge = store.challenges[store.activeId];
    if (!activeChallenge) return;

    const dayKey = `day_${dayNumber}`;
    const prevDayKey = `day_${dayNumber - 1}`;

    modalTitle.innerText = `Update Progress: Day ${dayNumber}`;
    
    const currentData = activeChallenge.days[dayKey] || {};
    const prevData = activeChallenge.days[prevDayKey] || {};

    noteInput.value = currentData.note || '';
    
    // Core Auto-Fill Engine: Runs condition parameters
    if (currentData.metric !== undefined && currentData.metric !== "") {
        metricInput.value = currentData.metric;
        autofillHint.style.display = 'none'; 
    } else if (prevData.metric !== undefined && prevData.metric !== "") {
        // Smart pre-fill from yesterday
        metricInput.value = prevData.metric;
        autofillHint.style.display = 'block'; 
    } else {
        metricInput.value = '';
        autofillHint.style.display = 'none';
    }

    modal.classList.add('active');
}

// ==========================================================================
// 5. EVENT TRIGGERS & FORM ACTIONS
// ==========================================================================
document.getElementById('save-day-btn').addEventListener('click', () => {
    const activeChallenge = store.challenges[store.activeId];
    if (!activeChallenge) return;

    const dayKey = `day_${currentEditingDay}`;
    if (!activeChallenge.days[dayKey]) activeChallenge.days[dayKey] = {};
    
    activeChallenge.days[dayKey].completed = true;
    activeChallenge.days[dayKey].metric = metricInput.value !== "" ? Number(metricInput.value) : 0;
    activeChallenge.days[dayKey].note = noteInput.value.trim();

    saveAndRefresh();
    modal.classList.remove('active');
});

document.getElementById('clear-day-btn').addEventListener('click', () => {
    const activeChallenge = store.challenges[store.activeId];
    if (!activeChallenge) return;

    const dayKey = `day_${currentEditingDay}`;
    if (activeChallenge.days[dayKey]) delete activeChallenge.days[dayKey];
    
    saveAndRefresh();
    modal.classList.remove('active');
});

// Create Challenge Engine with Premium Gate Checker Unified
document.getElementById('create-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('new-challenge-name');
    const title = nameInput.value.trim();
    
    if (!title) {
        alert('Please enter a valid challenge name!');
        return;
    }

    // PREMIUM CONDITION GUARD FILTER
    const selectedOption = daysSelect.options[daysSelect.selectedIndex];
    const isOptionPremium = selectedOption.getAttribute('data-premium') === 'true';

    if (isOptionPremium && !userProfile.isPremium) {
        alert("❌ Premium Locked! Upgrade to unlock the multi-year journey.");
        return; 
    }

    const totalDays = parseInt(daysSelect.value, 10);
    const id = 'id_' + Date.now();
    
    store.challenges[id] = {
        name: title,
        totalDays: totalDays,
        startDate: new Date().toISOString().split('T')[0],
        days: {}
    };

    store.activeId = id;
    nameInput.value = '';
    
    refreshSelectorDropdown();
    challengeSelector.value = id;
    saveAndRefresh();
});

document.getElementById('delete-challenge-btn').addEventListener('click', () => {
    if (!store.activeId) return;
    if (confirm('Are you sure you want to delete this challenge container?')) {
        delete store.challenges[store.activeId];
        
        const keys = Object.keys(store.challenges);
        store.activeId = keys.length > 0 ? keys[0] : null;
        
        refreshSelectorDropdown();
        challengeSelector.value = store.activeId || '';
        saveAndRefresh();
    }
});

challengeSelector.addEventListener('change', (e) => {
    store.activeId = e.target.value || null;
    saveAndRefresh();
});

function refreshSelectorDropdown() {
    challengeSelector.innerHTML = '';
    const keys = Object.keys(store.challenges);
    
    if (keys.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.innerText = '-- No Active Challenges --';
        challengeSelector.appendChild(option);
        return;
    }

    keys.forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.innerText = store.challenges[id].name;
        challengeSelector.appendChild(option);
    });
}

// ==========================================================================
// 6. ANALYTICS ENGINE COMPUTATION LAYER
// ==========================================================================
function calculateAnalytics(challenge, totalDays) {
    let completedCount = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let totalVolume = 0; 

    for (let i = 1; i <= totalDays; i++) {
        const dayData = challenge.days[`day_${i}`];
        if (dayData?.completed) {
            completedCount++;
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
            
            if (dayData.metric) {
                totalVolume += Number(dayData.metric);
            }
        } else {
            currentStreak = 0;
        }
    }
    const percent = Math.round((completedCount / totalDays) * 100) || 0;
    updateAnalyticsVisibility(completedCount, totalDays, percent, maxStreak, totalVolume);
}

function updateAnalyticsVisibility(count, total, percent, streak = 0, totalVolume = 0) {
    progressBar.style.width = `${percent}%`;
    progressText.innerText = `${count} / ${total} Days`;
    progressPercent.innerText = `${percent}%`;
    streakCount.innerText = streak;
    if (totalMetricCount) {
        totalMetricCount.innerText = totalVolume; 
    }
}

function saveAndRefresh() {
    localStorage.setItem('Grind90_MultiSaaS_Data', JSON.stringify(store));
    renderDashboard();
}

document.getElementById('close-modal').addEventListener('click', () => modal.classList.remove('active'));

// Initialize Engine
init();

// // LocalStorage check taaki reload par state maintain rahe
// if (localStorage.getItem('Grind90_User_Premium') === 'true') {
//     userProfile.isPremium = true;
//     hidePremiumButton();
// }

// // Payment Button Trigger Click
// document.getElementById('buy-premium-btn')?.addEventListener('click', function() {
//     // 1. User ko aapke real Razorpay Payment Page par bhejega tab me
//     window.open("https://rzp.io/l/your_page_id", "_blank"); // 👈 Yahan apna asli Razorpay page link dalo

//     // 2. Sweet confirmation popup jo browser me aayega
//     setTimeout(() => {
//         let confirmPayment = confirm("🎉 Thank you for the support!\n\nDid you complete the payment on the Razorpay page?");
//         if (confirmPayment) {
//             // Permanent free browser storage unlock
//             userProfile.isPremium = true;
//             localStorage.setItem('Grind90_User_Premium', 'true');
//             hidePremiumButton();
//             renderDashboard(); // Refresh screens
//             alert("👑 Premium Lifetime Features Activated on this browser! Thank you, brother.");
//         }
//     }, 1000); 
// });

// // UI Helper State Manager
// function hidePremiumButton() {
//     const promoCard = document.getElementById('premium-promo-card');
//     if (promoCard) {
//         promoCard.innerHTML = "<span>👑 Status: <strong>Premium Patron Member (Pro)</strong> ✨</span>";
//         promoCard.style.border = "1px solid var(--accent-green)";
//     }
// }