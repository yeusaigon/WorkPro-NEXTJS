'use client';

import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';

type Task = {
  id: string;
  title: string;
  description?: string;
  deletedAt?: { toDate?: () => Date } | string | null;
  isRecurring?: boolean;
};

type TabKey = 'active' | 'trash' | 'guide';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Task[]>([]);
  const [trashed, setTrashed] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [reportMonth, setReportMonth] = useState('');
  const [description, setDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; permanent: boolean } | null>(null);
  const [toast, setToast] = useState('');

  const auth = useMemo(() => getFirebaseAuth(), []);
  const db = useMemo(() => getFirebaseDb(), []);

  useEffect(() => {
    const current = new Date();
    setReportMonth(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);

    let offTasks: (() => void) | undefined;
    const offAuth = onAuthStateChanged(auth, (user) => {
      offTasks?.();

      if (!user) {
        window.location.href = '/login/';
        return;
      }

      const tasksCol = collection(db, 'users', user.uid, 'tasks');
      const q = query(tasksCol, where('isRecurring', '==', true));
      offTasks = onSnapshot(q, (snapshot) => {
        const active: Task[] = [];
        const trash: Task[] = [];

        snapshot.forEach((item) => {
          const data = { ...(item.data() as Task), id: item.id };
          if (data.deletedAt) trash.push(data);
          else active.push(data);
        });

        setTemplates(active);
        setTrashed(trash);
      });
    });

    return () => {
      offTasks?.();
      offAuth();
    };
  }, [auth, db]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setDescription(task.description || '');
  };

  const addReportInstance = async () => {
    const user = auth.currentUser;
    if (!user || !activeTask || !reportMonth) return;

    const [year, month] = reportMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    await addDoc(collection(db, 'users', user.uid, 'tasks'), {
      ...activeTask,
      description,
      isRecurring: false,
      status: 'completed',
      startDate,
      endDate,
      createdAt: new Date().toISOString(),
      masterTaskId: activeTask.id,
      instanceDate: reportMonth,
    });

    setActiveTask(null);
    showToast(`Đã thêm vào báo cáo tháng ${month}/${year}.`);
  };

  const saveTemplate = async () => {
    const user = auth.currentUser;
    if (!user || !editingTask) return;

    await updateDoc(doc(db, 'users', user.uid, 'tasks', editingTask.id), {
      description,
    });

    setEditingTask(null);
    showToast('Đã cập nhật.');
  };

  const handleDelete = async () => {
    const user = auth.currentUser;
    if (!user || !deleteTarget) return;

    const ref = doc(db, 'users', user.uid, 'tasks', deleteTarget.id);
    if (deleteTarget.permanent) {
      await deleteDoc(ref);
      showToast('Đã xóa vĩnh viễn.');
    } else {
      await updateDoc(ref, { deletedAt: new Date() });
      showToast('Đã chuyển vào thùng rác.');
    }

    setDeleteTarget(null);
  };

  const restoreTemplate = async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;

    await updateDoc(doc(db, 'users', user.uid, 'tasks', id), { deletedAt: null });
    showToast('Đã khôi phục.');
  };

  const tabCounts: Record<TabKey, number> = {
    active: templates.length,
    trash: trashed.length,
    guide: 0,
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'active', label: 'Công việc định kỳ' },
    { key: 'trash', label: 'Thùng rác' },
    { key: 'guide', label: 'Hướng dẫn' },
  ];

  return (
    <section className="templates-page">
      {/* Tabs */}
      <div className="work-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`work-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="work-tab-label">{tab.label}</span>
            {tab.key !== 'guide' && (
              <span className="work-tab-count">{tabCounts[tab.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Active templates tab */}
      {activeTab === 'active' && (
        templates.length === 0 ? (
          <div className="templates-empty">
            <div className="templates-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 7h10l-2-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 17H7l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 7a5 5 0 0 1 0 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M7 17a5 5 0 0 1 0-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="templates-empty-title">Chưa có công việc định kỳ nào</h3>
            <p className="work-empty-copy">
              Tạo công việc định kỳ từ trang Tổng quan để dùng lại hàng tháng.
            </p>
          </div>
        ) : (
          <div className="templates-list">
            {templates.map((task) => (
              <article key={task.id} className="templates-card">
                <div className="templates-card-top">
                  <div className="templates-card-title">{task.title}</div>
                  <span className="templates-recurring-badge">Định kỳ</span>
                </div>
                <p className="templates-card-desc">
                  {task.description || 'Không có mô tả.'}
                </p>
                <div className="templates-card-actions">
                  <button className="work-action work-action-primary" onClick={() => setActiveTask(task)}>
                    + Thêm báo cáo
                  </button>
                  <button className="work-action" onClick={() => openEdit(task)}>
                    Chỉnh sửa
                  </button>
                  <button className="work-action work-action-danger" onClick={() => setDeleteTarget({ id: task.id, permanent: false })}>
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {/* Trash tab */}
      {activeTab === 'trash' && (
        trashed.length === 0 ? (
          <div className="templates-empty">
            <div className="templates-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="templates-empty-title">Thùng rác trống</h3>
          </div>
        ) : (
          <div className="templates-list">
            {trashed.map((task) => {
              const deletedDate =
                task.deletedAt && typeof task.deletedAt === 'object' && 'toDate' in task.deletedAt && task.deletedAt.toDate
                  ? task.deletedAt.toDate()
                  : new Date(typeof task.deletedAt === 'string' ? task.deletedAt : '');
              const daysLeft = Math.max(0, Math.ceil((deletedDate.getTime() + 90 * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24)));

              return (
                <div key={task.id} className="templates-card templates-card-trashed">
                  <div>
                    <div className="templates-trashed-title">{task.title}</div>
                    <div className="templates-trashed-days">Tự động xóa sau {daysLeft} ngày.</div>
                  </div>
                  <div className="templates-card-actions">
                    <button className="work-action" onClick={() => restoreTemplate(task.id)}>Khôi phục</button>
                    <button className="work-action work-action-danger" onClick={() => setDeleteTarget({ id: task.id, permanent: true })}>Xóa vĩnh viễn</button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Guide tab */}
      {activeTab === 'guide' && (
        <div className="templates-guide">
          <div className="templates-guide-card">
            <div className="templates-guide-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M7 7h10l-2-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 17H7l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 7a5 5 0 0 1 0 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M7 17a5 5 0 0 1 0-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="templates-guide-title">Công việc định kỳ là gì?</h3>
            <p className="templates-guide-text">
              Công việc định kỳ là những công việc <strong>lặp lại hàng tháng</strong> trong báo cáo của bạn.
              Thay vì nhập lại cùng một nội dung mỗi tháng, bạn tạo một lần và dùng nút <strong>"+ Thêm báo cáo"</strong> để thêm nhanh vào tháng hiện tại.
            </p>

            <h4 className="templates-guide-subtitle">🔄 Tạo công việc định kỳ</h4>
            <p className="templates-guide-text">
              Vào <strong>Tổng quan</strong> → tạo công việc mới → bật nút <strong>"Định kỳ"</strong>.
              Công việc sẽ xuất hiện tại đây để dùng lại mỗi tháng.
            </p>

            <h4 className="templates-guide-subtitle">📋 Sử dụng trong báo cáo</h4>
            <p className="templates-guide-text">
              Tại trang <strong>Định kỳ</strong>, chọn tháng cần báo cáo, nhấn <strong>"+ Thêm báo cáo"</strong> trên công việc muốn thêm.
              Công việc sẽ được sao chép vào báo cáo tháng đó ngay lập tức.
            </p>

            <h4 className="templates-guide-subtitle">⏱️ Tiết kiệm thời gian</h4>
            <p className="templates-guide-text">
              Chỉ cần thiết lập một lần, mỗi tháng chỉ cần vài cú nhấp chuột để hoàn thành báo cáo — không cần gõ lại từ đầu.
            </p>
          </div>
        </div>
      )}

      {/* Add report modal */}
      {activeTask ? (
        <div className="dialog-backdrop" onClick={() => setActiveTask(null)}>
          <div className="dialog-card dialog-card-small" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h2 className="dialog-title">Thêm vào báo cáo</h2>
            </div>
            <div className="dialog-grid">
              <p className="muted">{activeTask.title}</p>
              <input className="input" type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
              <textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="dialog-actions">
                <button className="btn btn-secondary" onClick={() => setActiveTask(null)}>Hủy</button>
                <button className="btn btn-primary" onClick={addReportInstance}>Xác nhận thêm</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit modal */}
      {editingTask ? (
        <div className="dialog-backdrop" onClick={() => setEditingTask(null)}>
          <div className="dialog-card dialog-card-small" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h2 className="dialog-title">Chỉnh sửa</h2>
            </div>
            <div className="dialog-grid">
              <p className="muted">{editingTask.title}</p>
              <textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="dialog-actions">
                <button className="btn btn-secondary" onClick={() => setEditingTask(null)}>Hủy</button>
                <button className="btn btn-primary" onClick={saveTemplate}>Lưu</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete confirmation modal */}
      {deleteTarget ? (
        <div className="dialog-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="dialog-card dialog-card-small" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h2 className="dialog-title">Xác nhận hành động</h2>
            </div>
            <div className="dialog-grid">
              <p className="muted">
                {deleteTarget.permanent ? 'Xóa vĩnh viễn mục này?' : 'Chuyển công việc vào thùng rác?'}
              </p>
              <div className="dialog-actions">
                <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Hủy</button>
                <button className="btn btn-primary" onClick={handleDelete}>Đồng ý</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </section>
  );
}