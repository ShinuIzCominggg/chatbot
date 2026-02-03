const API_KEY = "AIzaSyCPlut0Z_q4jgprpC-nqdtgazzZOVi_j_A"; // Thay API Key vào đây

// --- LOGIC SIDEBAR ---
const sidebar = document.getElementById('left-sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const toggleIcon = sidebarToggle.querySelector('i');

// 1. Toggle Click
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('expanded');
    // Xoay mũi tên
    if(sidebar.classList.contains('expanded')) {
        toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-left');
    } else {
        toggleIcon.classList.replace('fa-chevron-left', 'fa-chevron-right');
    }
});

// 2. Scroll Animation (Ẩn khi cuộn xuống, Hiện khi ở Top)
window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    // Nếu cuộn xuống quá 100px thì ẩn sidebar
    if (scrollY > 100) {
        sidebar.classList.add('hidden-by-scroll');
        // Nếu đang mở thì đóng lại luôn cho gọn
        if(sidebar.classList.contains('expanded')) {
            sidebar.classList.remove('expanded');
            toggleIcon.classList.replace('fa-chevron-left', 'fa-chevron-right');
        }
    } else {
        // Về lại đầu trang thì hiện ra
        sidebar.classList.remove('hidden-by-scroll');
    }
});

// --- LOGIC ĐỔI HÌNH NỀN (IMAGE UPLOAD) ---
const editBgBtn = document.getElementById('edit-bg-btn');
const bgUploadInput = document.getElementById('bg-upload');
const landscapeBox = document.getElementById('landscape-box');

// Click nút edit -> Kích hoạt input file
editBgBtn.addEventListener('click', () => {
    bgUploadInput.click();
});

// Khi chọn ảnh xong
bgUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            // Thay đổi background của cái khung cảnh
            landscapeBox.style.backgroundImage = `url('${event.target.result}')`;
        };
        reader.readAsDataURL(file);
    }
});


// --- LOGIC CHAT WIDGET (GIỮ NGUYÊN) ---
const widgetTrigger = document.getElementById('widget-trigger');
const chatWindow = document.getElementById('chat-window');
const closeBtn = document.getElementById('close-chat');
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const modeCheckbox = document.getElementById('mode-checkbox');
let isSetupMode = false;
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
let customPersona = localStorage.getItem('customPersona') || "";
const defaultPersona = "bạn là một trợ lý ảo tên là gemini. tính cách: thân thiện, ngắn gọn, tự nhiên. quy tắc quan trọng: không viết hoa các đại từ nhân xưng như 'tớ', 'cậu', 'mình', 'bạn'.";
const setupInstruction = "đây là chế độ cài đặt. hãy hỏi người dùng xem họ muốn thay đổi tính cách của bạn như thế nào.";

function toggleChat() {
    chatWindow.classList.toggle('hidden');
    if (!chatWindow.classList.contains('hidden')) {
        setTimeout(() => userInput.focus(), 300);
        scrollToBottom();
    }
}
widgetTrigger.addEventListener('click', toggleChat);
closeBtn.addEventListener('click', toggleChat);
widgetTrigger.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    chatWindow.classList.remove('hidden');
    chatWindow.classList.toggle('maximized');
    setTimeout(scrollToBottom, 300);
});

function initChat() {
    if (chatHistory.length > 0) {
        chatHistory.forEach(msg => renderMessageHTML(msg.role, msg.text));
        scrollToBottom();
    } else {
        addMessageToUI('ai', "chào cậu, hôm nay có gì vui không? ✨", false);
    }
}

async function handleChat() {
    const text = userInput.value.trim();
    if (!text) return;
    addMessageToUI('user', text);
    userInput.value = '';
    const loadingId = addMessageToUI('ai', '...', false, true);
    isSetupMode = modeCheckbox.checked;
    let currentSystemPrompt = isSetupMode ? setupInstruction : (customPersona || defaultPersona);
    const formattingRule = "lưu ý: trả lời ngắn gọn, lowercase (chữ thường), không viết hoa đại từ xưng hô.";
    const fullPrompt = `${currentSystemPrompt}. ${formattingRule}. User nói: ${text}`;
    try {
        const aiResponse = await callGemini(fullPrompt);
        document.getElementById(loadingId)?.remove();
        addMessageToUI('ai', aiResponse.toLowerCase());
    } catch (error) {
        document.getElementById(loadingId)?.remove();
        addMessageToUI('ai', "lỗi mạng rồi...", false);
    }
}
async function callGemini(promptText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}
function addMessageToUI(role, text, save = true, isLoading = false) {
    const msgId = renderMessageHTML(role, text, isLoading);
    if (save && !isLoading) {
        chatHistory.push({ role, text });
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
    scrollToBottom();
    return msgId;
}
function renderMessageHTML(role, text, isLoading = false) {
    const div = document.createElement('div');
    div.classList.add('message', role === 'user' ? 'user-msg' : 'ai-msg');
    div.innerText = text;
    const id = 'msg-' + Math.random().toString(36).substr(2, 9);
    div.id = id;
    if (isLoading) div.style.opacity = '0.6';
    chatBox.appendChild(div);
    return id;
}
function scrollToBottom() { chatBox.scrollTop = chatBox.scrollHeight; }
modeCheckbox.addEventListener('change', () => {
    if (modeCheckbox.checked) {
        addMessageToUI('ai', "đang ở chế độ sửa tính cách. cậu muốn tớ thay đổi thế nào?", false);
    } else {
        const userMsgs = document.querySelectorAll('.user-msg');
        if (userMsgs.length > 0) {
            const lastMsg = userMsgs[userMsgs.length - 1].innerText;
            customPersona = `bạn hãy đóng vai theo yêu cầu: "${lastMsg}". nhớ là không viết hoa xưng hô.`;
            localStorage.setItem('customPersona', customPersona);
            addMessageToUI('ai', "ok, đã nhớ tính cách mới.", false);
        }
    }
});
sendBtn.addEventListener('click', handleChat);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });
initChat();