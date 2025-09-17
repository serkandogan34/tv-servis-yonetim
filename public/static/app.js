// TV Servis Yönetim Sistemi - Frontend JavaScript

// Global state
let currentSection = 'dashboard';
let cities = [];
let dealers = [];
let jobs = [];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('TV Servis Yönetim Sistemi başlatılıyor...');
    
    // Load initial data
    loadCities();
    loadDashboardStats();
    
    // Show dashboard by default
    showSection('dashboard');
});

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.add('hidden'));
    
    // Show selected section
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
        currentSection = sectionName;
        
        // Load section-specific data
        switch(sectionName) {
            case 'dashboard':
                loadDashboardStats();
                break;
            case 'jobs':
                loadActiveJobs();
                break;
            case 'dealers':
                loadDealers();
                break;
        }
    }
}

// Dashboard functions
async function loadDashboardStats() {
    try {
        console.log('Dashboard istatistikleri yükleniyor...');
        
        const response = await axios.get('/api/dashboard/stats');
        const stats = response.data;
        
        // Update stats cards
        document.getElementById('total-jobs').textContent = stats.totalJobs || 0;
        document.getElementById('active-jobs').textContent = stats.activeJobs || 0;
        document.getElementById('completed-jobs').textContent = stats.completedJobs || 0;
        document.getElementById('total-dealers').textContent = stats.totalDealers || 0;
        
        // Update recent jobs chart (simple bar representation)
        updateRecentJobsChart(stats.recentJobs || []);
        
        // Update jobs by city
        updateJobsByCity(stats.jobsByCity || []);
        
        console.log('Dashboard istatistikleri güncellendi');
    } catch (error) {
        console.error('Dashboard istatistikleri yüklenirken hata:', error);
        showError('Dashboard verileri yüklenemedi');
    }
}

function updateRecentJobsChart(data) {
    const chartContainer = document.getElementById('recent-jobs-chart');
    
    if (!data || data.length === 0) {
        chartContainer.innerHTML = '<p class=\"text-gray-500 text-center\">Son 7 günde iş kaydı bulunamadı</p>';
        return;
    }
    
    const maxCount = Math.max(...data.map(item => item.sayi));
    
    let chartHTML = '<div class=\"space-y-2\">';
    data.forEach(item => {
        const percentage = maxCount > 0 ? (item.sayi / maxCount) * 100 : 0;
        const date = new Date(item.tarih).toLocaleDateString('tr-TR');
        
        chartHTML += `
            <div class=\"flex items-center justify-between text-sm\">
                <span class=\"w-20\">${date}</span>
                <div class=\"flex-1 mx-3\">
                    <div class=\"bg-gray-200 rounded-full h-4\">
                        <div class=\"bg-blue-500 h-4 rounded-full\" style=\"width: ${percentage}%\"></div>
                    </div>
                </div>
                <span class=\"w-8 text-right font-semibold\">${item.sayi}</span>
            </div>
        `;
    });
    chartHTML += '</div>';
    
    chartContainer.innerHTML = chartHTML;
}

function updateJobsByCity(data) {
    const container = document.getElementById('jobs-by-city');
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class=\"text-gray-500 text-center\">İl bazında iş verisi bulunamadı</p>';
        return;
    }
    
    const maxCount = Math.max(...data.map(item => item.sayi));
    
    let html = '';
    data.forEach((item, index) => {
        const percentage = maxCount > 0 ? (item.sayi / maxCount) * 100 : 0;
        
        html += `
            <div class=\"flex items-center justify-between py-2 border-b border-gray-100\">
                <div class=\"flex items-center space-x-2\">
                    <span class=\"text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded\">${index + 1}</span>
                    <span class=\"font-medium\">${item.il_adi}</span>\n                </div>\n                <div class=\"flex items-center space-x-2\">\n                    <div class=\"w-24 bg-gray-200 rounded-full h-2\">\n                        <div class=\"bg-blue-500 h-2 rounded-full\" style=\"width: ${percentage}%\"></div>\n                    </div>\n                    <span class=\"text-sm font-semibold w-8 text-right\">${item.sayi}</span>\n                </div>\n            </div>\n        `;\n    });\n    \n    container.innerHTML = html;\n}\n\n// Jobs functions\nasync function loadActiveJobs() {\n    try {\n        console.log('Aktif işler yükleniyor...');\n        \n        const response = await axios.get('/api/jobs/active');\n        jobs = response.data;\n        \n        displayJobs(jobs);\n        console.log(`${jobs.length} aktif iş yüklendi`);\n    } catch (error) {\n        console.error('Aktif işler yüklenirken hata:', error);\n        showError('İşler listelenemedi');\n    }\n}\n\nfunction displayJobs(jobsList) {\n    const container = document.getElementById('jobs-list');\n    \n    if (!jobsList || jobsList.length === 0) {\n        container.innerHTML = `\n            <div class=\"text-center py-8 text-gray-500\">\n                <i class=\"fas fa-inbox text-4xl mb-4\"></i>\n                <p>Aktif iş bulunamadı</p>\n            </div>\n        `;\n        return;\n    }\n    \n    let html = '<div class=\"space-y-4\">';\n    \n    jobsList.forEach(job => {\n        const priorityColor = {\n            'yüksek': 'bg-red-100 text-red-800 border-red-200',\n            'normal': 'bg-yellow-100 text-yellow-800 border-yellow-200',\n            'düşük': 'bg-green-100 text-green-800 border-green-200'\n        }[job.oncelik] || 'bg-gray-100 text-gray-800 border-gray-200';\n        \n        const statusColor = {\n            'yeni': 'bg-blue-100 text-blue-800',\n            'atandı': 'bg-orange-100 text-orange-800',\n            'devam_ediyor': 'bg-purple-100 text-purple-800'\n        }[job.durum] || 'bg-gray-100 text-gray-800';\n        \n        const createdDate = new Date(job.created_at).toLocaleDateString('tr-TR');\n        \n        html += `\n            <div class=\"border rounded-lg p-4 hover:shadow-md transition-shadow\">\n                <div class=\"flex justify-between items-start mb-3\">\n                    <div class=\"flex items-center space-x-3\">\n                        <h4 class=\"font-semibold text-lg\">${job.talep_kodu}</h4>\n                        <span class=\"px-3 py-1 rounded-full text-xs font-medium ${priorityColor} border\">\n                            ${job.oncelik} öncelik\n                        </span>\n                        <span class=\"px-3 py-1 rounded-full text-xs font-medium ${statusColor}\">\n                            ${job.durum}\n                        </span>\n                    </div>\n                    <span class=\"text-sm text-gray-500\">${createdDate}</span>\n                </div>\n                \n                <div class=\"grid grid-cols-1 md:grid-cols-2 gap-4 mb-3\">\n                    <div>\n                        <p class=\"text-sm text-gray-600 mb-1\">Müşteri Bilgileri</p>\n                        <p class=\"font-medium\">${job.musteri_adi}</p>\n                        <p class=\"text-sm text-gray-600\">${job.telefon}</p>\n                        <p class=\"text-sm text-gray-600\">${job.adres}</p>\n                        <p class=\"text-sm text-gray-600\">${job.il_adi}${job.ilce_adi ? ' / ' + job.ilce_adi : ''}</p>\n                    </div>\n                    \n                    <div>\n                        <p class=\"text-sm text-gray-600 mb-1\">Servis Detayları</p>\n                        <p class=\"font-medium\">${job.servis_turu}</p>\n                        <p class=\"text-sm text-gray-600\">Marka: ${job.tv_marka || 'Belirtilmemiş'}</p>\n                        <p class=\"text-sm text-gray-600\">Model: ${job.tv_model || 'Belirtilmemiş'}</p>\n                        ${job.bayi_adi ? `<p class=\"text-sm text-green-600 font-medium\">Atanan: ${job.bayi_adi}</p>` : ''}\n                    </div>\n                </div>\n                \n                <div class=\"mb-3\">\n                    <p class=\"text-sm text-gray-600 mb-1\">Açıklama</p>\n                    <p class=\"text-sm\">${job.aciklama}</p>\n                </div>\n                \n                ${job.durum === 'yeni' ? `\n                    <div class=\"flex space-x-2\">\n                        <button onclick=\"showAssignModal(${job.id})\" class=\"bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm\">\n                            <i class=\"fas fa-user-plus mr-1\"></i> Bayi Ata\n                        </button>\n                        <button onclick=\"editJob(${job.id})\" class=\"bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm\">\n                            <i class=\"fas fa-edit mr-1\"></i> Düzenle\n                        </button>\n                    </div>\n                ` : ''}\n            </div>\n        `;\n    });\n    \n    html += '</div>';\n    container.innerHTML = html;\n}\n\n// Dealers functions\nasync function loadDealers() {\n    try {\n        console.log('Bayiler yükleniyor...');\n        \n        const citySelect = document.getElementById('city-filter');\n        const selectedCity = citySelect ? citySelect.value : '';\n        \n        let url = '/api/dealers';\n        if (selectedCity) {\n            url += `?il_id=${selectedCity}`;\n        }\n        \n        const response = await axios.get(url);\n        dealers = response.data;\n        \n        displayDealers(dealers);\n        console.log(`${dealers.length} bayi yüklendi`);\n    } catch (error) {\n        console.error('Bayiler yüklenirken hata:', error);\n        showError('Bayiler listelenemedi');\n    }\n}\n\nfunction displayDealers(dealersList) {\n    const container = document.getElementById('dealers-list');\n    \n    if (!dealersList || dealersList.length === 0) {\n        container.innerHTML = `\n            <div class=\"text-center py-8 text-gray-500\">\n                <i class=\"fas fa-store text-4xl mb-4\"></i>\n                <p>Bayi bulunamadı</p>\n            </div>\n        `;\n        return;\n    }\n    \n    let html = '<div class=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\">';\n    \n    dealersList.forEach(dealer => {\n        const rating = dealer.rating || 5.0;\n        const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));\n        \n        html += `\n            <div class=\"border rounded-lg p-4 hover:shadow-md transition-shadow\">\n                <div class=\"flex justify-between items-start mb-3\">\n                    <h4 class=\"font-semibold text-lg\">${dealer.firma_adi}</h4>\n                    <span class=\"text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded\">${dealer.bayi_kodu}</span>\n                </div>\n                \n                <div class=\"space-y-2 mb-4\">\n                    <p class=\"text-sm\">\n                        <i class=\"fas fa-user text-gray-500 w-4\"></i>\n                        <span class=\"ml-1\">${dealer.yetkili_adi}</span>\n                    </p>\n                    <p class=\"text-sm\">\n                        <i class=\"fas fa-phone text-gray-500 w-4\"></i>\n                        <span class=\"ml-1\">${dealer.telefon}</span>\n                    </p>\n                    ${dealer.email ? `\n                        <p class=\"text-sm\">\n                            <i class=\"fas fa-envelope text-gray-500 w-4\"></i>\n                            <span class=\"ml-1\">${dealer.email}</span>\n                        </p>\n                    ` : ''}\n                    <p class=\"text-sm\">\n                        <i class=\"fas fa-map-marker-alt text-gray-500 w-4\"></i>\n                        <span class=\"ml-1\">${dealer.adres}</span>\n                    </p>\n                    <p class=\"text-sm\">\n                        <i class=\"fas fa-city text-gray-500 w-4\"></i>\n                        <span class=\"ml-1\">${dealer.il_adi}${dealer.ilce_adi ? ' / ' + dealer.ilce_adi : ''}</span>\n                    </p>\n                </div>\n                \n                ${dealer.uzmanlik_alani ? `\n                    <div class=\"mb-3\">\n                        <p class=\"text-xs text-gray-600 mb-1\">Uzmanlık Alanı</p>\n                        <p class=\"text-sm bg-gray-100 px-2 py-1 rounded\">${dealer.uzmanlik_alani}</p>\n                    </div>\n                ` : ''}\n                \n                <div class=\"flex justify-between items-center text-sm\">\n                    <div>\n                        <span class=\"text-yellow-500\">${stars}</span>\n                        <span class=\"ml-1 text-gray-600\">(${rating.toFixed(1)})</span>\n                    </div>\n                    <span class=\"text-gray-600\">\n                        <i class=\"fas fa-check-circle text-green-500\"></i>\n                        ${dealer.tamamlanan_is_sayisi} iş\n                    </span>\n                </div>\n                \n                <div class=\"mt-3 flex space-x-2\">\n                    <button onclick=\"viewDealerDetails(${dealer.id})\" class=\"flex-1 bg-blue-500 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm\">\n                        <i class=\"fas fa-eye mr-1\"></i> Detay\n                    </button>\n                    <button onclick=\"assignJobToDealer(${dealer.id})\" class=\"flex-1 bg-green-500 hover:bg-green-700 text-white px-3 py-1 rounded text-sm\">\n                        <i class=\"fas fa-plus mr-1\"></i> İş Ata\n                    </button>\n                </div>\n            </div>\n        `;\n    });\n    \n    html += '</div>';\n    container.innerHTML = html;\n}\n\n// Load cities for filter\nasync function loadCities() {\n    try {\n        console.log('İller yükleniyor...');\n        \n        const response = await axios.get('/api/cities');\n        cities = response.data;\n        \n        // Update city filter dropdown\n        const citySelect = document.getElementById('city-filter');\n        if (citySelect && cities.length > 0) {\n            let options = '<option value=\"\">Tüm İller</option>';\n            cities.forEach(city => {\n                options += `<option value=\"${city.id}\">${city.il_adi}</option>`;\n            });\n            citySelect.innerHTML = options;\n        }\n        \n        console.log(`${cities.length} il yüklendi`);\n    } catch (error) {\n        console.error('İller yüklenirken hata:', error);\n    }\n}\n\n// Modal and interaction functions\nfunction showAssignModal(jobId) {\n    // TODO: Modal implementation for job assignment\n    alert('İş atama modalı henüz geliştirilmedi. Job ID: ' + jobId);\n}\n\nfunction editJob(jobId) {\n    // TODO: Job editing functionality\n    alert('İş düzenleme henüz geliştirilmedi. Job ID: ' + jobId);\n}\n\nfunction viewDealerDetails(dealerId) {\n    // TODO: Dealer details modal\n    alert('Bayi detayları henüz geliştirilmedi. Dealer ID: ' + dealerId);\n}\n\nfunction assignJobToDealer(dealerId) {\n    // TODO: Assign job to dealer functionality\n    alert('Bayiye iş atama henüz geliştirilmedi. Dealer ID: ' + dealerId);\n}\n\n// Utility functions\nfunction showError(message) {\n    // Simple error notification\n    const errorDiv = document.createElement('div');\n    errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';\n    errorDiv.innerHTML = `\n        <span class=\"block sm:inline\">${message}</span>\n        <span class=\"absolute top-0 bottom-0 right-0 px-4 py-3\" onclick=\"this.parentElement.remove()\">\n            <i class=\"fas fa-times cursor-pointer\"></i>\n        </span>\n    `;\n    document.body.appendChild(errorDiv);\n    \n    // Auto remove after 5 seconds\n    setTimeout(() => {\n        if (errorDiv.parentNode) {\n            errorDiv.parentNode.removeChild(errorDiv);\n        }\n    }, 5000);\n}\n\nfunction showSuccess(message) {\n    // Simple success notification\n    const successDiv = document.createElement('div');\n    successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';\n    successDiv.innerHTML = `\n        <span class=\"block sm:inline\">${message}</span>\n        <span class=\"absolute top-0 bottom-0 right-0 px-4 py-3\" onclick=\"this.parentElement.remove()\">\n            <i class=\"fas fa-times cursor-pointer\"></i>\n        </span>\n    `;\n    document.body.appendChild(successDiv);\n    \n    // Auto remove after 3 seconds\n    setTimeout(() => {\n        if (successDiv.parentNode) {\n            successDiv.parentNode.removeChild(successDiv);\n        }\n    }, 3000);\n}\n\n// Export functions for global access\nwindow.showSection = showSection;\nwindow.loadActiveJobs = loadActiveJobs;\nwindow.loadDealers = loadDealers;\nwindow.showAssignModal = showAssignModal;\nwindow.editJob = editJob;\nwindow.viewDealerDetails = viewDealerDetails;\nwindow.assignJobToDealer = assignJobToDealer;