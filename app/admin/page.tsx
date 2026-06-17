'use client';

import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';

type Task = {
  id: string;
  title: string;
  priority?: string;
  endDate?: string;
  description?: string;
  location?: string;
  collaborator?: string;
  isRecurring?: boolean;
  status?: string;
  createdAt?: string;
  subtasks?: { id?: string; title: string; isCompleted?: boolean }[];
};

type TaskStats = {
  overdue: number;
  today: number;
  doneWeek: number;
  total: number;
  doing: number;
  completed: number;
  completionRate: number;
};

const emptyForm = {
  title: '',
  priority: 'Thường',
  endDate: '',
  description: '',
  location: '',
  collaborator: '',
  isRecurring: false,
};

const emptyStats: TaskStats = {
  overdue: 0,
  today: 0,
  doneWeek: 0,
  total: 0,
  doing: 0,
  completed: 0,
  completionRate: 0,
};

const priorityOrder: Record<string, number> = {
  'Khẩn cấp': 2,
  'Quan trọng': 1,
  Thường: 0,
};

const toLocalDateKey = (date = new Date()) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getWeekBounds = (source: Date) => {
  const weekStart = new Date(source);
  const dayIndex = source.getDay() === 0 ? 6 : source.getDay() - 1;
  weekStart.setDate(source.getDate() - dayIndex);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
};

const computeStats = (docs: Task[], todayKey: string): TaskStats => {
  const stats = { ...emptyStats };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { weekStart, weekEnd } = getWeekBounds(today);

  for (const task of docs) {
    const dateValue = task.endDate ?? '';
    const dateObj = parseDate(dateValue);

    stats.total += 1;
    if (task.status === 'doing' || task.status === 'upcoming') stats.doing += 1;
    if (task.status === 'completed') stats.completed += 1;
    if (task.status === 'overdue') stats.overdue += 1;
    if (dateValue.slice(0, 10) === todayKey && task.status !== 'completed') stats.today += 1;

    if (task.status === 'completed' && dateObj && dateObj >= weekStart && dateObj <= weekEnd) {
      stats.doneWeek += 1;
    }
  }

  stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return stats;
};

const formatDateLabel = (value?: string) => {
  if (!value) return '';
  const parsed = parseDate(value);
  if (!parsed) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(parsed);
};

export default function AdminPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [sortBy, setSortBy] = useState('priority_desc');
  const [activeFilter, setActiveFilter] = useState<'doing' | 'overdue' | 'completed'>('doing');
  const [subtasks, setSubtasks] = useState<{ title: string; isCompleted: boolean }[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [routeState, setRouteState] = useState<{ action?: string; id?: string; date?: string }>({});
  const [loaded, setLoaded] = useState(false);

  const auth = useMemo(() => getFirebaseAuth(), []);
  const db = useMemo(() => getFirebaseDb(), []);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    const today = new Date();
    setFilterMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setRouteState({
        action: params.get('action') || undefined,
        id: params.get('id') || undefined,
        date: params.get('date') || undefined,
      });
    }

    let offTasks: (() => void) | undefined;
    const offAuth = onAuthStateChanged(auth, (user) => {
      offTasks?.();

      if (!user) {
        window.location.href = '/login/';
        return;
      }

      const tasksCol = collection(db, 'users', user.uid, 'tasks');
      const q = query(tasksCol);
      offTasks = onSnapshot(q, async (snapshot) => {
        const loadedTasks = await Promise.all(
          snapshot.docs.map(async (item) => {
            const task = { id: item.id, ...item.data() } as Task;
            const subtasksCol = collection(db, 'users', user.uid, 'tasks', item.id, 'subtasks');
            const subtasksSnap = await getDocs(subtasksCol);
            task.subtasks = subtasksSnap.docs.map((sub) => ({ id: sub.id, ...(sub.data() as any) }));
            return task;
          }),
        );

        setTasks(loadedTasks.filter((task) => !task.isRecurring || task.endDate));
        setLoaded(true);
      });
    });

    return () => {
      offTasks?.();
      offAuth();
    };
  }, [auth, db]);

  useEffect(() => {
    if (routeState.action === 'new') {
      setEditingId(null);
      setForm({ ...emptyForm, endDate: routeState.date || new Date().toISOString().split('T')[0] });
      setSubtasks([]);
      setSubtaskInput('');
      setOpen(true);
    }

    if (routeState.action === 'edit') {
      const task = tasks.find((item) => item.id === routeState.id);
      if (task) openForm(task);
    }
  }, [routeState, tasks]);

  const stats = useMemo(() => computeStats(tasks, toLocalDateKey()), [tasks]);

  const filteredTasks = useMemo(() => {
    let list = [...tasks];

    if (filterMonth) {
      list = list.filter((task) => (task.endDate || '').startsWith(filterMonth));
    }

    list = list.filter((task) => {
      if (activeFilter === 'doing') return task.status === 'doing' || task.status === 'upcoming';
      if (activeFilter === 'completed') return task.status === 'completed';
      return task.status === 'overdue';
    });

    if (deferredSearchTerm) {
      const term = deferredSearchTerm.toLowerCase();
      list = list.filter((task) => task.title.toLowerCase().includes(term));
    }

    list.sort((a, b) => {
      if (sortBy === 'name_asc') return a.title.localeCompare(b.title);
      if (sortBy === 'date_asc') return new Date(a.endDate || '9999') > new Date(b.endDate || '9999') ? 1 : -1;
      const diff = (priorityOrder[b.priority || 'Thường'] || 0) - (priorityOrder[a.priority || 'Thường'] || 0);
      if (diff !== 0) return diff;
      return new Date(a.endDate || '9999') > new Date(b.endDate || '9999') ? 1 : -1;
    });

    return list;
  }, [tasks, filterMonth, activeFilter, deferredSearchTerm, sortBy]);

  const counts = useMemo(() => {
    const result = { doing: 0, overdue: 0, completed: 0 };
    const monthTasks = filterMonth
      ? tasks.filter((task) => (task.endDate || '').startsWith(filterMonth))
      : tasks;
    monthTasks.forEach((task) => {
      if (task.status === 'doing' || task.status === 'upcoming') result.doing += 1;
      if (task.status === 'overdue') result.overdue += 1;
      if (task.status === 'completed') result.completed += 1;
    });
    return result;
  }, [tasks, filterMonth]);

  const openForm = (task?: Task) => {
    if (task) {
      setEditingId(task.id);
      setForm({
        title: task.title || '',
        priority: task.priority || 'Thường',
        endDate: task.endDate || '',
        description: task.description || '',
        location: task.location || '',
        collaborator: task.collaborator || '',
        isRecurring: !!task.isRecurring,
      });
      setSubtasks(task.subtasks?.filter(Boolean).map((item) => ({ title: item.title, isCompleted: !!item.isCompleted })) || []);
    } else {
      setEditingId(null);
      setForm({ ...emptyForm, endDate: new Date().toISOString().split('T')[0] });
      setSubtasks([]);
    }

    setSubtaskInput('');
    setOpen(true);
  };

  const saveTask = async () => {
    const user = auth.currentUser;
    if (!user || !form.title.trim()) return;

    const payload = {
      title: form.title.trim(),
      priority: form.priority,
      endDate: form.endDate,
      description: form.description.trim(),
      location: form.location.trim(),
      collaborator: form.collaborator.trim(),
      isRecurring: form.isRecurring,
      ...(editingId ? {} : { status: 'upcoming', createdAt: new Date().toISOString() }),
    };

    const taskRef = editingId
      ? doc(db, 'users', user.uid, 'tasks', editingId)
      : doc(collection(db, 'users', user.uid, 'tasks'));

    const batch = writeBatch(db);
    if (editingId) batch.update(taskRef, payload);
    else batch.set(taskRef, payload);

    if (editingId) {
      const subCol = collection(db, 'users', user.uid, 'tasks', editingId, 'subtasks');
      const snaps = await getDocs(subCol);
      snaps.forEach((item) => batch.delete(item.ref));
    }

    subtasks.forEach((subtask) => {
      batch.set(doc(collection(taskRef, 'subtasks')), subtask);
    });

    await batch.commit();
    setOpen(false);
  };

  const toggleTask = async (task: Task) => {
    const user = auth.currentUser;
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'tasks', task.id), {
      status: task.status === 'completed' ? 'doing' : 'completed',
    });
  };

  const removeTask = async () => {
    const user = auth.currentUser;
    if (!user || !deleteId) return;
    await deleteDoc(doc(db, 'users', user.uid, 'tasks', deleteId));
    setDeleteId(null);
  };

  const cardStatusClass = (status?: string) => {
    if (status === 'completed') return 'completed';
    if (status === 'overdue') return 'overdue';
    return 'doing';
  };

  return (
    <section className="admin-page">
      {/* Tab bar */}
      <div className="work-tabs" aria-label="Trạng thái công việc">
        {[
          { key: 'doing', label: 'Đang làm', count: counts.doing },
          { key: 'overdue', label: 'Quá hạn', count: counts.overdue },
          { key: 'completed', label: 'Hoàn thành', count: counts.completed },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={activeFilter === item.key}
            className={`work-tab ${activeFilter === item.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(item.key as typeof activeFilter)}
          >
            <span className="work-tab-label">{item.label}</span>
            <span className="work-tab-count">{item.count}</span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="work-toolbar">
        <div className="work-search" aria-label="Tìm kiếm công việc">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
            <path d="M21 21l-4.2-4.2" />
          </svg>
          <input
            type="search"
            placeholder="Tìm kiếm công việc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Tìm kiếm công việc"
          />
        </div>

        <input
          className="work-control"
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          aria-label="Lọc theo tháng"
        />

        <select
          className="work-control"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sắp xếp công việc"
        >
          <option value="priority_desc">Ưu tiên cao nhất</option>
          <option value="date_asc">Hạn chót gần nhất</option>
          <option value="name_asc">Tên A-Z</option>
        </select>

        <button
          type="button"
          className="work-create-button"
          onClick={() => openForm()}
          aria-label="Thêm mới"
          title="Thêm mới"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Task list */}
      <div className="work-list">
        {filteredTasks.length === 0 ? (
          <div className="work-empty">
            <div className="work-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M8 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
                <path d="M9 9h6M9 13h6M9 17h4" />
              </svg>
            </div>
            <h3 className="work-empty-title">Không có công việc phù hợp</h3>
            <p className="work-empty-copy">Hãy đổi từ khóa, tháng hoặc trạng thái để xem kết quả khác.</p>
            <button type="button" className="work-empty-action" onClick={() => openForm()}>
              Tạo công việc
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <article key={task.id} className={`work-card ${cardStatusClass(task.status)}`}>
              <div className="work-card-top">
                <div className="work-card-title-wrap">
                  <span className="work-card-kicker">{task.priority || 'Thường'}</span>
                  <h3 className="work-card-title">{task.title}</h3>
                </div>
              </div>

              <p className="work-card-desc">{task.description || 'Chưa có mô tả'}</p>

              <div className="work-card-meta">
                {task.endDate ? <span className="work-chip">{formatDateLabel(task.endDate)}</span> : null}
                {task.location ? <span className="work-chip">{task.location}</span> : null}
                {task.collaborator ? <span className="work-chip">{task.collaborator}</span> : null}
                {task.subtasks?.length ? <span className="work-chip">{task.subtasks.length} bước con</span> : null}
              </div>

              <div className="work-card-actions">
                <button type="button" className="work-action work-action-primary" onClick={() => toggleTask(task)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {task.status === 'completed' ? (
                      <>
                        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                        <path d="M20 6v6h-6" />
                      </>
                    ) : (
                      <path d="M20 6 9 17l-5-5" />
                    )}
                  </svg>
                  <span>{task.status === 'completed' ? 'Bỏ hoàn thành' : 'Hoàn thành'}</span>
                </button>
                <button
                  type="button"
                  className="work-action"
                  onClick={() => openForm(task)}
                  aria-label="Sửa công việc"
                  title="Sửa"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 20h4l10.5-10.5a2 2 0 0 0-4-4L4 16v4Z" />
                    <path d="M13.5 6.5 17.5 10.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="work-action work-action-danger"
                  onClick={() => setDeleteId(task.id)}
                  aria-label="Xóa công việc"
                  title="Xóa"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16" />
                    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
                    <path d="M7 7l1 13h8l1-13" />
                    <path d="M10 11v5M14 11v5" />
                  </svg>
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Dialog: Create / Edit */}
      {open ? (
        <div className="dialog-backdrop">
          <div className="dialog-card">
            <div className="dialog-head">
              <h3 className="dialog-title">{editingId ? 'Sửa công việc' : 'Tạo công việc'}</h3>
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>
                Đóng
              </button>
            </div>

            <div className="dialog-grid">
              <input className="input" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
              <div className="dialog-two-col">
                <select className="input" value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}>
                  <option>Thường</option>
                  <option>Quan trọng</option>
                  <option>Khẩn cấp</option>
                </select>
                <input className="input" type="date" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} />
              </div>
              <input className="input" placeholder="Mô tả" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
              <div className="dialog-two-col">
                <input className="input" placeholder="Địa điểm" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
                <input className="input" placeholder="Người phối hợp" value={form.collaborator} onChange={(e) => setForm((prev) => ({ ...prev, collaborator: e.target.value }))} />
              </div>

              <div className="subtask-builder">
                <input className="input" placeholder="Tên bước..." value={subtaskInput} onChange={(e) => setSubtaskInput(e.target.value)} />
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    if (!subtaskInput.trim()) return;
                    setSubtasks((prev) => [...prev, { title: subtaskInput.trim(), isCompleted: false }]);
                    setSubtaskInput('');
                  }}
                >
                  Thêm
                </button>
              </div>

              {subtasks.map((item, idx) => (
                <div key={`${item.title}-${idx}`} className="subtask-row">
                  <span>{item.title}</span>
                  <button className="btn btn-secondary" onClick={() => setSubtasks((prev) => prev.filter((_, i) => i !== idx))}>
                    X
                  </button>
                </div>
              ))}

              <label className="check-row">
                <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm((prev) => ({ ...prev, isRecurring: e.target.checked }))} />
                <span>Lặp lại hằng tháng</span>
              </label>

              <div className="dialog-actions">
                <button className="btn btn-secondary" onClick={() => setOpen(false)}>
                  Hủy
                </button>
                <button className="btn btn-primary" onClick={saveTask}>
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Dialog: Delete confirm */}
      {deleteId ? (
        <div className="dialog-backdrop">
          <div className="dialog-card dialog-card-small">
            <h3 className="dialog-title">Xóa công việc này?</h3>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={removeTask}>
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mobile FAB */}
      <button
        type="button"
        className="admin-fab"
        aria-label="Thêm mới"
        onClick={() => openForm()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </section>
  );
}