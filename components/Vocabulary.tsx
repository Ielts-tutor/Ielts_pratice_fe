import React, { useState, useEffect, useRef } from 'react';
import { Search, Volume2, Trash2, Loader2, Sparkles, Layers, RefreshCw, ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, Download, Upload } from 'lucide-react';
import { VocabItem, User } from '../types';
import { analyzeVocabulary, generateNewExample } from '../services/apiService';

type Tab = 'LIBRARY' | 'REVIEW';

interface VocabularyProps {
    user: User;
}

const Vocabulary: React.FC<VocabularyProps> = ({ user }) => {
    const [words, setWords] = useState<VocabItem[]>([]);
    const [inputWord, setInputWord] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());

    // Review Mode State
    const [activeTab, setActiveTab] = useState<Tab>('LIBRARY');
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    // File input ref for import
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Unique storage key for this user
    const storageKey = `ielts_vocab_${user.id}`;

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                setWords(JSON.parse(saved));
            } catch (e) {
                setWords([]);
            }
        } else {
            setWords([]);
        }
        // Reset tabs when user changes
        setActiveTab('LIBRARY');
        setCurrentCardIndex(0);
    }, [user.id, storageKey]);

    const saveToLocal = (newWords: VocabItem[]) => {
        localStorage.setItem(storageKey, JSON.stringify(newWords));
        setWords(newWords);
    };

    const handleExportData = () => {
        const dataStr = JSON.stringify(words, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${user.id}-ielts-vocab-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    // Basic validation
                    const valid = parsed.every(item => item.word && item.meaning_en);
                    if (valid) {
                        if (window.confirm(`Tìm thấy ${parsed.length} từ vựng. Bạn có muốn ghi đè danh sách hiện tại không? (Nhấn Cancel để gộp thêm vào)`)) {
                            saveToLocal(parsed);
                        } else {
                            const existingIds = new Set(words.map(w => w.word.toLowerCase()));
                            const newUnique = parsed.filter(w => !existingIds.has(w.word.toLowerCase()));
                            saveToLocal([...newUnique, ...words]);
                            alert(`Đã thêm ${newUnique.length} từ mới.`);
                        }
                    } else {
                        alert("File không đúng định dạng dữ liệu.");
                    }
                }
            } catch (err) {
                alert("Lỗi khi đọc file. Vui lòng thử lại.");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePlayAudio = (text: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Trình duyệt của bạn không hỗ trợ phát âm.");
        }
    };

    const handleAnalyze = async () => {
        if (!inputWord.trim()) return;
        setIsLoading(true);
        setError('');

        const rawInputs = inputWord.split(',').map(w => w.trim()).filter(w => w.length > 0);

        if (rawInputs.length === 0) {
            setIsLoading(false);
            return;
        }

        setProgress(`Đang xử lý ${rawInputs.length} từ song song...`);

        // Process all words in parallel using Promise.allSettled
        const promises = rawInputs.map(async (wordToAnalyze, index) => {
            try {
                setProgress(`Đang phân tích: ${rawInputs.map((_, i) => i <= index ? '✓' : '○').join(' ')} (${index + 1}/${rawInputs.length})`);
                const analysis = await analyzeVocabulary(wordToAnalyze);
                return {
                    success: true,
                    word: wordToAnalyze,
                    data: {
                        ...analysis,
                        id: Date.now().toString() + Math.random().toString(),
                        createdAt: Date.now(),
                        mastered: false
                    }
                };
            } catch (err) {
                console.error(`Failed to analyze ${wordToAnalyze}`, err);
                return {
                    success: false,
                    word: wordToAnalyze,
                    error: err
                };
            }
        });

        // Wait for all promises to settle
        const results = await Promise.allSettled(promises);

        const newItems: VocabItem[] = [];
        const failedWords: string[] = [];

        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                const value = result.value;
                if (value.success && value.data) {
                    newItems.push(value.data);
                } else {
                    failedWords.push(value.word);
                }
            } else {
                // Promise rejected
                failedWords.push('unknown');
            }
        });

        if (newItems.length > 0) {
            saveToLocal([...newItems, ...words]);
            setInputWord('');
            setProgress(`✓ Hoàn thành! Đã thêm ${newItems.length} từ mới.`);
            setTimeout(() => setProgress(''), 2000);
        }

        if (failedWords.length > 0) {
            setError(`Không thể phân tích ${failedWords.length} từ: ${failedWords.join(', ')}. Vui lòng thử lại sau.`);
        }

        setIsLoading(false);
    };

    const handleDelete = (id: string) => {
        const filtered = words.filter(w => w.id !== id);
        saveToLocal(filtered);
        if (currentCardIndex >= filtered.length) {
            setCurrentCardIndex(Math.max(0, filtered.length - 1));
        }
    };

    const handleRegenerateExample = async (id: string, wordText: string) => {
        setRegeneratingIds(prev => new Set(prev).add(id));
        try {
            const newExample = await generateNewExample(wordText);
            const updatedWords = words.map(w => w.id === id ? { ...w, example: newExample } : w);
            saveToLocal(updatedWords);
        } catch (error) {
            console.error("Failed to regenerate example", error);
        } finally {
            setRegeneratingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const toggleFlip = () => setIsFlipped(!isFlipped);

    const nextCard = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentCardIndex((prev) => (prev + 1) % words.length);
        }, 200);
    };

    const prevCard = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentCardIndex((prev) => (prev - 1 + words.length) % words.length);
        }, 200);
    };

    const renderLibrary = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">Thêm từ mới</label>
                <div className="flex gap-4 flex-col sm:flex-row">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={inputWord}
                            onChange={(e) => setInputWord(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                            placeholder="Nhập từ cần học (VD: resilient, pragmatic...)"
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
                    </div>
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || !inputWord.trim()}
                        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-w-[160px]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span className="text-sm">Xử lý...</span>
                            </>
                        ) : (
                            <><Sparkles size={18} /> Phân Tích AI</>
                        )}
                    </button>
                </div>

                {/* Enhanced Loading State */}
                {isLoading && progress && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                        <div className="flex items-center gap-3">
                            <Loader2 className="animate-spin text-blue-600" size={20} />
                            <p className="text-blue-700 font-medium">{progress}</p>
                        </div>

                        {/* Animated progress bar */}
                        <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse"
                                style={{ width: '100%' }}>
                            </div>
                        </div>

                        <p className="text-xs text-blue-600">
                            💡 Tip: Các từ đang được xử lý song song để tăng tốc độ
                        </p>
                    </div>
                )}

                {error && <p className="text-red-500 mt-3 text-sm">{error}</p>}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-700">Danh sách của {user.name} ({words.length})</h3>
                    <div className="flex gap-2">
                        {words.length > 0 && (
                            <button
                                onClick={() => setActiveTab('REVIEW')}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <Layers size={16} />
                                Ôn tập
                            </button>
                        )}
                    </div>
                </div>

                {words.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                        <Search size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Chưa có từ vựng nào. Hãy nhập từ đầu tiên của bạn!</p>
                    </div>
                ) : (
                    words.map((word) => (
                        <div key={word.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all group relative overflow-hidden">
                            <div className="flex flex-col md:flex-row gap-6 relative z-10">
                                <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6 flex flex-col justify-start">
                                    <div className="mb-2">
                                        <div className="flex flex-wrap items-baseline gap-2 mb-1">
                                            <h3 className="text-2xl font-bold text-slate-800">{word.word}</h3>
                                            <span className="text-sm font-normal text-slate-500 font-mono">/{word.ipa}/</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase border border-slate-200">{word.type}</span>
                                        </div>
                                        <p className="text-blue-600 font-medium text-lg leading-snug">{word.short_meaning}</p>
                                    </div>

                                    <button
                                        onClick={(e) => handlePlayAudio(word.word, e)}
                                        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm mt-auto py-2 transition-colors w-max"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                            <Volume2 size={16} />
                                        </div>
                                        <span>Nghe phát âm</span>
                                    </button>
                                </div>

                                <div className="md:w-2/3 space-y-4">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                                            Định nghĩa
                                        </h4>
                                        <p className="text-slate-800 font-medium leading-relaxed text-lg">{word.meaning_en}</p>
                                        <p className="text-slate-600 mt-1 italic leading-relaxed">{word.meaning_vi}</p>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ví dụ</h4>
                                            <button
                                                onClick={() => handleRegenerateExample(word.id, word.word)}
                                                disabled={regeneratingIds.has(word.id)}
                                                className="text-slate-400 hover:text-blue-600 disabled:text-blue-400 transition-colors p-1 rounded hover:bg-slate-100 flex items-center gap-1 text-xs"
                                                title="Đổi ví dụ khác"
                                            >
                                                <RefreshCw size={12} className={regeneratingIds.has(word.id) ? "animate-spin" : ""} />
                                                Đổi ví dụ
                                            </button>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-blue-400 relative">
                                            <p className="text-slate-700 italic">"{word.example}"</p>
                                        </div>
                                    </div>

                                    {word.synonyms && word.synonyms.length > 0 && (
                                        <div className="flex gap-2 flex-wrap items-center">
                                            <span className="text-xs text-slate-400 uppercase font-bold mr-1">Synonyms:</span>
                                            {word.synonyms.map((syn, idx) => (
                                                <span key={idx} className="text-xs px-2.5 py-1 bg-white text-slate-600 rounded-full border border-slate-200 shadow-sm">
                                                    {syn}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {word.antonyms && word.antonyms.length > 0 && (
                                        <div className="flex gap-2 flex-wrap items-center">
                                            <span className="text-xs text-slate-400 uppercase font-bold mr-1">Antonyms:</span>
                                            {word.antonyms.map((ant, idx) => (
                                                <span key={idx} className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-full border border-red-100 shadow-sm">
                                                    {ant}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Nút xoá luôn hiển thị (trước đây chỉ hiện khi hover nên khó dùng trên mobile) */}
                            <div className="absolute top-4 right-4">
                                <button
                                    onClick={() => handleDelete(word.id)}
                                    className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                    title="Xóa từ này"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderReview = () => {
        if (words.length === 0) {
            return (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
                    <Layers size={64} className="mx-auto mb-4 text-slate-300" />
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Kho từ vựng trống</h3>
                    <p className="text-slate-500 mb-6">Bạn cần thêm từ vựng vào kho trước khi bắt đầu ôn tập.</p>
                    <button
                        onClick={() => setActiveTab('LIBRARY')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                    >
                        Quay lại thêm từ
                    </button>
                </div>
            );
        }

        const currentWord = words[currentCardIndex];

        return (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between text-slate-500">
                    <span className="text-sm font-medium">Flashcard {currentCardIndex + 1} / {words.length}</span>
                    <button
                        onClick={() => {
                            const shuffled = [...words].sort(() => Math.random() - 0.5);
                            setWords(shuffled);
                            setCurrentCardIndex(0);
                            setIsFlipped(false);
                        }}
                        className="text-sm flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                        <RefreshCw size={14} /> Xáo trộn
                    </button>
                </div>

                <div className="relative h-96 perspective-1000 group cursor-pointer" onClick={toggleFlip}>
                    <div className={`relative w-full h-full duration-500 preserve-3d transition-all transform ${isFlipped ? 'rotate-y-180' : ''}`}>
                        <div className="absolute inset-0 backface-hidden bg-white rounded-3xl shadow-xl border-2 border-slate-100 flex flex-col items-center justify-center p-8 text-center overflow-hidden">
                            <span className="absolute top-6 right-6 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">{currentWord.type}</span>
                            <h3 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">{currentWord.word}</h3>
                            <p className="text-slate-400 text-xl font-mono mb-8">/{currentWord.ipa}/</p>

                            <button
                                onClick={(e) => handlePlayAudio(currentWord.word, e)}
                                className="w-12 h-12 rounded-full bg-slate-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors mb-4"
                                title="Nghe phát âm"
                            >
                                <Volume2 size={24} />
                            </button>

                            <p className="text-slate-400 text-sm mt-auto animate-pulse">Nhấn để xem nghĩa</p>
                        </div>

                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-900 rounded-3xl shadow-xl flex flex-col p-8 text-white overflow-hidden">
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="flex flex-col items-center justify-center min-h-full py-4">
                                    <div className="text-center mb-6">
                                        <h4 className="text-2xl font-bold text-blue-400 mb-2">{currentWord.short_meaning}</h4>
                                        <p className="text-slate-300 italic text-sm">{currentWord.meaning_vi}</p>
                                    </div>

                                    <div className="bg-slate-800/50 p-4 rounded-xl w-full border border-slate-700 mb-6">
                                        <p className="text-slate-300 text-xs mb-1 uppercase font-bold tracking-wider text-left">Definition</p>
                                        <p className="text-lg font-medium leading-relaxed">{currentWord.meaning_en}</p>
                                    </div>

                                    <div className="w-full text-left border-l-2 border-green-500 pl-4 bg-slate-800/30 p-2 rounded-r-lg">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-slate-400 text-xs uppercase font-bold">Example</p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRegenerateExample(currentWord.id, currentWord.word);
                                                }}
                                                className="text-xs text-blue-400 hover:text-blue-300"
                                            >
                                                {regeneratingIds.has(currentWord.id) ? '...' : 'Đổi mới'}
                                            </button>
                                        </div>
                                        <p className="text-slate-200 italic">"{currentWord.example}"</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-6">
                    <button
                        onClick={(e) => { e.stopPropagation(); prevCard(); }}
                        className="w-14 h-14 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center justify-center shadow-sm transition-all active:scale-95"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className="h-14 px-8 rounded-full bg-white border border-slate-200 flex items-center justify-center gap-3 text-slate-600 font-medium shadow-sm">
                        {isFlipped ? (
                            <>
                                <CheckCircle2 size={20} className="text-green-500" />
                                Đã xem
                            </>
                        ) : (
                            <>
                                <RotateCcw size={20} />
                                Lật thẻ
                            </>
                        )}
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); nextCard(); }}
                        className="w-14 h-14 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center justify-center shadow-sm transition-all active:scale-95"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .preserve-3d { transform-style: preserve-3d; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
            `}</style>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Từ Vựng Của Tôi</h2>
                    <p className="text-slate-500">Quản lý và ôn tập danh sách từ vựng IELTS của bạn.</p>
                </div>

                <div className="flex gap-2">
                    <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm mr-2">
                        <button
                            onClick={handleExportData}
                            title="Sao lưu dữ liệu về máy"
                            className="px-3 py-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            <Download size={20} />
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            title="Khôi phục dữ liệu từ file"
                            className="px-3 py-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            <Upload size={20} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImportData}
                            accept=".json"
                            className="hidden"
                        />
                    </div>

                    <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <button
                            onClick={() => setActiveTab('LIBRARY')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'LIBRARY'
                                ? 'bg-blue-100 text-blue-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Kho Từ Vựng
                        </button>
                        <button
                            onClick={() => setActiveTab('REVIEW')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'REVIEW'
                                ? 'bg-blue-100 text-blue-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Ôn Tập
                        </button>
                    </div>
                </div>
            </div>
            {activeTab === 'LIBRARY' ? renderLibrary() : renderReview()}
        </div>
    );
};

export default Vocabulary;