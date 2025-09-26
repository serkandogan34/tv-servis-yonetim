// Static app.js - Live Notifications System
console.log('Static app.js loaded successfully');

// Live notifications system - Main functionality
window.appReady = true;

// LIVE FEED FUNCTIONS
console.log('FORCING NOTIFICATION START NOW!');

window.addJobToFeed = function() {
    console.log('Starting job feed...');
    const feedContainer = document.getElementById('job-feed');
    if (!feedContainer) {
        console.error('❌ job-feed container NOT FOUND!');
        return;
    }
    console.log('Found job-feed container, starting...');
    
    const jobs = [
        {
            category: 'Televizyon Tamiri',
            location: 'Kadıköy, İstanbul',
            urgency: 'Acil',
            price: 'TL400-600',
            customer: 'Ahmet B.',
            icon: 'fas fa-tv',
            color: 'blue',
            time: 'Şimdi'
        },
        {
            category: 'Beyaz Eşya',
            location: 'Çankaya, Ankara', 
            urgency: 'Normal',
            price: 'TL300-500',
            customer: 'Zeynep K.',
            icon: 'fas fa-washing-machine',
            color: 'green',
            time: '2dk önce'
        },
        {
            category: 'Bilgisayar Tamiri',
            location: 'Bornova, İzmir',
            urgency: 'Bugün',
            price: 'TL250-400',
            customer: 'Mehmet D.',
            icon: 'fas fa-laptop',
            color: 'purple',
            time: '5dk önce'
        }
    ];
    
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const urgencyClass = job.urgency === 'Acil' ? 'bg-red-500' : job.urgency === 'Bugün' ? 'bg-orange-500' : 'bg-green-500';
    
    const jobElement = document.createElement('div');
    jobElement.className = 'bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 mb-2 opacity-0 transform translate-y-2 transition-all duration-300';
    
    jobElement.innerHTML = 
        '<div class="flex items-center justify-between">' +
            '<div class="flex items-center space-x-3">' +
                '<div class="w-8 h-8 bg-' + job.color + '-500 rounded-lg flex items-center justify-center">' +
                    '<i class="' + job.icon + ' text-white text-xs"></i>' +
                '</div>' +
                '<div class="flex-1">' +
                    '<div class="text-white text-sm font-medium">' + job.category + '</div>' +
                    '<div class="text-gray-300 text-xs">' + job.customer + ' • ' + job.location + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="text-right">' +
                '<div class="' + urgencyClass + ' text-white px-2 py-1 rounded text-xs font-medium mb-1">' + job.urgency + '</div>' +
                '<div class="text-gray-300 text-xs">' + job.price + '</div>' +
                '<div class="text-gray-400 text-xs">' + job.time + '</div>' +
            '</div>' +
        '</div>';
    
    feedContainer.insertBefore(jobElement, feedContainer.firstChild);
    
    setTimeout(function() {
        jobElement.classList.remove('opacity-0', 'translate-y-2');
    }, 100);
    
    while (feedContainer.children.length > 6) {
        feedContainer.removeChild(feedContainer.lastChild);
    }
    
    console.log('Job added to feed!');
};

window.initializeJobFeed = function() {
    console.log('Initializing live job feed...');
    window.addJobToFeed();
    setTimeout(function() { window.addJobToFeed(); }, 1000);
    setTimeout(function() { window.addJobToFeed(); }, 2000);
};

// Start automatically when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        console.log('Auto-starting job feed...');
        window.initializeJobFeed();
        
        // Continue adding jobs every 8 seconds
        setInterval(function() {
            window.addJobToFeed();
        }, 8000);
    }, 2000);
});