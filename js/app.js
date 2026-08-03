// 1. Global Variables
let isArabic = false;
let menuData = [];
let cardObserver = null; // Store observer to prevent memory leaks on re-renders

// ==========================================
// Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initMenu();

    // Background auto-refresh polling
    setInterval(() => {
        fetchBackgroundData();
    }, CONFIG.AUTO_REFRESH_INTERVAL || 30000);
});

async function initMenu() {
    // 1. STALE-WHILE-REVALIDATE: Check Local Cache First
    const cached = localStorage.getItem('menuData');

    if (cached) {
        // INSTANT RENDER: We have cached data. Render immediately!
        console.log("Serving from cache for instant load...");
        menuData = JSON.parse(cached);
        renderMenu();
        revealSite();
        initAutoScroll();
        
        // 2. REVALIDATE: Fetch fresh data silently in the background
        fetchBackgroundData();
    } else {
        // No cache available (First time visitor). Must wait for API.
        showLoader();
        try {
            await fetchBackgroundData();
            revealSite();
            initAutoScroll();
        } catch (error) {
            showError("Failed to load menu. Please check your connection.");
            revealSite();
            console.error("Initialization error:", error);
        }
    }
}

// Helper to smoothly reveal the site when all data/elements are ready
function revealSite() {
    document.body.classList.add('site-loaded');
}

// ==========================================
// Data Fetching & Caching (Smart Updates)
// ==========================================
async function fetchBackgroundData() {
    if (!CONFIG.API_URL || CONFIG.API_URL === "PASTE_YOUR_WEB_APP_URL_HERE") {
        console.error("API URL not configured.");
        return;
    }

    try {
        // Bypass browser cache with timestamp parameter while supporting Google Apps Script redirects
        const url = `${CONFIG.API_URL}?t=${Date.now()}`;
        const response = await fetch(url, { method: "GET", redirect: "follow" });
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const result = await response.json();
        if (result.error) throw new Error(result.error);

        const newData = result.data;
        const newDataString = JSON.stringify(newData);
        const oldDataString = localStorage.getItem('menuData');

        // INTELLIGENT CACHING: Only re-render if data ACTUALLY changed
        if (newDataString !== oldDataString) {
            console.log("New data detected! Updating UI silently...");
            menuData = newData;
            localStorage.setItem('menuData', newDataString);
            
            // Re-render UI
            renderMenu();
        } else {
            console.log("Data is up to date.");
        }
        revealSite();
    } catch (error) {
        console.error("Background fetch failed:", error);
        if (menuData.length === 0) {
            showError("Failed to load menu. Please check your connection.");
        }
        revealSite();
    }
}

// ==========================================
// Rendering Logic
// ==========================================
function renderMenu() {
    const container = document.getElementById('menu-container');
    container.innerHTML = ''; // Clear loader or old data

    // Group data by category
    const categories = {};
    menuData.forEach(item => {
        const catEn = item.category_en;
        if (!categories[catEn]) {
            categories[catEn] = {
                nameEn: item.category_en,
                nameAr: item.category_ar,
                imageKey: item.image_key || 'coffee.jpeg', // Default image
                items: []
            };
        }
        categories[catEn].items.push(item);
    });

    // Build DOM
    for (const catKey in categories) {
        const category = categories[catKey];
        
        let imgPath = category.imageKey || 'coffee.jpeg';
        if (!imgPath.startsWith('http://') && !imgPath.startsWith('https://') && !imgPath.startsWith('images/') && !imgPath.startsWith('/')) {
            imgPath = `images/${imgPath}`;
        }

        const cardHtml = `
            <div class="menu-card reveal">
                <div class="card-image" style="background-image: url('${imgPath}');"></div>
                <div class="card-content">
                    <h2 class="section-title" data-en="${category.nameEn}" data-ar="${category.nameAr}">
                        ${isArabic ? category.nameAr : category.nameEn}
                    </h2>
                    <div class="item-list">
                        ${category.items.map(item => `
                            <div class="menu-item">
                                <span class="item-name" data-en="${item.name_en}" data-ar="${item.name_ar}">
                                    ${isArabic ? item.name_ar : item.name_en}
                                </span>
                                <span class="item-price">${item.price}</span>
                            </div>
                        `).join('')}
                    </div>
                    <p style="text-align: center; font-size: 1.1rem; color: #888; margin-top: 15px;" 
                       data-en="${CONFIG.SERVICE_CHARGE_EN}" 
                       data-ar="${CONFIG.SERVICE_CHARGE_AR}">
                        ${isArabic ? CONFIG.SERVICE_CHARGE_AR : CONFIG.SERVICE_CHARGE_EN}
                    </p>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    }

    // Re-initialize animations safely
    initIntersectionObserver();
}

// ==========================================
// UI State Handlers (Loading/Error)
// ==========================================
function showLoader() {
    // Initial spinner loader disabled per user request.
    const container = document.getElementById('menu-container');
    if (container) container.innerHTML = '';
}

function showError(message) {
    const container = document.getElementById('menu-container');
    container.innerHTML = `
        <div class="error-container">
            <h3>Oops! Something went wrong.</h3>
            <p>${message}</p>
            <button class="retry-btn" onclick="retryLoad()">Retry / إعادة المحاولة</button>
        </div>
    `;
}

function retryLoad() {
    localStorage.removeItem('menuData');
    initMenu();
}

// ==========================================
// Language Toggle
// ==========================================
function toggleLanguage() {
    isArabic = !isArabic;
    const body = document.body;
    body.dir = isArabic ? "rtl" : "ltr";

    const btn = document.getElementById('lang-toggle');
    btn.textContent = isArabic ? "En" : "ع";

    const elements = document.querySelectorAll('[data-en], [data-ar]');
    elements.forEach(el => {
        if (isArabic) {
            if (el.getAttribute('data-ar')) el.textContent = el.getAttribute('data-ar');
        } else {
            if (el.getAttribute('data-en')) el.textContent = el.getAttribute('data-en');
        }
    });
}

// ==========================================
// Animations (Intersection Observer)
// ==========================================
function initIntersectionObserver() {
    // Disconnect old observer to prevent memory leaks and duplicate animations on re-render
    if (cardObserver) {
        cardObserver.disconnect();
    }

    const observerOptions = {
        threshold: 0.10 // 10% visibility triggers animation
    };

    cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.menu-card').forEach(card => {
        cardObserver.observe(card);
    });
}

// ==========================================
// Auto Scroll Feature
// ==========================================
let autoScrollActive = false;
let scrollDirection = 1;
let idleTimer;

function initAutoScroll() {
    if (!CONFIG.AUTO_SCROLL.ENABLED) return;

    autoScrollActive = true;

    // Stop on interaction
    window.addEventListener('touchstart', stopAutoScroll);
    window.addEventListener('wheel', stopAutoScroll);
    window.addEventListener('mousemove', stopAutoScroll);
    window.addEventListener('click', stopAutoScroll);

    setTimeout(() => {
        dynamicScroll();
    }, 1000);
}

function dynamicScroll() {
    if (!autoScrollActive) {
        requestAnimationFrame(dynamicScroll);
        return;
    }

    window.scrollBy(0, scrollDirection * CONFIG.AUTO_SCROLL.SPEED);

    // Bottom check
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 2) {
        scrollDirection = -1;
        autoScrollActive = false;
        setTimeout(() => { autoScrollActive = true; }, CONFIG.AUTO_SCROLL.PAUSE_DURATION);
    }

    // Top check
    if (window.scrollY <= 0) {
        scrollDirection = 1;
        autoScrollActive = false;
        setTimeout(() => { autoScrollActive = true; }, CONFIG.AUTO_SCROLL.PAUSE_DURATION);
    }

    requestAnimationFrame(dynamicScroll);
}

function stopAutoScroll() {
    if (!CONFIG.AUTO_SCROLL.ENABLED) return;

    autoScrollActive = false;
    clearTimeout(idleTimer);

    idleTimer = setTimeout(() => {
        autoScrollActive = true;
    }, CONFIG.AUTO_SCROLL.RESUME_DELAY);
}
