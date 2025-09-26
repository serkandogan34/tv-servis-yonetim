// Simple Form Handler - No Turkish characters
console.log('Form handler loaded');

// Add missing functions that are called from HTML
function updateFormProgress() {
    console.log('Form progress updated');
}

function validateStep(stepNum) {
    console.log('Step', stepNum, 'validated');
}

function showNearbyExperts() {
    console.log('Showing nearby experts');
}

function handleCityChange() {
    console.log('City changed');
}

function showEstimatedPrice() {
    console.log('Showing estimated price');
}

function analyzeDescription() {
    console.log('Analyzing description');
}

// Make functions globally available
window.updateFormProgress = updateFormProgress;
window.validateStep = validateStep;
window.showNearbyExperts = showNearbyExperts;
window.handleCityChange = handleCityChange;
window.showEstimatedPrice = showEstimatedPrice;
window.analyzeDescription = analyzeDescription;

function submitServiceRequest(event) {
    event.preventDefault();
    
    const form = document.getElementById('serviceRequestForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const messages = document.getElementById('formMessages');
    const success = document.getElementById('successMessage'); 
    const error = document.getElementById('errorMessage');
    
    // Hide previous messages
    if (success) success.classList.add('hidden');
    if (error) error.classList.add('hidden');
    if (messages) messages.classList.add('hidden');
    
    // Show loading
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>SENDING...';
    submitBtn.disabled = true;
    
    // Debug: Check form elements first
    console.log('Form found:', form);
    console.log('Form elements check:');
    console.log('- customerName element:', document.getElementById('customerName'));
    console.log('- customerPhone element:', document.getElementById('customerPhone'));
    console.log('- customerCity element:', document.getElementById('customerCity'));
    console.log('- serviceCategory element:', document.getElementById('serviceCategory'));
    console.log('- problemDescription element:', document.getElementById('problemDescription'));
    
    // Get form data using FormData (since all fields have name attributes)
    const formData = new FormData(form);
    
    // Debug: Show all FormData entries
    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
        console.log(`- ${key}: "${value}"`);
    }
    
    const data = {
        customerName: formData.get('customerName') || '',
        customerPhone: formData.get('customerPhone') || '',
        customerCity: formData.get('customerCity') || '',
        customerDistrict: formData.get('customerDistrict') || '',
        serviceCategory: formData.get('serviceCategory') || '',
        problemDescription: formData.get('problemDescription') || '',
        urgency: formData.get('urgency') || 'normal',
        contactPreference: []
    };
    
    // Get contact preferences (default to phone if none selected)
    const contactCheckboxes = document.querySelectorAll('input[name="contactPreference"]:checked');
    if (contactCheckboxes.length > 0) {
        contactCheckboxes.forEach(input => {
            data.contactPreference.push(input.value);
        });
    } else {
        data.contactPreference = ['phone']; // default
    }
    
    // Debug: Log final form data
    console.log('Final form data collected:', data);
    console.log('Values check:');
    console.log('- customerName value:', `"${data.customerName}" (length: ${data.customerName.length})`);
    console.log('- customerPhone value:', `"${data.customerPhone}" (length: ${data.customerPhone.length})`);
    console.log('- customerCity value:', `"${data.customerCity}" (length: ${data.customerCity.length})`);
    console.log('- serviceCategory value:', `"${data.serviceCategory}" (length: ${data.serviceCategory.length})`);
    console.log('- problemDescription value:', `"${data.problemDescription}" (length: ${data.problemDescription.length})`);
    
    // Validate required fields
    if (!data.customerName.trim()) {
        showError('Customer name is required');
        resetButton();
        return;
    }
    if (!data.customerPhone.trim()) {
        showError('Phone number is required');
        resetButton();
        return;
    }
    if (!data.customerCity.trim()) {
        showError('City is required');
        resetButton();
        return;
    }
    if (!data.serviceCategory.trim()) {
        showError('Service category is required');
        resetButton();
        return;
    }
    if (!data.problemDescription.trim()) {
        showError('Problem description is required');
        resetButton();
        return;
    }
    
    // Send request
    fetch('/api/service-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showSuccess('Request submitted successfully! Code: ' + result.requestCode);
            form.reset();
        } else {
            showError(result.error || 'Submission failed');
        }
    })
    .catch(err => {
        showError('Network error occurred');
        console.error(err);
    })
    .finally(() => {
        resetButton();
    });
    
    function showSuccess(message) {
        if (success && messages) {
            success.innerHTML = '<i class="fas fa-check-circle mr-2"></i>' + message;
            success.classList.remove('hidden');
            messages.classList.remove('hidden');
            setTimeout(() => messages.scrollIntoView({ behavior: 'smooth' }), 500);
        }
    }
    
    function showError(message) {
        if (error && messages) {
            error.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i>' + message;
            error.classList.remove('hidden');
            messages.classList.remove('hidden');
        }
    }
    
    function resetButton() {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('serviceRequestForm');
    if (form) {
        form.addEventListener('submit', submitServiceRequest);
        console.log('Form handler attached successfully');
    }
});

// Also try to attach on window load as backup
window.addEventListener('load', function() {
    const form = document.getElementById('serviceRequestForm');
    if (form && !form.hasAttribute('data-handler-attached')) {
        form.addEventListener('submit', submitServiceRequest);
        form.setAttribute('data-handler-attached', 'true');
        console.log('Backup form handler attached');
    }
});