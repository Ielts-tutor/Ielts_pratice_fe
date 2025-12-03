# Cách Kiểm Tra API Key Có Quyền Live API

## 🔍 Cách 1: Kiểm Tra Qua Console Browser

1. Mở ứng dụng và chuyển sang tab **Speaking**
2. Mở **Developer Console** (F12 hoặc Right-click → Inspect → Console)
3. Xem các log bắt đầu bằng `[Live API]`:

### ✅ Key Hợp Lệ Có Quyền Live API:
```
[Live API] ✅ WebSocket Connected Successfully
[Live API] Sending setup message: {...}
[Live API] 📨 Received message: {hasAudio: true, ...}
[Live API] 🔊 Processing audio chunk...
```

### ❌ Key Không Có Quyền Live API:
```
[Live API] 🔌 WebSocket closed: {code: 1006, ...}
[Live API] ❌ Connection closed abnormally. Possible causes:
  1. Invalid API key (key may not have Live API access)
```

## 🔑 Cách 2: Lấy API Key Mới Từ Google AI Studio

1. Truy cập: https://aistudio.google.com/apikey
2. Đăng nhập bằng Google Account
3. Click **"Create API Key"** hoặc chọn key có sẵn
4. **Copy key** và thêm vào file `.env.local`:

```bash
VITE_API_KEY=your_new_api_key_here
```

5. Restart dev server: `npm run dev`

## ⚠️ Lưu Ý Quan Trọng

- **API key từ Google AI Studio** thường có quyền Live API
- **API key cũ** có thể không có quyền Live API
- Nếu key không hoạt động, tạo key mới từ AI Studio

## 🧪 Test API Key Bằng Code

Bạn có thể import và sử dụng function `testLiveApiKey` từ `utils/testApiKey.ts`:

```typescript
import { testLiveApiKey } from '../utils/testApiKey';

const result = await testLiveApiKey('your-api-key');
console.log('Key valid:', result.valid);
console.log('Has Live access:', result.hasLiveAccess);
```

## 📋 Checklist Debugging

- [ ] API key được set trong `.env.local`?
- [ ] Key bắt đầu bằng `AIza...`?
- [ ] Console có log `[Live API] ✅ WebSocket Connected`?
- [ ] Console có log `[Live API] 📨 Received message`?
- [ ] Console có log `[Live API] 🔊 Processing audio chunk`?

Nếu không thấy các log trên, key của bạn có thể không có quyền Live API.

