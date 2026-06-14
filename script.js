// Loading Screen and intro interactions
document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const enterButton = document.getElementById('enterButton');
    const bgMusic = document.getElementById('bgMusic');
    const mainContent = document.getElementById('mainContent');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    bgMusic.volume = 0.4;

    const playMusic = () => {
        bgMusic.play()
            .then(() => console.log('✅ Music started successfully'))
            .catch(() => {
                console.log('Retrying music playback...');
                setTimeout(() => {
                    bgMusic.play().catch(() => {
                        console.log('Music autoplay blocked by browser. Click music button to play.');
                    });
                }, 120);
            });
    };

    // Simulate loading
    let progress = 0;
    const loadInterval = setInterval(() => {
        if (progress < 100) {
            progress += Math.random() * 30;
            if (progress > 100) progress = 100;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${Math.floor(progress)}%`;
        } else {
            clearInterval(loadInterval);
            enterButton.classList.add('show');
        }
    }, 100);

    enterButton.addEventListener('click', () => {
        loadingScreen.classList.add('hidden');
        mainContent.classList.add('show');
        playMusic();
        createSnowflakes();
        animateOnScroll();
    });
    
    // Also try to play music on any user interaction
    const tryPlayMusic = () => {
        if (bgMusic.paused) {
            bgMusic.play().catch(() => console.log('Waiting for user interaction...'));
        }
    };
    
    document.addEventListener('click', tryPlayMusic, { once: true });
    document.addEventListener('touchstart', tryPlayMusic, { once: true });

    // Initialize activity timer when page loads
    updateActivityTime();
});

// Create Snowflakes
function createSnowflakes() {
    const snow = document.getElementById('snow');
    const numberOfFlakes = 80;
    
    for (let i = 0; i < numberOfFlakes; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.textContent = '✦';
        
        // Random position and animation
        snowflake.style.left = Math.random() * 100 + 'vw';
        snowflake.style.animationDuration = (Math.random() * 3 + 3) + 's';
        snowflake.style.opacity = Math.random() * 0.6 + 0.4;
        snowflake.style.fontSize = (Math.random() * 15 + 10) + 'px';
        snowflake.style.animationDelay = Math.random() * 5 + 's';
        
        snow.appendChild(snowflake);
    }
}

// Animate skill cards on scroll
function animateOnScroll() {
    const skillCards = document.querySelectorAll('.skill-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    }, {
        threshold: 0.1
    });
    
    skillCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
}

// Glass card mouse move effect (3D tilt)
const glassCards = document.querySelectorAll('.glass-card');
glassCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const deltaX = (x - centerX) / centerX;
        const deltaY = (y - centerY) / centerY;
        
        card.style.transform = `perspective(1000px) rotateY(${deltaX * 5}deg) rotateX(${-deltaY * 5}deg) translateY(-10px)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
    });
});

// Smooth scroll for any internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Activity Time Counter
function updateActivityTime() {
    // Start time: 11/11/2025 12:00:00 PM (UTC+7)
    const startTime = new Date('2025-11-11T12:00:00+07:00');
    const activityTimeElement = document.getElementById('activityTime');
    
    function updateTime() {
        const now = new Date();
        const diff = now - startTime;
        
        // Calculate time difference
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        // Format time string
        let timeString = '';
        if (days > 0) {
            timeString = `${days} ngày ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        activityTimeElement.textContent = `${timeString} đã trôi qua`;
    }
    
    // Update immediately and then every second
    updateTime();
    setInterval(updateTime, 1000);
}

console.log('%c🚀 Portfolio loaded successfully!', 'color: #667eea; font-size: 20px; font-weight: bold;');
console.log('%c🎧 Background music volume set to 40%', 'color: #764ba2; font-size: 14px;');
console.log('%c⏱️ Activity timer started from 11/11/2025 12:00 PM', 'color: #43b581; font-size: 14px;');
