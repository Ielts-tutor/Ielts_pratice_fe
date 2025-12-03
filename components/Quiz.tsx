import React, { useState } from 'react';
import { generateQuiz } from '../services/geminiService';
import { QuizQuestion } from '../types';
import { CheckCircle, XCircle, RefreshCw, Trophy, ArrowRight, BookOpen } from 'lucide-react';

const TOPICS = [
  "Education", "Environment", "Technology", "Health", "Travel", "Work", "Culture", "Crime"
];

const Quiz: React.FC = () => {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const startQuiz = async () => {
    setLoading(true);
    setQuizFinished(false);
    setCurrentQuestionIdx(0);
    setScore(0);
    setQuestions([]);
    
    try {
      const qs = await generateQuiz(topic);
      setQuestions(qs);
    } catch (error) {
      console.error(error);
      alert("Không thể tạo quiz lúc này. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (idx: number) => {
    if (selectedOption !== null) return; // Prevent changing answer
    setSelectedOption(idx);
    setShowResult(true);
    
    if (idx === questions[currentQuestionIdx].correctAnswerIndex) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setQuizFinished(true);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <h3 className="text-xl font-semibold text-slate-700">AI đang soạn đề...</h3>
        <p className="text-slate-500">Đang tạo câu hỏi chuyên sâu về chủ đề {topic}</p>
      </div>
    );
  }

  if (quizFinished) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy size={48} className="text-yellow-500" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Hoàn Thành!</h2>
        <p className="text-slate-500 mb-8">Bạn đã hoàn thành bài kiểm tra về {topic}</p>
        
        <div className="text-6xl font-bold text-blue-600 mb-8">
          {score}/{questions.length}
        </div>

        <button 
          onClick={() => { setQuestions([]); setQuizFinished(false); }}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
        >
          <RefreshCw size={20} />
          Làm bài mới
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
         <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-bold text-slate-800">Luyện Tập Quiz</h2>
            <p className="text-slate-500">Chọn chủ đề IELTS để AI tạo bộ câu hỏi kiểm tra kiến thức của bạn.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TOPICS.map(t => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                topic === t 
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <span className="block font-semibold text-slate-700">{t}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={startQuiz}
            className="px-10 py-4 bg-blue-600 text-white text-lg font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            Bắt Đầu Làm Bài
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestionIdx];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Question {currentQuestionIdx + 1}/{questions.length}</span>
        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{topic}</span>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-xl font-medium text-slate-800 leading-relaxed">
            {question.question}
          </h3>
        </div>

        <div className="p-8 space-y-3">
          {question.options.map((opt, idx) => {
            let stateClass = "border-slate-200 hover:bg-slate-50 hover:border-blue-300";
            if (selectedOption !== null) {
              if (idx === question.correctAnswerIndex) {
                stateClass = "bg-green-50 border-green-500 ring-1 ring-green-500";
              } else if (idx === selectedOption) {
                stateClass = "bg-red-50 border-red-500 ring-1 ring-red-500";
              } else {
                stateClass = "opacity-50 border-slate-100";
              }
            }

            return (
              <button
                key={idx}
                disabled={selectedOption !== null}
                onClick={() => handleOptionSelect(idx)}
                className={`w-full p-4 text-left rounded-xl border-2 transition-all flex items-center justify-between ${stateClass}`}
              >
                <span className={`font-medium ${selectedOption !== null && idx === question.correctAnswerIndex ? 'text-green-700' : 'text-slate-700'}`}>{opt}</span>
                {selectedOption !== null && idx === question.correctAnswerIndex && <CheckCircle className="text-green-500" size={20} />}
                {selectedOption !== null && idx === selectedOption && idx !== question.correctAnswerIndex && <XCircle className="text-red-500" size={20} />}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="bg-slate-50 p-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-start gap-3 mb-4">
              <BookOpen className="text-blue-500 mt-1" size={20} />
              <div>
                <p className="font-bold text-slate-800 mb-1">Giải thích:</p>
                <p className="text-slate-600 text-sm leading-relaxed">{question.explanation}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={nextQuestion}
                className="px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 transition-colors flex items-center gap-2"
              >
                {currentQuestionIdx === questions.length - 1 ? "Xem Kết Quả" : "Câu Tiếp Theo"}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
