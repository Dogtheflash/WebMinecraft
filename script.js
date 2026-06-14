/* ========================================= */
/* CYBERPUNK LOADING SCREEN LOGIC            */
/* ========================================= */
window.addEventListener('load', () => {
    const progressFill = document.getElementById('loader-bar');
    const percentText = document.getElementById('loader-percent');
    const statusText = document.getElementById('loader-status');
    const cyberLoader = document.getElementById('cyber-loader');

    if (!cyberLoader) return; // Nếu không tìm thấy loader thì bỏ qua

    let progress = 0;

    function simulateLoading() {
        const increment = Math.random() * 4 + 1; 
        progress += increment;

        if (progress >= 100) {
            progress = 100;
            updateUI();
            finishLoading();
            return;
        }

        updateUI();
        setTimeout(simulateLoading, Math.random() * 100 + 50);
    }

    function updateUI() {
        progressFill.style.width = `${progress}%`;
        percentText.innerText = `${Math.floor(progress)}%`;
    }

    function finishLoading() {
        setTimeout(() => {
            statusText.innerText = "SYSTEM READY";
            statusText.style.color = "#00ffff"; 
            progressFill.style.boxShadow = "0 0 20px #00ffff, 0 0 40px #ff00ff";

            // Mờ dần màn hình loading
            setTimeout(() => {
                cyberLoader.classList.add('hide'); 
                
                // Xóa loader khỏi giao diện để bạn tương tác với Terminal ở dưới
                setTimeout(() => {
                    cyberLoader.style.display = "none";
                }, 1000);
            }, 1000);

        }, 300);
    }

    // Khởi động trình loading sau khi DOM đã sẵn sàng nửa giây
    setTimeout(simulateLoading, 500);
});
