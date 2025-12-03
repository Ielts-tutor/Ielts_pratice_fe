import React, { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Sparkles, Pencil } from 'lucide-react';
import { User } from '../types';
import { chatWithTutor, syncUserSnapshot } from '../services/apiService';

interface NotesProps {
  user: User;
}

interface LessonNote {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  body?: string;
  tasks: {
    id: string;
    text: string;
    done: boolean;
    // ISO datetime string (from <input type="datetime-local">), optional
    deadline?: string;
  }[];
}

const UpcomingDeadlines: React.FC<{
  lessons: LessonNote[];
  onJumpToLesson: (id: string) => void;
}> = ({ lessons, onJumpToLesson }) => {
  const now = Date.now();
  const soonWindow = 3 * 24 * 60 * 60 * 1000; // 3 ngày tới
  const upcoming = lessons.flatMap(lesson =>
    lesson.tasks
      .filter(t => !t.done && t.deadline)
      .map(t => ({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        taskId: t.id,
        text: t.text,
        deadline: t.deadline as string,
      }))
  ).filter(item => {
    const time = Date.parse(item.deadline);
    return !Number.isNaN(time) && time >= now && time <= now + soonWindow;
  }).sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline))
    .slice(0, 5);

  if (!upcoming.length) {
    return (
      <p className="text-xs text-slate-400">
        Không có nhiệm vụ nào đến hạn trong 3 ngày tới.
      </p>
    );
  }

  return (
    <div className="space-y-1 text-xs">
      {upcoming.map(item => (
        <button
          key={item.taskId}
          type="button"
          onClick={() => onJumpToLesson(item.lessonId)}
          className="w-full text-left px-3 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 flex flex-col gap-0.5"
        >
          <span className="font-medium truncate">{item.text}</span>
          <span className="text-[10px] flex justify-between gap-2 text-amber-700/80">
            <span className="truncate">Bài: {item.lessonTitle}</span>
            <span>Hạn: {new Date(item.deadline).toLocaleString()}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

const Notes: React.FC<NotesProps> = ({ user }) => {
  const storageKey = `ielts_lesson_notes_${user.id}`;

  const [lessons, setLessons] = useState<LessonNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [bodyDraft, setBodyDraft] = useState('');
  const bodyEditorRef = useRef<HTMLDivElement | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as LessonNote[];
      setLessons(parsed);
      if (parsed.length > 0) {
        setSelectedId(parsed[0].id);
      }
    } catch {
      setLessons([]);
    }
  }, [storageKey]);

  const persist = (data: LessonNote[]) => {
    setLessons(data);
    localStorage.setItem(storageKey, JSON.stringify(data));
    // Đồng bộ lesson notes lên Mongo (nếu backend có)
    syncUserSnapshot({
      user: {
        id: user.id,
        name: user.name,
        joinedAt: user.joinedAt,
      },
      lessonNotes: data,
    });
  };

  const handleAddLesson = () => {
    const title = newLessonTitle.trim();
    if (!title) return;
    const now = Date.now();
    const lesson: LessonNote = {
      id: `lesson_${now}_${Math.random().toString(36).slice(2, 7)}`,
      title,
      createdAt: now,
      updatedAt: now,
      tasks: [],
    };
    const next = [lesson, ...lessons];
    persist(next);
    setSelectedId(lesson.id);
    setNewLessonTitle('');
  };

  const handleDeleteLesson = (id: string) => {
    const next = lessons.filter(l => l.id !== id);
    persist(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
    }
    if (editingLessonId === id) {
      setEditingLessonId(null);
      setEditingTitle('');
    }
  };

  const updateLesson = (id: string, updater: (l: LessonNote) => LessonNote) => {
    const next = lessons.map(l => (l.id === id ? updater(l) : l));
    persist(next);
  };

  const selectedLesson = lessons.find(l => l.id === selectedId) || null;

  // Khi đổi sang ghi chú khác, đổ nội dung body vào editor giống Word
  useEffect(() => {
    const html = selectedLesson?.body || '';
    setBodyDraft(html);
    if (bodyEditorRef.current) {
      bodyEditorRef.current.innerHTML = html;
    }
  }, [selectedLesson?.id]);

  const handleAddTask = () => {
    if (!selectedLesson) return;
    const text = newTaskText.trim();
    if (!text) return;
    const deadline = newTaskDeadline || undefined;
    updateLesson(selectedLesson.id, (l) => ({
      ...l,
      updatedAt: Date.now(),
      tasks: [
        ...l.tasks,
        {
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text,
          done: false,
          deadline,
        },
      ],
    }));
    setNewTaskText('');
    setNewTaskDeadline('');
  };

  const handleToggleTask = (taskId: string) => {
    if (!selectedLesson) return;
    updateLesson(selectedLesson.id, (l) => ({
      ...l,
      updatedAt: Date.now(),
      tasks: l.tasks.map(t =>
        t.id === taskId ? { ...t, done: !t.done } : t
      ),
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    if (!selectedLesson) return;
    updateLesson(selectedLesson.id, (l) => ({
      ...l,
      updatedAt: Date.now(),
      tasks: l.tasks.filter(t => t.id !== taskId),
    }));
  };

  const stripHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, '').replace(/\s+\n/g, '\n').trim();
  };

  const buildPlainText = (source: LessonNote[]) => {
    return source
      .map((l, idx) => {
        const header = `${idx + 1}. ${l.title}`;
        const bodyText = l.body ? stripHtml(l.body) : '';
        const tasks = l.tasks
          .map(t => {
            const deadlinePart = t.deadline ? ` (deadline: ${new Date(t.deadline).toLocaleString()})` : '';
            return `- [${t.done ? 'x' : ' '}] ${t.text}${deadlinePart}`;
          })
          .join('\n');
        return `${header}\n${bodyText ? bodyText + '\n' : ''}${tasks}`;
      })
      .join('\n\n');
  };

  const handleSummarizeSelected = async () => {
    // Nếu chưa chọn ghi chú cụ thể, AI sẽ xem toàn bộ sổ ghi chú
    const source = selectedLesson ? [selectedLesson] : lessons;
    if (!source.length) return;
    setIsSummarizing(true);
    try {
      const plain = buildPlainText(source);
      const history: { role: string; parts: { text: string }[] }[] = [];
      const message = `Đây là ${selectedLesson ? 'ghi chú cho một buổi học IELTS của tôi' : 'sổ ghi chú các buổi học IELTS của tôi'}:\n\n${plain}\n\nHãy giúp tôi (trả lời rất ngắn gọn, tối đa 3–4 câu, không dùng bullet, không dùng ký tự * hay **):\n1) Tóm tắt nội dung chính.\n2) Nêu 2–3 gợi ý luyện tập tiếp theo phù hợp trình độ IELTS của tôi (viết thành câu, ngăn cách bằng dấu chấm).`;

      const text = await chatWithTutor(history, message);
      window.alert(text || 'AI không trả về nội dung nào.');
    } catch (e) {
      console.error(e);
      window.alert('Không thể tóm tắt ghi chú. Vui lòng thử lại sau.');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
      {/* Left: list of lessons */}
      <div className="w-full lg:w-1/3 space-y-4">
        {/* Upcoming deadlines */}
        <div className="bg-white rounded-3xl border border-amber-200 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
            Các nhiệm vụ sắp đến hạn
          </h3>
          <UpcomingDeadlines lessons={lessons} onJumpToLesson={setSelectedId} />
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-4 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Sổ ghi chú</h2>
          <p className="text-xs text-slate-500">
            Tạo ghi chú theo buổi học / chủ đề, đánh dấu nhiệm vụ đã hoàn thành.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLessonTitle}
            onChange={(e) => setNewLessonTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddLesson()}
            placeholder="VD: Speaking Part 2 - Family / Writing Task 2 - Environment..."
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddLesson}
            className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus size={16} /> Mới
          </button>
        </div>

        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {lessons.length === 0 && (
            <div className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl p-3 text-center">
              Chưa có ghi chú nào. Hãy tạo ghi chú đầu tiên cho buổi học hôm nay.
            </div>
          )}
          {lessons.map((lesson) => (
            <button
              key={lesson.id}
              onClick={() => setSelectedId(lesson.id)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-sm ${
                selectedId === lesson.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-slate-50 text-slate-700 border border-transparent hover:bg-slate-100'
              }`}
            >
              {editingLessonId === lesson.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const title = editingTitle.trim();
                      if (title) {
                        updateLesson(lesson.id, (l) => ({
                          ...l,
                          title,
                          updatedAt: Date.now(),
                        }));
                      }
                      setEditingLessonId(null);
                    } else if (e.key === 'Escape') {
                      setEditingLessonId(null);
                    }
                  }}
                  onBlur={() => {
                    const title = editingTitle.trim();
                    if (title && title !== lesson.title) {
                      updateLesson(lesson.id, (l) => ({
                        ...l,
                        title,
                        updatedAt: Date.now(),
                      }));
                    }
                    setEditingLessonId(null);
                  }}
                  className="flex-1 px-2 py-1 text-xs rounded-lg border border-blue-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <span className="truncate">{lesson.title}</span>
              )}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingLessonId(lesson.id);
                    setEditingTitle(lesson.title);
                  }}
                  className="text-slate-300 hover:text-blue-600"
                  title="Đổi tên ghi chú"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLesson(lesson.id);
                  }}
                  className="text-slate-300 hover:text-red-500"
                  title="Xóa ghi chú này"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Right: tasks + AI overview */}
      <div className="flex-1 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          {selectedLesson ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedLesson.title}</h3>
                  <p className="text-xs text-slate-400">
                    Cập nhật lần cuối:{' '}
                    {new Date(selectedLesson.updatedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSummarizing}
                  onClick={handleSummarizeSelected}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-900 text-white hover:bg-slate-800 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Nhờ AI tóm tắt và gợi ý luyện tập cho ghi chú này"
                >
                  <Sparkles size={16} />
                </button>
              </div>

              {/* Rich text style editor cho nội dung buổi học */}
              <div className="space-y-2 mt-2">
                <div
                  ref={bodyEditorRef}
                  contentEditable
                  className="min-h-[160px] max-h-[260px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 prose prose-sm max-w-none"
                  onInput={(e) => {
                    const html = (e.currentTarget as HTMLDivElement).innerHTML;
                    setBodyDraft(html);
                    updateLesson(selectedLesson.id, (l) => ({
                      ...l,
                      updatedAt: Date.now(),
                      body: html,
                    }));
                  }}
                />
                {!bodyDraft && (
                  <p className="text-[11px] text-slate-400">
                    Gợi ý: ghi lại ví dụ mẫu, feedback của giáo viên, cấu trúc hay, câu chuyện bạn dùng trong Speaking...
                  </p>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder="Thêm nhiệm vụ / ý chính (VD: luyện lại cấu trúc If only..., xem lại bài mẫu band 8...)"
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="datetime-local"
                  value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddTask}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                >
                  Thêm
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 mt-2">
                {selectedLesson.tasks.length === 0 && (
                  <p className="text-xs text-slate-400">
                    Chưa có nhiệm vụ nào. Bắt đầu bằng việc ghi lại 3–5 điểm quan trọng bạn học được.
                  </p>
                )}
                {selectedLesson.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => handleToggleTask(task.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`flex-1 ${
                        task.done ? 'line-through text-slate-400' : 'text-slate-700'
                      }`}
                    >
                      {task.text}
                    </span>
                    {task.deadline && (
                      <span className="text-[10px] text-slate-500 px-2 py-1 rounded-full bg-slate-100">
                        Đến hạn: {new Date(task.deadline).toLocaleString()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-slate-300 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-slate-400 text-sm">
              Hãy chọn một ghi chú ở bên trái hoặc tạo ghi chú mới.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Notes;


