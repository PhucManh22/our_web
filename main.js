function startLove() {
    document.getElementById("startScreen").style.display = "none";
    const messageDiv = document.getElementById("message");
    messageDiv.style.display = "block";
    messageDiv.classList.add("show");
    setInterval(createHeart, 500);

    // Timer
    setInterval(updateTimer, 1000);
}

// Export startLove để HTML gọi
window.startLove = startLove;
console.log("✅ startLove exported");

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
        
        const randomImages = getRandomImages(allImages, 40); // giảm số ảnh để đỡ nặng
        const reelTrack = document.querySelector(".reel-track");
        
        // Thêm ảnh 2 lần nhưng shuffle lại lần thứ 2 để tạo hiệu ứng ngẫu nhiên
        for (let loop = 0; loop < 2; loop++) {
            const imagesToAdd = loop === 0 ? randomImages : getRandomImages(allImages, 50);
            imagesToAdd.forEach(imgName => {
                const frame = document.createElement("div");
                frame.classList.add("film-frame");
                
                const img = document.createElement("img");
                img.src = `img_love/TX_0612/${imgName}`;
                img.alt = "Memory";
                img.loading = "lazy";
                img.decoding = "async";
                img.sizes = "(max-width: 768px) 80vw, 300px";
                
                // Click để xem preview/zoom + tải về
                img.addEventListener("click", () => openImagePreview(img.src));
                
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
    
    // Phát nhạc ngay lập tức
    const music = document.getElementById("music");
    music.volume = 0.5;
    
    // Cố gắng phát nhạc
    const playPromise = music.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('Nhạc đang phát');
        }).catch(err => {
            console.log('Autoplay bị chặn, sẽ phát khi người dùng tương tác');
        });
    }
    
    // Gắn sự kiện cho nút "Bắt đầu" (chỉ nút ở màn hình chính)
    const startBtn = document.querySelector('#startScreen button');
    if (startBtn) {
        startBtn.addEventListener("click", () => {
            startLove();
            // Đảm bảo nhạc vẫn phát
            music.play().catch(err => console.error('Lỗi phát nhạc:', err));
        });
    }
});

// ===== QUẢN LÝ GHI CHÚ (FastAPI backend + password đọc ghi chú) =====
const modal = document.getElementById("noteModal");
const notesViewModal = document.getElementById("notesViewModal");
const noteBtn = document.getElementById("noteBtn");
const closeBtn = document.querySelector(".close");
const closeNotesBtn = document.querySelector(".close-notes");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const noteText = document.getElementById("noteText");
const notesList = document.getElementById("notesList");

const NOTES_API_BASE = "https://fast-api-backend.fly.dev/notes";
const NOTES_READ_PASSWORD = "yeuThaonhatnha"; // TODO: đổi mật khẩu tuỳ ý

// ===== Preview ảnh =====
const imagePreviewModal = document.getElementById("imagePreviewModal");
const previewImage = document.getElementById("previewImage");
const downloadImageLink = document.getElementById("downloadImage");
const closeImageBtn = document.querySelector(".close-image");

function openImagePreview(src) {
    if (!imagePreviewModal || !previewImage || !downloadImageLink) return;
    previewImage.src = src;
    downloadImageLink.href = src;
    imagePreviewModal.style.display = "block";
}

function attachNoteUiEvents() {
    if (!noteBtn) return;

    noteBtn.addEventListener("click", () => {
        modal.style.display = "block";
    });

    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
        if (e.target === notesViewModal) {
            notesViewModal.style.display = "none";
        }
        if (e.target === imagePreviewModal) {
            imagePreviewModal.style.display = "none";
        }
    });

    if (closeNotesBtn) {
        closeNotesBtn.addEventListener("click", () => {
            notesViewModal.style.display = "none";
        });
    }

    if (closeImageBtn) {
        closeImageBtn.addEventListener("click", () => {
            imagePreviewModal.style.display = "none";
        });
    }

    // Enter để gửi (Shift+Enter để xuống dòng)
    if (noteText) {
        noteText.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                saveBtn.click();
            }
        });
    }

    // ESC để đóng bất kỳ popup nào đang mở
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" || e.key === "Esc") {
            if (modal && modal.style.display === "block") {
                modal.style.display = "none";
            }
            if (notesViewModal && notesViewModal.style.display === "block") {
                notesViewModal.style.display = "none";
            }
            if (imagePreviewModal && imagePreviewModal.style.display === "block") {
                imagePreviewModal.style.display = "none";
            }
        }
    });

    saveBtn.addEventListener("click", async () => {
        const text = noteText.value.trim();
        if (text === "") {
            alert("Hãy viết ghi chú trước khi lưu!");
            return;
        }

        // Gửi lên backend bằng POST /notes
        try {
            const res = await fetch(NOTES_API_BASE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: text })
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || "Lưu ghi chú thất bại");
            }
            console.log("✅ Đã lưu ghi chú lên backend");
            alert("Đã lưu giữ lời yêu thương 💕");
        } catch (err) {
            console.warn("⚠️ Lỗi lưu ghi chú:", err.message);
            alert("Không lưu được ghi chú lên server. Thử lại sau nhé.");
        }

        noteText.value = "";
    });

    // Nút đọc ghi chú (yêu cầu nhập mật khẩu trước)
    if (loadBtn) {
        loadBtn.addEventListener("click", () => {
            const pwd = prompt("Nhập mật khẩu để đọc ghi chú:");
            if (pwd === null) return; // cancel
            if (pwd !== NOTES_READ_PASSWORD) {
                alert("Mật khẩu không đúng rồi 🥺");
                return;
            }
            loadNotes();
        });
    }
}

// Khởi tạo khi trang load
document.addEventListener("DOMContentLoaded", () => {
    attachNoteUiEvents();
});

// Tải danh sách ghi chú
async function loadNotes() {
    notesList.innerHTML = "<p style='color:#999;text-align:center;'>Đang tải ghi chú...</p>";

    try {
        const res = await fetch(NOTES_API_BASE, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || `Lỗi tải ghi chú: ${res.status}`);
        }
        const data = await res.json();
        const notes = Array.isArray(data) ? data : (data.notes || []);

        if (!notes || notes.length === 0) {
            notesList.innerHTML = "<p style='color: #999; text-align: center;'>Chưa có ghi chú nào</p>";
            notesViewModal.style.display = "block";
            return;
        }

        renderNotes(notes);
        notesViewModal.style.display = "block";
    } catch (err) {
        console.warn("⚠️ Không tải được ghi chú:", err.message);
        notesList.innerHTML = "<p style='color:#ff4d6d;text-align:center;'>Không tải được ghi chú từ server.</p>";
    }
}

function renderNotes(notes) {
    notesList.innerHTML = "";
    notes.forEach(note => {
        const noteItem = document.createElement("div");
        noteItem.className = "note-item";

        // Hỗ trợ cả format {content, created_at} hoặc {text, time}
        const content = note.content || note.text || "";
        const time = note.created_at || note.time || "";

        noteItem.innerHTML = `
            <p>${content}</p>
            <time>${time}</time>
        `;
        notesList.appendChild(noteItem);
    });
}
