const fs = require('fs');
const path = require('path');

const folderPath = path.join(__dirname, 'img_love/TX_0612');
const files = fs.readdirSync(folderPath);

// Lọc chỉ ảnh JPG, JPEG
const images = files.filter(file => 
    /\.(jpg|jpeg|png)$/i.test(file)
).map(file => file);

// Ghi vào images.json
fs.writeFileSync(
    path.join(__dirname, 'images.json'),
    JSON.stringify({ images }, null, 2)
);

console.log(`✅ Tạo images.json với ${images.length} ảnh`);
