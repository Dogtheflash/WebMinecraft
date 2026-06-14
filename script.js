// 1. Loading logic
const progress = document.getElementById('progress-bar');
const loader = document.getElementById('loading-screen');
const audio = document.getElementById('bg-audio');

let width = 0;
let interval = setInterval(() => {
    width += 2;
    progress.style.width = width + '%';
    if(width >= 100) {
        clearInterval(interval);
        document.getElementById('enter-btn').style.display = 'block';
    }
}, 30);

document.getElementById('enter-btn').addEventListener('click', () => {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 500);
    audio.play().catch(() => console.log("Autoplay blocked"));
});

// 2. Snowflakes
const snowContainer = document.getElementById('snow-container');
for(let i=0; i<80; i++) {
    const snow = document.createElement('div');
    snow.className = 'snowflake';
    snow.style.left = Math.random() * 100 + 'vw';
    snow.style.animationDuration = (Math.random() * 3 + 2) + 's';
    snowContainer.appendChild(snow);
}

// 3. 3D Tilt Effect
document.querySelectorAll('.tilt').forEach(card => {
    card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.transform = `rotateX(${(y/rect.height-0.5)*20}deg) rotateY(${(x/rect.width-0.5)*-20}deg)`;
    });
    card.addEventListener('mouseleave', () => card.style.transform = 'none');
});
