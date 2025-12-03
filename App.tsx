import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Vocabulary from './components/Vocabulary';
import Quiz from './components/Quiz';
import Chat from './components/Chat';
import { AppView, User } from './types';
import { Menu, ArrowRight } from 'lucide-react';

const LoginView: React.FC<{ onLogin: (name: string) => void }> = ({ onLogin }) => {
  const [name, setName] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-200">
            I
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Chào mừng đến với IELTS Master</h1>
          <p className="text-slate-500">Nền tảng học IELTS thông minh tích hợp AI</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tên của bạn là gì?</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && onLogin(name)}
              placeholder="Nhập tên để bắt đầu..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center text-lg text-slate-900 placeholder:text-slate-400 font-medium"
              autoFocus
            />
          </div>
          <button
            onClick={() => name.trim() && onLogin(name)}
            disabled={!name.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            Bắt Đầu Học <ArrowRight size={20} />
          </button>
        </div>
        
        <p className="text-xs text-center text-slate-400">
          Dữ liệu của bạn sẽ được lưu cục bộ trên trình duyệt này.
        </p>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ onNavigate: (view: AppView) => void; user: User }> = ({ onNavigate, user }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <header className="space-y-2">
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-800">Hi, {user.name}! 👋</h1>
        <p className="text-slate-500 text-lg">Hôm nay bạn muốn học kỹ năng gì?</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => onNavigate(AppView.VOCABULARY)}
          className="group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 text-2xl">📚</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Học Từ Vựng</h3>
            <p className="text-slate-500 text-sm">Tra cứu, phân tích và lưu trữ từ vựng IELTS chuyên sâu.</p>
          </div>
        </div>

        <div 
          onClick={() => onNavigate(AppView.QUIZ)}
          className="group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-purple-300 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4 text-2xl">🎓</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Luyện Quiz</h3>
            <p className="text-slate-500 text-sm">Kiểm tra kiến thức với các bài Quiz được tạo bởi AI.</p>
          </div>
        </div>

        <div 
          onClick={() => onNavigate(AppView.CHAT)}
          className="group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-green-300 transition-all duration-300 relative overflow-hidden"
        >
           <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4 text-2xl">🤖</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Hỏi Đáp AI</h3>
            <p className="text-slate-500 text-sm">Trò chuyện với gia sư AI để giải đáp thắc mắc 24/7.</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-lg">
          <h3 className="text-2xl font-bold mb-3">Mẹo hôm nay</h3>
          <p className="text-slate-300 leading-relaxed mb-6">
            "Trong phần thi Speaking Part 2, hãy cố gắng sử dụng các thành ngữ (idioms) một cách tự nhiên. Đừng quá tập trung vào từ vựng khủng mà quên mất độ trôi chảy."
          </p>
          <button 
             onClick={() => onNavigate(AppView.CHAT)}
             className="px-6 py-2 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
          >
            Hỏi thêm chi tiết
          </button>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 text-9xl transform translate-x-1/4 translate-y-1/4">
          💡
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Check for saved session
    const savedUser = localStorage.getItem('ielts_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setInitializing(false);
  }, []);

  const handleLogin = (name: string) => {
    const newUser: User = {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name: name,
      joinedAt: Date.now()
    };
    localStorage.setItem('ielts_current_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('ielts_current_user');
    setUser(null);
    setCurrentView(AppView.DASHBOARD);
  };

  const renderContent = () => {
    if (!user) return null;
    switch (currentView) {
      case AppView.VOCABULARY:
        return <Vocabulary user={user} />;
      case AppView.QUIZ:
        return <Quiz />;
      case AppView.CHAT:
        return <Chat />;
      default:
        return <Dashboard onNavigate={setCurrentView} user={user} />;
    }
  };

  if (initializing) return null;

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-10">
           <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              I
            </div>
            <span className="font-bold text-slate-800">IELTS Master</span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600">
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;