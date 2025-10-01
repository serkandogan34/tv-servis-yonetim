// Enhanced Slider.js with Live Notifications
console.log('✅ Slider.js loaded successfully');

// Live notifications data
const liveServices = [
    'Samsung QLED 4K TV Tamiri - 55" Ekran',
    'LG OLED C2 65" TV Panel Degisimi', 
    'Gaming PC Kurulum - RTX 4090 + i9',
    'MacBook Tamiri - MacBook Pro 16" M2',
    'Buzdolabi Tamiri - LG InstaView',
    'Camasir Makinesi - Bosch WAX32EH0TR',
    'Klima Servisi - Daikin Ururu Sarara',
    'iPhone Tamiri - iPhone 15 Pro Max'
];

const liveLocations = [
    'Istanbul, Besiktas', 'Istanbul, Kadikoy', 'Ankara, Cankaya', 'Izmir, Konak',
    'Bursa, Nilufer', 'Antalya, Muratpasa', 'Gaziantep, Sahinbey'
];

const liveTimeAgo = ['simdi', '1 dk once', '2 dk once', '3 dk once', '30 sn once'];

const liveCustomerNames = [
    'Mehmet K.', 'Ayse Y.', 'Can S.', 'Elif M.', 'Murat D.', 'Zeynep A.',
    'Ali R.', 'Fatma B.', 'Ahmet T.', 'Seda L.', 'Burak O.', 'Deniz K.'
];

const liveComments = [
    'Hizmet mukemmel, cok tesekkurler!',
    'Cok hizli ve kaliteli servis.',
    'Teknisyen cok bilgili ve guler yuzlu.',
    'Fiyat-performans mukemmel.',
    'Kesinlikle tavsiye ederim.',
    'Problem tamamen cozuldu.'
];

// Add live notification
function addLiveNotification() {
    console.log('📢 Adding live notification...');
    
    const container = document.getElementById('liveNotifications');
    if (!container) {
        console.log('❌ liveNotifications container not found');
        return;
    }
    
    const service = liveServices[Math.floor(Math.random() * liveServices.length)];
    const location = liveLocations[Math.floor(Math.random() * liveLocations.length)];
    const timeAgo = liveTimeAgo[Math.floor(Math.random() * liveTimeAgo.length)];
    
    const div = document.createElement('div');
    div.className = 'bg-white/10 border-l-4 border-green-400 p-3 text-white text-sm rounded-r-lg shadow-lg mb-2 opacity-0 transition-all duration-300';
    div.innerHTML = 
        '<div class="font-medium text-sm">' + service + '</div>' +
        '<div class="text-green-200 text-xs opacity-90">' + location + ' • ' + timeAgo + '</div>';
    
    // Insert at top
    if (container.firstChild) {
        container.insertBefore(div, container.firstChild);
    } else {
        container.appendChild(div);
    }
    
    // Fade in animation
    setTimeout(function() {
        div.style.opacity = '1';
    }, 50);
    
    // Keep max 5 notifications
    while (container.children.length > 5) {
        container.removeChild(container.lastChild);
    }
    
    console.log('✅ Notification added:', service);
}

// Add live comment
function addLiveComment() {
    console.log('💬 Adding live comment...');
    
    const container = document.getElementById('liveComments');
    if (!container) {
        console.log('❌ liveComments container not found');
        return;
    }
    
    const name = liveCustomerNames[Math.floor(Math.random() * liveCustomerNames.length)];
    const comment = liveComments[Math.floor(Math.random() * liveComments.length)];
    const stars = '⭐'.repeat(Math.random() < 0.7 ? 5 : 4);
    
    const div = document.createElement('div');
    div.className = 'bg-white/10 p-3 text-white text-sm rounded-lg shadow-lg mb-2 opacity-0 transition-all duration-300';
    div.innerHTML = 
        '<div class="font-medium text-sm">' + name + '</div>' +
        '<div class="text-yellow-400 text-xs my-1">' + stars + '</div>' +
        '<div class="text-blue-200 text-xs opacity-90">' + comment + '</div>';
    
    // Insert at top
    if (container.firstChild) {
        container.insertBefore(div, container.firstChild);
    } else {
        container.appendChild(div);
    }
    
    // Fade in animation
    setTimeout(function() {
        div.style.opacity = '1';
    }, 50);
    
    // Keep max 4 comments
    while (container.children.length > 4) {
        container.removeChild(container.lastChild);
    }
    
    console.log('✅ Comment added:', name);
}

// Initialize live notifications
function initLiveNotifications() {
    console.log('🚀 Starting live notifications system...');
    
    // Start immediately
    setTimeout(function() {
        addLiveNotification();
        addLiveComment();
    }, 1000);
    
    // Continue with intervals
    setInterval(addLiveNotification, 5000);
    setInterval(addLiveComment, 7000);
    
    console.log('✅ Live notifications system started');
}

// Basic slider functionality  
function initSlider() {
    console.log('✅ Slider initialized');
    initLiveNotifications();
}

// Auto-start
console.log('📋 Document readyState:', document.readyState);

if (document.readyState === 'loading') {
    console.log('📋 Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', initSlider);
} else {
    console.log('📋 DOM already ready, starting immediately...');
    initSlider();
}

// Backup method
setTimeout(function() {
    console.log('⏰ Backup timer triggered');
    initSlider();
}, 2000);