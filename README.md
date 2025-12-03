# IELTS Practice App - Frontend

Ứng dụng luyện thi IELTS với AI Tutor, hỗ trợ Writing, Speaking, Vocabulary và Quiz.

## 🚀 Quick Start

### Cài đặt
```bash
npm install
```

### Cấu hình Environment Variables
Tạo file `.env` trong thư mục `Ielts_pratice`:

```env
# Gemini API Keys (bắt buộc)
VITE_API_KEY=your_gemini_api_key_here

# Backend URL (bắt buộc)
VITE_BACKEND_URL=http://localhost:4000

# Optional: Backup API keys
VITE_API_KEY1=optional_backup_key_1
VITE_API_KEY2=optional_backup_key_2
```

### Chạy ứng dụng
```bash
npm run dev
```

Ứng dụng sẽ chạy tại: `http://localhost:3000`

## 📚 Hướng dẫn chi tiết

Xem file [USAGE.md](./USAGE.md) để biết:
- Hướng dẫn cài đặt chi tiết
- Cấu hình environment variables
- Các tính năng và cách sử dụng
- Troubleshooting các lỗi thường gặp

## 🎯 Tính năng chính

- ✅ **Text Chat**: Chat với AI tutor về Writing, Speaking, Grammar
- ✅ **Speaking Mode**: Luyện nói với AI, tự động sửa lỗi
- ✅ **Vocabulary**: Quản lý từ vựng với định nghĩa và ví dụ
- ✅ **Admin Dashboard**: Quản lý users và dữ liệu

## 🔧 Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Gemini AI API
- ElevenLabs / OpenAI TTS (fallback)
- Web Speech API

## 📝 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_KEY` | ✅ | Gemini API key chính |
| `VITE_BACKEND_URL` | ✅ | Backend server URL |
| `VITE_API_KEY1-5` | ❌ | Backup API keys (optional) |

Xem [USAGE.md](./USAGE.md) để biết chi tiết về cấu hình.
