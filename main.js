function startLove() {
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("message").style.display = "block";
    setInterval(createHeart, 500);

    // Timer
    setInterval(updateTimer, 1000);
}

function createHeart() {
    const heart = document.createElement("div");
    heart.classList.add("heart");
    heart.innerHTML = "❤️";
    heart.style.left = Math.random() * 100 + "vw";
    heart.style.fontSize = (Math.random() * 20 + 10) + "px";

    document.body.appendChild(heart);

    setTimeout(() => heart.remove(), 4000);
}

function updateTimer() {
    // Sửa ngày này: NGÀY BẮT ĐẦU YÊU NHAU
    const startDate = new Date("2025-09-14 00:00:00");

    const now = new Date();
    const diff = now - startDate;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    const minutes = Math.floor(diff / (1000 * 60)) % 60;
    const seconds = Math.floor(diff / 1000) % 60;

    document.getElementById("timer").innerHTML =
        `Chúng ta đã bên nhau: <br> 
        <b>${days}</b> ngày 
        <b>${hours}</b> giờ 
        <b>${minutes}</b> phút 
        <b>${seconds}</b> giây 💖`;
}

function toggleMusic() {
    const music = document.getElementById("music");
    music.paused ? music.play() : music.pause();
}

function getRandomImages(arr, count) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, arr.length));
}

async function loadFilmReel() {
    try {
        const response = await fetch('images.json');
        const data = await response.json();
        const allImages = data.images || [];
        
        if (allImages.length === 0) {
            console.warn('Không có ảnh nào trong images.json');
            return;
        }
        
        const randomImages = getRandomImages(allImages, 50);
        const reelTrack = document.querySelector(".reel-track");
        
        // Thêm ảnh 2 lần để tạo vòng lặp liên tục
        for (let loop = 0; loop < 2; loop++) {
            randomImages.forEach(imgName => {
                const frame = document.createElement("div");
                frame.classList.add("film-frame");
                
                const img = document.createElement("img");
                img.src = `img_love/TX_0612/${imgName}`;
                img.alt = "Memory";
                img.loading = "lazy";
                
                frame.appendChild(img);
                reelTrack.appendChild(frame);
            });
        }
    } catch (error) {
        console.error('Lỗi load film reel:', error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Defer loading ảnh để không chặn nhạc
    setTimeout(loadFilmReel, 500);
});
document.querySelector('button').addEventListener("click", startLove);
document.getElementById("startBtn").addEventListener("click", startLove);
