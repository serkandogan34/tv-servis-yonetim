// ========================================
// GARANTOR360 CUSTOMER APP.JS - CLEAN VERSION
// ========================================

// ========================================
// CUSTOMER-FACING FUNCTIONS (Garantor360)
// ========================================

// WhatsApp message creation
function createWhatsAppMessage(calc) {
    const urgencyText = {
        normal: 'Normal (1-2 gun icinde)',
        urgent: 'Acil (Ayni gun)', 
        emergency: 'Cok Acil (1-2 saat icinde)'
    };

    const message = '*Garantor360 - Hizmet Talebi*\n\n' +
        '*Hizmet:* ' + calc.serviceName + '\n' +
        '*Sehir:* ' + (calc.city.charAt(0).toUpperCase() + calc.city.slice(1)) + '\n' +
        '*Aciliyet:* ' + urgencyText[calc.urgencyLevel] + '\n' +
        '*Karmasiklik:* ' + calc.breakdown.complexity + '\n\n' +
        '*Tahmini Maliyet:* ' + calc.priceRange + '\n\n' +
        '*Hemen teklif almak icin:* https://wa.me/905301234567\n\n' +
        'Seffaf fiyatlandirma\n' +
        '7/24 musteri destegi\n' +
        'Garantili hizmet';

    return 'https://wa.me/905301234567?text=' + encodeURIComponent(message);
}

// Success celebration animation
function showSuccessCelebration(message) {
    const celebration = document.createElement('div');
    celebration.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    celebration.innerHTML = 
        '<div class="bg-white rounded-2xl p-8 max-w-md mx-4 text-center transform scale-95 transition-all duration-300">' +
            '<div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">' +
                '<i class="fas fa-check-circle text-green-500 text-4xl animate-pulse"></i>' +
            '</div>' +
            '<h3 class="text-2xl font-bold text-gray-800 mb-4">MUKEMMEL!</h3>' +
            '<div class="text-gray-600 leading-relaxed whitespace-pre-line">' + message + '</div>' +
            '<button onclick="closeSuccessCelebration()" class="mt-6 bg-green-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-600 transition-all">' +
                'Tamam' +
            '</button>' +
        '</div>';
    
    document.body.appendChild(celebration);
    
    setTimeout(() => {
        celebration.querySelector('div').style.transform = 'scale(1)';
    }, 100);
    
    // Auto close after 8 seconds
    setTimeout(closeSuccessCelebration, 8000);
}

// Close success celebration
function closeSuccessCelebration() {
    const celebration = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-75');
    if (celebration) {
        celebration.style.opacity = '0';
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.remove();
            }
        }, 300);
    }
}

// Enhanced form success handler
function handleCustomerFormSuccess(event) {
    if (event) {
        event.preventDefault();
    }
    
    const message = 'MUKEMMEL! Talebiniz alindi.\n\n' +
        '3-5 uzman size ulasacak\n' +
        'Ilk teklif 5 dakika icinde\n' +
        '%100 garanti ile guvende\n\n' +
        'WhatsApp mesajlari geliyor...';
    
    showSuccessCelebration(message);
}

// Enhanced form submit handler
function handleSmartSubmit(event) {
    event.preventDefault();
    handleCustomerFormSuccess(event);
}

// ========================================
// PRICE CALCULATOR FUNCTIONS
// ========================================

let currentCalculation = {
    basePrice: 0,
    areaMultiplier: 1,
    urgencyMultiplier: 1,
    additionalCosts: 0,
    selectedUrgency: 'normal'
};

// Update area size display
function updateAreaDisplay() {
    const areaSize = document.getElementById('areaSize');
    const areaSizeDisplay = document.getElementById('areaSizeDisplay');
    if (areaSize && areaSizeDisplay) {
        areaSizeDisplay.textContent = areaSize.value;
        updatePriceCalculation();
    }
}

// Select urgency level
function selectUrgency(button) {
    // Remove active class from all buttons
    document.querySelectorAll('.urgency-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'border-orange-500', 'border-red-500', 'bg-blue-50', 'bg-orange-50', 'bg-red-50');
        btn.classList.add('border-gray-200');
    });
    
    // Add active class to selected button
    const urgency = button.getAttribute('data-urgency');
    const colors = {
        normal: ['border-blue-500', 'bg-blue-50'],
        urgent: ['border-orange-500', 'bg-orange-50'],
        emergency: ['border-red-500', 'bg-red-50']
    };
    
    button.classList.remove('border-gray-200');
    button.classList.add(...colors[urgency]);
    
    currentCalculation.selectedUrgency = urgency;
    currentCalculation.urgencyMultiplier = parseFloat(button.getAttribute('data-multiplier'));
    
    updatePriceCalculation();
}

// Main price calculation function
function updatePriceCalculation() {
    const serviceTypeSelect = document.getElementById('serviceType');
    const areaSizeSlider = document.getElementById('areaSize');
    const weekendCheckbox = document.getElementById('weekendWork');
    const materialCheckbox = document.getElementById('materialIncluded');
    const extraCleanCheckbox = document.getElementById('extraClean');
    
    if (!serviceTypeSelect || !areaSizeSlider) return;
    
    // Get base price from selected service
    if (serviceTypeSelect.value) {
        const selectedOption = serviceTypeSelect.options[serviceTypeSelect.selectedIndex];
        currentCalculation.basePrice = parseInt(selectedOption.getAttribute('data-base-price')) || 0;
    } else {
        currentCalculation.basePrice = 0;
    }
    
    // Calculate area multiplier (1-10 scale, but more reasonable multipliers)
    const areaSize = parseInt(areaSizeSlider.value);
    currentCalculation.areaMultiplier = 1 + ((areaSize - 1) * 0.3); // 1x to 3.7x range
    
    // Calculate additional costs
    let additionalPercentage = 0;
    if (weekendCheckbox && weekendCheckbox.checked) additionalPercentage += 25;
    if (materialCheckbox && materialCheckbox.checked) additionalPercentage += 40;
    if (extraCleanCheckbox && extraCleanCheckbox.checked) additionalPercentage += 15;
    
    const baseCalculation = currentCalculation.basePrice * currentCalculation.areaMultiplier * currentCalculation.urgencyMultiplier;
    currentCalculation.additionalCosts = baseCalculation * (additionalPercentage / 100);
    
    // Update display
    updatePriceDisplay();
}

// Update price display elements
function updatePriceDisplay() {
    const basePrice = currentCalculation.basePrice;
    const areaMultiplier = currentCalculation.areaMultiplier;
    const urgencyMultiplier = currentCalculation.urgencyMultiplier;
    const additionalCosts = currentCalculation.additionalCosts;
    
    const subtotal = basePrice * areaMultiplier * urgencyMultiplier;
    const total = subtotal + additionalCosts;
    
    // Update individual elements
    const basePriceEl = document.getElementById('basePrice');
    const areaMultiplierEl = document.getElementById('areaMultiplier');
    const urgencyMultiplierEl = document.getElementById('urgencyMultiplier');
    const additionalCostsEl = document.getElementById('additionalCosts');
    const totalPriceEl = document.getElementById('totalPrice');
    const minPriceEl = document.getElementById('minPrice');
    const maxPriceEl = document.getElementById('maxPrice');
    
    if (basePriceEl) basePriceEl.textContent = '₺' + basePrice;
    if (areaMultiplierEl) areaMultiplierEl.textContent = 'x' + areaMultiplier.toFixed(1);
    if (urgencyMultiplierEl) urgencyMultiplierEl.textContent = 'x' + urgencyMultiplier;
    if (additionalCostsEl) additionalCostsEl.textContent = '+₺' + Math.round(additionalCosts);
    if (totalPriceEl) totalPriceEl.textContent = '₺' + Math.round(total);
    
    // Calculate price range (±20%)
    const minPrice = Math.round(total * 0.8);
    const maxPrice = Math.round(total * 1.2);
    if (minPriceEl) minPriceEl.textContent = '₺' + minPrice;
    if (maxPriceEl) maxPriceEl.textContent = '₺' + maxPrice;
}

// Proceed with calculated price
function proceedWithCalculatedPrice() {
    const serviceTypeSelect = document.getElementById('serviceType');
    const total = Math.round(currentCalculation.basePrice * currentCalculation.areaMultiplier * currentCalculation.urgencyMultiplier + currentCalculation.additionalCosts);
    
    if (!serviceTypeSelect || !serviceTypeSelect.value) {
        alert('Lütfen bir hizmet türü seçiniz!');
        return;
    }
    
    const serviceName = serviceTypeSelect.options[serviceTypeSelect.selectedIndex].text;
    const urgencyText = {
        normal: 'Normal (1-2 gün içinde)',
        urgent: 'Acil (Aynı gün)', 
        emergency: 'Çok Acil (1-2 saat içinde)'
    };
    
    const message = '🏠 *Garantor360 - Hesaplanmış Fiyat Talebi*\n\n' +
        '📋 *Hizmet:* ' + serviceName + '\n' +
        '⏰ *Aciliyet:* ' + urgencyText[currentCalculation.selectedUrgency] + '\n' +
        '📐 *Alan Seviyesi:* ' + document.getElementById('areaSize').value + '/10\n' +
        '💰 *Hesaplanan Fiyat:* ₺' + total + '\n\n' +
        '✅ *Fiyat hesaplayıcı ile önceden bilgi alınmış*\n' +
        '🎯 *Şeffaf ve net fiyatlandırma*\n' +
        '🔒 *%100 garanti ile güvende*\n\n' +
        'Bu fiyatla hemen başlayalım!';
    
    const whatsappUrl = 'https://wa.me/905301234567?text=' + encodeURIComponent(message);
    window.open(whatsappUrl, '_blank');
}

// Reset calculator
function resetCalculator() {
    const serviceType = document.getElementById('serviceType');
    const areaSize = document.getElementById('areaSize');
    const areaSizeDisplay = document.getElementById('areaSizeDisplay');
    const weekendWork = document.getElementById('weekendWork');
    const materialIncluded = document.getElementById('materialIncluded');
    const extraClean = document.getElementById('extraClean');
    
    // Reset form elements
    if (serviceType) serviceType.value = '';
    if (areaSize) areaSize.value = 3;
    if (areaSizeDisplay) areaSizeDisplay.textContent = '3';
    
    // Reset checkboxes
    if (weekendWork) weekendWork.checked = false;
    if (materialIncluded) materialIncluded.checked = false;
    if (extraClean) extraClean.checked = false;
    
    // Reset urgency buttons
    document.querySelectorAll('.urgency-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'border-orange-500', 'border-red-500', 'bg-blue-50', 'bg-orange-50', 'bg-red-50');
        btn.classList.add('border-gray-200');
    });
    
    // Reset calculation state
    currentCalculation = {
        basePrice: 0,
        areaMultiplier: 1,
        urgencyMultiplier: 1,
        additionalCosts: 0,
        selectedUrgency: 'normal'
    };
    
    // Update display
    updatePriceDisplay();
}

// ========================================
// EXPERT MATCHING FUNCTIONS
// ========================================

let selectedExperience = 'intermediate';
let currentLocation = null;

// Mock expert data for demonstration
const mockExperts = [
    {
        id: 1,
        name: 'Ahmet Yılmaz',
        profession: 'Elektrikçi',
        experience: 'expert',
        rating: 4.8,
        reviews: 156,
        distance: 0.8,
        priceRange: '150-300',
        avatar: 'https://ui-avatars.com/api/?name=Ahmet+Yilmaz&background=f59e0b&color=fff',
        verified: true,
        insured: true,
        available: true
    },
    {
        id: 2,
        name: 'Mehmet Kaya',
        profession: 'Tesisatçı',
        experience: 'intermediate',
        rating: 4.6,
        reviews: 89,
        distance: 1.2,
        priceRange: '200-400',
        avatar: 'https://ui-avatars.com/api/?name=Mehmet+Kaya&background=059669&color=fff',
        verified: true,
        insured: false,
        available: true
    }
];

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        const button = document.querySelector('button[onclick="getCurrentLocation()"]');
        if (button) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Konum alınıyor...';
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    const expertCity = document.getElementById('expertCity');
                    const expertDistrict = document.getElementById('expertDistrict');
                    
                    if (expertCity) expertCity.value = 'istanbul';
                    if (expertDistrict) {
                        expertDistrict.innerHTML = '<option value="kadikoy">Kadıköy (Mevcut konum)</option>';
                        expertDistrict.value = 'kadikoy';
                    }
                    
                    button.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Konum alındı';
                    button.classList.add('text-green-600');
                },
                (error) => {
                    button.innerHTML = '<i class="fas fa-crosshairs mr-1"></i> Mevcut konumumu kullan';
                    alert('Konum alınamadı. Lütfen manuel olarak seçiniz.');
                }
            );
        }
    } else {
        alert('Tarayıcınız konum hizmetlerini desteklemiyor.');
    }
}

// Select experience level
function selectExperience(button) {
    // Remove active class from all buttons
    document.querySelectorAll('.experience-btn').forEach(btn => {
        btn.classList.remove('border-orange-500', 'bg-orange-50');
        btn.classList.add('border-gray-200');
    });
    
    // Add active class to selected button
    button.classList.remove('border-gray-200');
    button.classList.add('border-orange-500', 'bg-orange-50');
    
    selectedExperience = button.getAttribute('data-experience');
}

// Find expert matches
function findExpertMatches() {
    const city = document.getElementById('expertCity');
    const serviceCategory = document.getElementById('expertServiceCategory');
    
    if (!city || !serviceCategory || !city.value || !serviceCategory.value) {
        alert('Lütfen şehir ve hizmet kategorisi seçiniz!');
        return;
    }
    
    // Show loading state
    const initial = document.getElementById('expertMatchingInitial');
    const results = document.getElementById('expertMatchingResults');
    const loading = document.getElementById('expertMatchingLoading');
    
    if (initial) initial.classList.add('hidden');
    if (results) results.classList.add('hidden');
    if (loading) loading.classList.remove('hidden');
    
    // Simulate AI matching process
    setTimeout(() => {
        const filteredExperts = filterExpertsByPreferences();
        displayExpertResults(filteredExperts);
        
        // Show results
        if (loading) loading.classList.add('hidden');
        if (results) results.classList.remove('hidden');
    }, 2000);
}

// Filter experts by preferences
function filterExpertsByPreferences() {
    const availableNow = document.getElementById('expertAvailableNow');
    const highRating = document.getElementById('expertHighRating');
    const verified = document.getElementById('expertVerified');
    const insured = document.getElementById('expertInsured');
    
    return mockExperts.filter(expert => {
        if (availableNow && availableNow.checked && !expert.available) return false;
        if (highRating && highRating.checked && expert.rating < 4.5) return false;
        if (verified && verified.checked && !expert.verified) return false;
        if (insured && insured.checked && !expert.insured) return false;
        return true;
    });
}

// Display expert results
function displayExpertResults(experts) {
    const expertList = document.getElementById('expertList');
    if (!expertList) return;
    
    if (experts.length === 0) {
        expertList.innerHTML = 
            '<div class="text-center py-8 text-gray-500">' +
                '<i class="fas fa-search text-4xl mb-4"></i>' +
                '<p>Kriterlere uygun uzman bulunamadı</p>' +
                '<p class="text-sm">Lütfen filtreleri gevşeterek tekrar deneyin</p>' +
            '</div>';
        return;
    }
    
    let html = '';
    experts.forEach((expert, index) => {
        const matchScore = Math.round(95 - (index * 5) + (Math.random() * 5));
        
        html += 
            '<div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:border-orange-300 transition-all">' +
                '<div class="flex items-start space-x-4">' +
                    '<img src="' + expert.avatar + '" alt="' + expert.name + '" class="w-16 h-16 rounded-full border-2 border-orange-200">' +
                    '<div class="flex-1">' +
                        '<div class="flex items-center justify-between mb-2">' +
                            '<h4 class="text-lg font-bold text-gray-800">' + expert.name + '</h4>' +
                            '<div class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">%' + matchScore + ' Uyumlu</div>' +
                        '</div>' +
                        '<div class="flex items-center space-x-4 mb-3">' +
                            '<span class="text-orange-600 font-semibold">' + expert.profession + '</span>' +
                            '<div class="flex items-center">' +
                                '<i class="fas fa-star text-yellow-400 mr-1"></i>' +
                                '<span class="font-semibold">' + expert.rating + '</span>' +
                                '<span class="text-gray-500 text-sm ml-1">(' + expert.reviews + ')</span>' +
                            '</div>' +
                            '<span class="text-gray-600 text-sm">' + expert.distance + ' km</span>' +
                        '</div>' +
                        '<div class="flex items-center justify-between">' +
                            '<div class="text-sm text-gray-600"><i class="fas fa-tag mr-1"></i>Fiyat: ₺' + expert.priceRange + '</div>' +
                            '<button onclick="contactExpert(\'' + expert.name + '\', \'' + expert.profession + '\', \'' + expert.priceRange + '\')" class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all text-sm font-semibold flex items-center">' +
                                '<i class="fab fa-whatsapp mr-2"></i>İletişime Geç' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
    });
    
    expertList.innerHTML = html;
}

// Contact individual expert
function contactExpert(expertName, profession, priceRange) {
    const city = document.getElementById('expertCity');
    const serviceCategory = document.getElementById('expertServiceCategory');
    
    const message = '🏠 *Garantor360 - Uzman Eşleştirme Sistemi*\n\n' +
        '👨‍🔧 *Uzman:* ' + expertName + ' (' + profession + ')\n' +
        '📋 *Hizmet:* ' + (serviceCategory ? serviceCategory.value : 'Seçilmedi') + '\n' +
        '📍 *Konum:* ' + (city && city.value ? city.value.charAt(0).toUpperCase() + city.value.slice(1) : 'Belirtilmedi') + '\n' +
        '💰 *Fiyat Aralığı:* ₺' + priceRange + '\n\n' +
        '✅ *Akıllı eşleştirme sistemi ile bulundu*\n' +
        '🎯 *Size özel seçilmiş uzman*\n' +
        '🔒 *%100 garanti ile güvende*\n\n' +
        'Hemen başlayalım!';
    
    const whatsappUrl = 'https://wa.me/905301234567?text=' + encodeURIComponent(message);
    window.open(whatsappUrl, '_blank');
}

// Contact all available experts
function contactAllExperts() {
    const city = document.getElementById('expertCity');
    const serviceCategory = document.getElementById('expertServiceCategory');
    
    const message = '🏠 *Garantor360 - Çoklu Uzman Talebi*\n\n' +
        '📋 *Hizmet:* ' + (serviceCategory ? serviceCategory.value : 'Belirtilmedi') + '\n' +
        '📍 *Konum:* ' + (city && city.value ? city.value.charAt(0).toUpperCase() + city.value.slice(1) : 'Belirtilmedi') + '\n\n' +
        '🎯 *Akıllı eşleştirme sistemi kullanıldı*\n' +
        '👥 *Birden fazla uygun uzman bulundu*\n' +
        '💼 *En iyi teklifleri almak istiyorum*\n' +
        '🔒 *%100 garanti ile güvende*\n\n' +
        'Lütfen tüm uygun uzmanların iletişim bilgilerini paylaşın!';
    
    const whatsappUrl = 'https://wa.me/905301234567?text=' + encodeURIComponent(message);
    window.open(whatsappUrl, '_blank');
}

// ========================================
// SOCIAL PROOF FUNCTIONS
// ========================================

let currentReviewSlide = 0;
let liveNotificationTimer = null;

// Sample live notifications
const liveNotifications = [
    "⚡ İstanbul'da elektrik tamiri tamamlandı - Ahmet B. - 5 ⭐",
    "🏠 Ankara'da ev temizliği başarıyla bitti - Ayşe K. - 5 ⭐", 
    "🔧 İzmir'de tesisatçı işi tamamlandı - Mehmet D. - 4.9 ⭐",
    "🎨 Bursa'da boyama işi mükemmel sonuçlandı - Zeynep Y. - 5 ⭐",
    "❄️ Antalya'da klima tamiri başarılı - Ali C. - 4.8 ⭐",
    "🧹 İstanbul'da derin temizlik tamamlandı - Fatma S. - 5 ⭐"
];

// Change review carousel slide
function changeReviewSlide(slideIndex) {
    const carousel = document.getElementById('reviewsCarousel');
    if (carousel) {
        carousel.style.transform = 'translateX(-' + slideIndex * 100 + '%)';
        
        // Update dots
        document.querySelectorAll('.review-dot').forEach((dot, index) => {
            if (index === slideIndex) {
                dot.classList.remove('bg-white/40');
                dot.classList.add('bg-white');
            } else {
                dot.classList.remove('bg-white');
                dot.classList.add('bg-white/40');
            }
        });
        
        currentReviewSlide = slideIndex;
    }
}

// Initialize social proof animations
function initializeSocialProof() {
    // Start counter animations
    animateCounters();
    
    // Auto-rotate reviews every 5 seconds
    setInterval(() => {
        currentReviewSlide = (currentReviewSlide + 1) % 2;
        changeReviewSlide(currentReviewSlide);
    }, 5000);
}

// Animate counters
function animateCounters() {
    const customersCounter = document.getElementById('liveCustomers');
    const jobsCounter = document.getElementById('liveJobs');
    
    if (customersCounter) {
        animateCounter(customersCounter, 15247, 15247 + Math.floor(Math.random() * 20));
    }
    
    if (jobsCounter) {
        animateCounter(jobsCounter, 23891, 23891 + Math.floor(Math.random() * 15));
    }
}

// Animate single counter
function animateCounter(element, from, to) {
    const duration = 2000;
    const steps = 60;
    const stepValue = (to - from) / steps;
    const stepDuration = duration / steps;
    
    let current = from;
    let step = 0;
    
    const timer = setInterval(() => {
        current += stepValue;
        step++;
        
        if (step >= steps) {
            current = to;
            clearInterval(timer);
        }
        
        element.textContent = Math.floor(current).toLocaleString();
    }, stepDuration);
}

// ========================================
// FLOATING NOTIFICATIONS SYSTEM
// ========================================

let floatingNotificationSystem = {
    isActive: false,
    timers: {},
    notificationCounter: 0,
    lastNotificationTime: 0,
    onlineUsers: 1247
};

// Sample notification data
const floatingNotificationsData = {
    recentActivity: [
        "🔥 Mehmet K. şu anda fiyat hesaplıyor",
        "⚡ Ayşe D. uzman arıyor (Elektrik)",
        "🏠 Ali B. temizlik teklifi aldı",
        "🔧 Zeynep Y. tesisatçı buldu",
        "💡 Fatma S. AI önerisi kullandı",
        "⭐ Hasan T. 5 yıldız verdi",
        "🎯 Merve A. uzman eşleştirme yaptı",
        "💰 Ömer C. fiyat karşılaştırması yaptı"
    ],
    recentReviews: [
        { name: "Ayşe D.", rating: 5, service: "Elektrik tamiri", city: "İstanbul", time: "2 dk" },
        { name: "Mehmet K.", rating: 5, service: "Ev temizliği", city: "Ankara", time: "5 dk" },
        { name: "Zeynep Y.", rating: 4.9, service: "Tesisatçı", city: "İzmir", time: "8 dk" },
        { name: "Ali B.", rating: 5, service: "Klima servisi", city: "Bursa", time: "12 dk" },
        { name: "Fatma S.", rating: 4.8, service: "Boyama işi", city: "Antalya", time: "15 dk" },
        { name: "Hasan T.", rating: 5, service: "Tadilat", city: "Konya", time: "18 dk" }
    ],
    serviceCompletions: [
        "✅ İstanbul'da elektrik tamiri tamamlandı",
        "✅ Ankara'da ev temizliği başarıyla bitti",
        "✅ İzmir'de tesisatçı işi sonuçlandı", 
        "✅ Bursa'da klima servisi tamamlandı",
        "✅ Antalya'da boyama işi bitti",
        "✅ Konya'da tadilat başarıyla sonuçlandı"
    ]
};

// Initialize floating notifications
function initializeFloatingNotifications() {
    if (floatingNotificationSystem.isActive) return;
    
    floatingNotificationSystem.isActive = true;
    console.log('Floating notifications system started');
    
    // Start online users counter animation
    startOnlineUsersCounter();
    
    // Start different notification types with different intervals
    startRecentActivityNotifications();
    startRecentReviewsNotifications();
    startServiceCompletionNotifications();
}

// Online users counter
function startOnlineUsersCounter() {
    const counter = document.getElementById('onlineCount');
    if (!counter) return;
    
    // Update counter every 15-30 seconds
    floatingNotificationSystem.timers.onlineCounter = setInterval(() => {
        const change = Math.floor(Math.random() * 10) - 3; // -3 to +7
        floatingNotificationSystem.onlineUsers = Math.max(1200, floatingNotificationSystem.onlineUsers + change);
        
        // Animate counter change
        counter.style.transform = 'scale(1.1)';
        counter.style.color = '#fef3c7';
        
        setTimeout(() => {
            counter.textContent = floatingNotificationSystem.onlineUsers.toLocaleString();
            counter.style.transform = 'scale(1)';
            counter.style.color = 'white';
        }, 200);
        
    }, Math.random() * 15000 + 15000); // 15-30 seconds
}

// Recent activity notifications (top right)
function startRecentActivityNotifications() {
    const container = document.getElementById('floatingNotifications');
    if (!container) return;
    
    const showNotification = () => {
        const now = Date.now();
        if (now - floatingNotificationSystem.lastNotificationTime < 3000) return; // Min 3 second gap
        
        const activity = floatingNotificationsData.recentActivity[
            Math.floor(Math.random() * floatingNotificationsData.recentActivity.length)
        ];
        
        createFloatingNotification(container, activity, 'activity', 'from-blue-500 to-purple-600');
        floatingNotificationSystem.lastNotificationTime = now;
    };
    
    // Show first notification after 2 seconds
    setTimeout(showNotification, 2000);
    
    // Then show every 8-15 seconds
    floatingNotificationSystem.timers.recentActivity = setInterval(showNotification, 
        Math.random() * 7000 + 8000);
}

// Recent reviews notifications (bottom left)
function startRecentReviewsNotifications() {
    const container = document.getElementById('recentReviewsContainer');
    if (!container) return;
    
    const showReview = () => {
        const review = floatingNotificationsData.recentReviews[
            Math.floor(Math.random() * floatingNotificationsData.recentReviews.length)
        ];
        
        const stars = '★'.repeat(Math.floor(review.rating)) + (review.rating % 1 ? '½' : '');
        const content = '⭐ ' + review.name + ' ' + stars + ' (' + review.rating + ') verdi\n' + review.service + ' • ' + review.city + '\n' + review.time + ' önce';
        
        createFloatingNotification(container, content, 'review', 'from-yellow-400 to-orange-500', 'left');
    };
    
    // Show first review after 4 seconds
    setTimeout(showReview, 4000);
    
    // Then show every 12-20 seconds
    floatingNotificationSystem.timers.recentReviews = setInterval(showReview, 
        Math.random() * 8000 + 12000);
}

// Service completion notifications (bottom right)
function startServiceCompletionNotifications() {
    const container = document.getElementById('serviceCompletionsContainer');
    if (!container) return;
    
    const showCompletion = () => {
        const completion = floatingNotificationsData.serviceCompletions[
            Math.floor(Math.random() * floatingNotificationsData.serviceCompletions.length)
        ];
        
        createFloatingNotification(container, completion, 'completion', 'from-green-500 to-emerald-600');
    };
    
    // Show first completion after 6 seconds
    setTimeout(showCompletion, 6000);
    
    // Then show every 10-18 seconds
    floatingNotificationSystem.timers.serviceCompletions = setInterval(showCompletion, 
        Math.random() * 8000 + 10000);
}

// Create floating notification element
function createFloatingNotification(container, content, type, gradientClass, position) {
    if (!container) return;
    
    position = position || 'right';
    const notification = document.createElement('div');
    const id = 'floating-notification-' + (++floatingNotificationSystem.notificationCounter);
    notification.id = id;
    
    // Different styles for different types
    const baseClasses = 'transform transition-all duration-500 ease-out shadow-lg rounded-lg border border-white/20 backdrop-blur-sm';
    const typeClasses = {
        activity: 'bg-gradient-to-r text-white px-4 py-3',
        review: 'bg-gradient-to-r text-white px-4 py-3',
        completion: 'bg-gradient-to-r text-white px-3 py-2 text-sm'
    };
    
    notification.className = baseClasses + ' ' + typeClasses[type] + ' ' + gradientClass;
    
    // Initial animation state
    if (position === 'left') {
        notification.style.transform = 'translateX(-100%) scale(0.8)';
        notification.style.opacity = '0';
    } else {
        notification.style.transform = 'translateX(100%) scale(0.8)';
        notification.style.opacity = '0';
    }
    
    // Content with icon and close button
    const lines = content.split('\n');
    const linesHtml = lines.map(line => '<div class="text-sm' + (lines.length > 1 && lines[0] === line ? ' font-semibold' : '') + '">' + line + '</div>').join('');
    
    notification.innerHTML = 
        '<div class="flex items-start justify-between">' +
            '<div class="flex-1' + (lines.length > 1 ? ' space-y-1' : '') + '">' + linesHtml + '</div>' +
            '<button onclick="closeFloatingNotification(\'' + id + '\')" class="ml-3 text-white/80 hover:text-white text-lg leading-none">×</button>' +
        '</div>';
    
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0) scale(1)';
        notification.style.opacity = '1';
    }, 100);
    
    // Auto-remove after 6-8 seconds
    const autoRemoveTime = Math.random() * 2000 + 6000;
    setTimeout(() => {
        closeFloatingNotification(id);
    }, autoRemoveTime);
    
    // Limit notifications per container
    const maxNotifications = type === 'review' ? 2 : 3;
    const notifications = container.children;
    if (notifications.length > maxNotifications) {
        if (notifications[0] && notifications[0].id) {
            closeFloatingNotification(notifications[0].id);
        }
    }
}

// Close specific floating notification
function closeFloatingNotification(id) {
    const notification = document.getElementById(id);
    if (!notification) return;
    
    const container = notification.parentElement;
    const isLeft = container && container.id === 'recentReviewsContainer';
    
    // Animate out
    notification.style.transform = 'translateX(' + (isLeft ? '-100%' : '100%') + ') scale(0.8)';
    notification.style.opacity = '0';
    
    // Remove element
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 500);
}

// Stop floating notifications
function stopFloatingNotifications() {
    floatingNotificationSystem.isActive = false;
    
    // Clear all timers
    Object.values(floatingNotificationSystem.timers).forEach(timer => {
        clearInterval(timer);
    });
    floatingNotificationSystem.timers = {};
    
    // Clear all notifications
    ['floatingNotifications', 'recentReviewsContainer', 'serviceCompletionsContainer'].forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    });
}

// ========================================
// INITIALIZE ON PAGE LOAD
// ========================================

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Start floating notifications after 3 seconds to not interfere with page load
    setTimeout(() => {
        initializeFloatingNotifications();
    }, 3000);
    
    // Initialize social proof after 1 second
    setTimeout(initializeSocialProof, 1000);
});

// Make functions globally accessible
window.createWhatsAppMessage = createWhatsAppMessage;
window.showSuccessCelebration = showSuccessCelebration;
window.closeSuccessCelebration = closeSuccessCelebration;
window.handleCustomerFormSuccess = handleCustomerFormSuccess;
window.updateAreaDisplay = updateAreaDisplay;
window.selectUrgency = selectUrgency;
window.updatePriceCalculation = updatePriceCalculation;
window.proceedWithCalculatedPrice = proceedWithCalculatedPrice;
window.resetCalculator = resetCalculator;
window.getCurrentLocation = getCurrentLocation;
window.selectExperience = selectExperience;
window.findExpertMatches = findExpertMatches;
window.contactExpert = contactExpert;
window.contactAllExperts = contactAllExperts;
window.changeReviewSlide = changeReviewSlide;
window.initializeSocialProof = initializeSocialProof;
window.initializeFloatingNotifications = initializeFloatingNotifications;
window.closeFloatingNotification = closeFloatingNotification;
window.stopFloatingNotifications = stopFloatingNotifications;
window.handleSmartSubmit = handleSmartSubmit;

// ========================================
// SUCCESS STORIES CAROUSEL SYSTEM
// ========================================

let currentStorySlide = 0;
let storySlideTimer = null;
let storyProgressTimer = null;
let storyTimeLeft = 4;

// Change success stories slide
function changeStorySlide(slideIndex) {
    const carousel = document.getElementById('successStoriesCarousel');
    if (carousel) {
        carousel.style.transform = 'translateX(-' + slideIndex * 100 + '%)';
        
        // Update dots
        document.querySelectorAll('.story-dot').forEach((dot, index) => {
            if (index === slideIndex) {
                dot.classList.remove('bg-blue-300/50');
                dot.classList.add('bg-blue-300');
            } else {
                dot.classList.remove('bg-blue-300');
                dot.classList.add('bg-blue-300/50');
            }
        });
        
        currentStorySlide = slideIndex;
        resetStoryTimer();
    }
}

// Reset story timer and progress
function resetStoryTimer() {
    // Clear existing timers
    if (storySlideTimer) clearInterval(storySlideTimer);
    if (storyProgressTimer) clearInterval(storyProgressTimer);
    
    storyTimeLeft = 4;
    
    // Update timer display and progress
    const timerDisplay = document.getElementById('storyTimer');
    const progressBar = document.getElementById('storyProgress');
    
    if (timerDisplay) timerDisplay.textContent = storyTimeLeft;
    if (progressBar) progressBar.style.width = '0%';
    
    // Start countdown timer
    storySlideTimer = setInterval(() => {
        storyTimeLeft--;
        if (timerDisplay) timerDisplay.textContent = storyTimeLeft;
        
        if (storyTimeLeft <= 0) {
            currentStorySlide = (currentStorySlide + 1) % 3;
            changeStorySlide(currentStorySlide);
        }
    }, 1000);
    
    // Start progress bar animation
    let progress = 0;
    storyProgressTimer = setInterval(() => {
        progress += (100 / (4 * 40)); // 4 seconds * 40 steps per second
        if (progressBar) progressBar.style.width = Math.min(progress, 100) + '%';
        
        if (progress >= 100) {
            clearInterval(storyProgressTimer);
            progress = 0;
        }
    }, 25); // Update every 25ms for smooth animation
}

// Initialize success stories carousel
function initializeSuccessStories() {
    // Start the carousel after page loads
    setTimeout(() => {
        resetStoryTimer();
    }, 2000);
}

// Add event listeners when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeSuccessStories();
    initializeLiveRequestFeed();
    initializeLiveStats();
});

// ========================================
// LIVE REQUEST FEED SYSTEM (CANLI TALEP AKIŞI)
// ========================================

let liveRequestSystem = {
    isActive: false,
    updateInterval: 5000, // 5 seconds
    requestCounter: 8,
    maxRequests: 15
};

// Sample live request data
const liveRequestsData = [
    { name: "Ahmet K.", service: "Televizyon Tamiri", location: "Kadıköy, İstanbul", time: "2 dk önce", type: "TV" },
    { name: "Ayşe M.", service: "Çamaşır Makinesi", location: "Çankaya, Ankara", time: "4 dk önce", type: "WM" },
    { name: "Mehmet S.", service: "Klima Servisi", location: "Karşıyaka, İzmir", time: "6 dk önce", type: "AC" },
    { name: "Fatma D.", service: "Buzdolabı Tamiri", location: "Osmangazi, Bursa", time: "8 dk önce", type: "RF" },
    { name: "Ali V.", service: "Uydu Sistemi", location: "Muratpaşa, Antalya", time: "1 dk önce", type: "SAT" },
    { name: "Zeynep A.", service: "Elektrikli Süpürge", location: "Seyhan, Adana", time: "3 dk önce", type: "VC" },
    { name: "Mustafa E.", service: "Mikrodalga Fırın", location: "Selçuklu, Konya", time: "7 dk önce", type: "MW" },
    { name: "Elif T.", service: "Televizyon Tamiri", location: "Şehitkamil, Gaziantep", time: "9 dk önce", type: "TV" }
];

// Initialize live request feed
function initializeLiveRequestFeed() {
    try {
        const feedContainer = document.getElementById('job-feed');
        if (!feedContainer) {
            console.log('Live request feed container not found');
            return;
        }

        // Start the feed system
        liveRequestSystem.isActive = true;
        updateLiveRequestFeed();
        
        // Start auto-update timer
        setInterval(() => {
            if (liveRequestSystem.isActive) {
                updateLiveRequestFeed();
                updateRecentRequestCount();
            }
        }, liveRequestSystem.updateInterval);
        
    } catch (error) {
        console.error('Error initializing live request feed:', error);
    }
}

// Update live request feed display
function updateLiveRequestFeed() {
    try {
        const feedContainer = document.getElementById('job-feed');
        if (!feedContainer) return;

        // Clear existing content
        feedContainer.innerHTML = '';
        
        // Show random 5-6 requests
        const shuffled = [...liveRequestsData].sort(() => 0.5 - Math.random());
        const selectedRequests = shuffled.slice(0, Math.floor(Math.random() * 2) + 5);
        
        selectedRequests.forEach((request, index) => {
            const requestElement = document.createElement('div');
            // Modern minimal card design
            requestElement.className = 'group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300';
            
            requestElement.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex items-start space-x-3">
                        <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                            <i class="fas fa-${getServiceIcon(request.type)} text-gray-600 text-xs"></i>
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-1">
                                <span class="font-medium text-gray-900 text-sm">${request.name}</span>
                                <span class="text-gray-500 text-xs">${request.time}</span>
                            </div>
                            <div class="text-gray-700 text-sm font-medium mb-1">${request.service}</div>
                            <div class="text-gray-500 text-xs">${request.location}</div>
                        </div>
                    </div>
                    <div class="w-2 h-2 bg-blue-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"></div>
                </div>
            `;
            
            feedContainer.appendChild(requestElement);
        });
        
    } catch (error) {
        console.error('Error updating live request feed:', error);
    }
}

// Update recent request count
function updateRecentRequestCount() {
    try {
        const countElement = document.getElementById('recent-count');
        if (!countElement) return;
        
        // Vary the count between 6-12
        liveRequestSystem.requestCounter = Math.floor(Math.random() * 7) + 6;
        countElement.textContent = liveRequestSystem.requestCounter + ' Talep';
        
    } catch (error) {
        console.error('Error updating recent request count:', error);
    }
}

// Get service icon for request type
function getServiceIcon(type) {
    const icons = {
        'TV': 'tv',
        'WM': 'tint',
        'AC': 'snowflake',
        'RF': 'cube',
        'SAT': 'satellite-dish',
        'VC': 'broom',
        'MW': 'fire'
    };
    return icons[type] || 'tools';
}

// ========================================
// LIVE STATISTICS SYSTEM (CANLI İSTATİSTİKLER)
// ========================================

let liveStatsSystem = {
    isActive: false,
    updateInterval: 8000, // 8 seconds
    baseHourlyTotal: 47,
    baseCityData: {
        'İstanbul': 47,
        'Ankara': 28,
        'Bursa': 14
    },
    categoryData: [
        { name: 'Televizyon Tamiri', percentage: 34 },
        { name: 'Çamaşır Makinesi', percentage: 28 },
        { name: 'Klima Servisi', percentage: 22 }
    ]
};

// Initialize live statistics system
function initializeLiveStats() {
    try {
        liveStatsSystem.isActive = true;
        updateLiveStats();
        
        // Start auto-update timer
        setInterval(() => {
            if (liveStatsSystem.isActive) {
                updateLiveStats();
            }
        }, liveStatsSystem.updateInterval);
        
    } catch (error) {
        console.error('Error initializing live stats:', error);
    }
}

// Update all live statistics
function updateLiveStats() {
    try {
        updateHourlyTotal();
        updateCityStats();
        updateCategoryStats();
        updateStatsChart();
        
    } catch (error) {
        console.error('Error updating live stats:', error);
    }
}

// Update hourly total requests
function updateHourlyTotal() {
    try {
        const hourlyElement = document.getElementById('hourly-total');
        if (!hourlyElement) return;
        
        // Vary the hourly total by ±5
        const variation = Math.floor(Math.random() * 11) - 5; // -5 to +5
        const newTotal = Math.max(30, liveStatsSystem.baseHourlyTotal + variation);
        
        hourlyElement.textContent = newTotal + ' Talep';
        
    } catch (error) {
        console.error('Error updating hourly total:', error);
    }
}

// Update city statistics
function updateCityStats() {
    try {
        const cityElements = document.querySelectorAll('[data-city-stat]');
        
        Object.keys(liveStatsSystem.baseCityData).forEach(city => {
            const element = document.querySelector(`[data-city="${city}"]`);
            if (element) {
                const baseValue = liveStatsSystem.baseCityData[city];
                const variation = Math.floor(Math.random() * 7) - 3; // -3 to +3
                const newValue = Math.max(1, baseValue + variation);
                element.textContent = newValue;
                
                // Minimal color coding for activity
                if (newValue > baseValue + 1) {
                    element.className = 'text-gray-800 font-semibold';
                } else if (newValue < baseValue - 1) {
                    element.className = 'text-gray-500 font-semibold';
                } else {
                    element.className = 'text-gray-700 font-semibold';
                }
            }
        });
        
    } catch (error) {
        console.error('Error updating city stats:', error);
    }
}

// Update category statistics
function updateCategoryStats() {
    try {
        liveStatsSystem.categoryData.forEach((category, index) => {
            const percentElement = document.querySelector(`[data-category-percent="${index}"]`);
            const barElement = document.querySelector(`[data-category-bar="${index}"]`);
            
            if (percentElement && barElement) {
                // Vary percentage by ±3
                const variation = Math.floor(Math.random() * 7) - 3; // -3 to +3
                const newPercent = Math.max(5, Math.min(50, category.percentage + variation));
                
                percentElement.textContent = newPercent + '%';
                
                // Modern minimal progress bars
                const widthPercent = Math.max(5, Math.min(95, newPercent));
                const grayShades = ['bg-gray-600', 'bg-gray-500', 'bg-gray-400'];
                const colorClass = grayShades[index] || 'bg-gray-500';
                
                barElement.style.width = widthPercent + '%';
                barElement.className = `h-full ${colorClass} rounded-full transition-all duration-300`;
            }
        });
        
    } catch (error) {
        console.error('Error updating category stats:', error);
    }
}

// Update statistics chart bars
function updateStatsChart() {
    try {
        const chartBars = document.querySelectorAll('[data-chart-bar]');
        
        chartBars.forEach(bar => {
            const currentHeight = parseInt(bar.style.height) || 30;
            const variation = Math.floor(Math.random() * 21) - 10; // -10 to +10
            const newHeight = Math.max(20, Math.min(100, currentHeight + variation));
            
            bar.style.height = newHeight + '%';
        });
        
    } catch (error) {
        console.error('Error updating stats chart:', error);
    }
}

// Get progress bar width class based on percentage
function getProgressBarWidth(percentage) {
    if (percentage >= 40) return 'w-3/4';
    if (percentage >= 30) return 'w-2/3';
    if (percentage >= 20) return 'w-1/2';
    if (percentage >= 15) return 'w-2/5';
    if (percentage >= 10) return 'w-1/3';
    return 'w-1/4';
}

// Export functions to window
window.changeStorySlide = changeStorySlide;
window.resetStoryTimer = resetStoryTimer;
window.initializeSuccessStories = initializeSuccessStories;
window.initializeLiveRequestFeed = initializeLiveRequestFeed;
window.initializeLiveStats = initializeLiveStats;