// Simple Slider.js for compatibility
console.log('Slider.js loaded successfully');

// Basic slider functionality
function initSlider() {
    console.log('Slider initialized');
}

// Auto-start if DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSlider);
} else {
    initSlider();
}