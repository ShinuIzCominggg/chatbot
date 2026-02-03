const API_KEY = "AIzaSyCPlut0Z_q4jgprpC-nqdtgazzZOVi_j_A"; // Thay Key vào đây

// DOM Elements
const widgetTrigger = document.getElementById('widget-trigger');
const chatWindow = document.getElementById('chat-window');
const closeBtn = document.getElementById('close-chat');
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const modeCheckbox = document.getElementById('mode-checkbox');

// State
let isSetupMode = false;
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
let customPersona = localStorage.getItem('customPersona') || "";

// Prompt mặc định (Lowercase, không viết hoa xưng hô)
const defaultPersona = "bạn là một trợ lý ảo tên là gemini. tính cách: thân thiện, ngắn gọn, tự nhiên. quy tắc quan trọng: không viết hoa các đại từ nhân xưng như 'tớ', 'cậu', 'mình', 'bạn'. hãy chat như hai người bạn nhắn tin qua mạng xã hội.";

const setupInstruction = "đây là chế độ cài đặt. hãy hỏi người dùng xem họ muốn thay đổi tính cách của bạn như thế nào (ví dụ: 'nói chuyện bựa hơn', 'đóng vai người yêu cũ'...). chỉ hỏi ngắn gọn.";

// ... (Code cũ giữ nguyên)

// --- 1. TOGGLE WIDGET (Bật/Tắt chat) ---
function toggleChat() {
    chatWindow.classList.toggle('hidden');
    if (!chatWindow.classList.contains('hidden')) {
        setTimeout(() => userInput.focus(), 300);
        scrollToBottom();
    }
}

widgetTrigger.addEventListener('click', toggleChat);
closeBtn.addEventListener('click', toggleChat);

// --- THÊM ĐOẠN NÀY: XỬ LÝ DOUBLE CLICK (MAXIMIZE) ---
widgetTrigger.addEventListener('dblclick', (e) => {
    // Ngăn sự kiện click đơn làm rối (nếu cần)
    e.stopPropagation();

    // 1. Đảm bảo cửa sổ đang mở (nếu đang đóng thì mở ra luôn)
    chatWindow.classList.remove('hidden');

    // 2. Bật/Tắt chế độ Maximize
    chatWindow.classList.toggle('maximized');

    // 3. Cuộn xuống đáy cho chắc
    setTimeout(scrollToBottom, 300);
});

// ... (Các phần code dưới giữ nguyên)

// --- 2. LOGIC CHAT & API ---

function initChat() {
    if (chatHistory.length > 0) {
        chatHistory.forEach(msg => renderMessageHTML(msg.role, msg.text));
        scrollToBottom();
    } else {
        // Câu chào mặc định (không lưu)
        addMessageToUI('ai', "chào cậu, có chuyện gì vui kể tớ nghe với? ✨", false);
    }
}

async function handleChat() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessageToUI('user', text);
    userInput.value = '';
    
    const loadingId = addMessageToUI('ai', '...', false, true);

    // Xử lý Prompt
    isSetupMode = modeCheckbox.checked;
    let currentSystemPrompt = isSetupMode ? setupInstruction : (customPersona || defaultPersona);

    // Kẹp thêm luật không viết hoa vào cuối để nhắc nhở AI
    const formattingRule = "lưu ý: trả lời ngắn gọn, lowercase (chữ thường), không viết hoa đại từ xưng hô.";
    const fullPrompt = `${currentSystemPrompt}. ${formattingRule}. User nói: ${text}`;

    try {
        const aiResponse = await callGemini(fullPrompt);
        document.getElementById(loadingId)?.remove();
        addMessageToUI('ai', aiResponse.toLowerCase()); // Force lowercase phía client cho chắc
    } catch (error) {
        document.getElementById(loadingId)?.remove();
        addMessageToUI('ai', "lỗi mạng rồi...", false);
    }
}

async function callGemini(promptText) {
    // Dùng model flash (hiện tại là 1.5, m đổi thành 2.0 hoặc tên khác nếu có access)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// UI Helper
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
    div.innerText = text; // Text node an toàn
    const id = 'msg-' + Math.random().toString(36).substr(2, 9);
    div.id = id;
    if (isLoading) div.style.opacity = '0.6';
    chatBox.appendChild(div);
    return id;
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Logic lưu Persona khi tắt chế độ Setup
modeCheckbox.addEventListener('change', () => {
    if (modeCheckbox.checked) {
        addMessageToUI('ai', "đang ở chế độ sửa tính cách. cậu muốn tớ thay đổi thế nào?", false);
    } else {
        // Khi tắt setup, lấy tin nhắn cuối cùng của user làm tính cách mới
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

// Khởi chạy
initChat();

// ... (CODE CHAT CŨ GIỮ NGUYÊN Ở TRÊN) ...

// --- LOGIC SIDEBAR MỚI ---
const sidebar = document.getElementById('left-sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');

sidebarToggle.addEventListener('click', () => {
    // Toggle class để đóng mở
    sidebar.classList.toggle('expanded');
    sidebar.classList.toggle('collapsed');
});

// Nếu muốn click ra ngoài thì tự đóng sidebar (Option)
document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && sidebar.classList.contains('expanded')) {
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
    }
});
