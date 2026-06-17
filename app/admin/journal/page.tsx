'use client';

import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import './journal.css';

type Task = {
  id: string;
  title: string;
  description?: string;
  collaborator?: string;
  priority?: string;
  endDate?: string;
  dueDate?: string;
};

export default function JournalPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [loaded, setLoaded] = useState(false);

  const auth = useMemo(() => getFirebaseAuth(), []);
  const db = useMemo(() => getFirebaseDb(), []);

  useEffect(() => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());

    const offAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = '/login/';
        return;
      }

      const tasksCol = collection(db, 'users', user.uid, 'tasks');
      const q = query(tasksCol, where('status', '==', 'completed'));
      const offTasks = onSnapshot(q, (snapshot) => {
        setTasks(snapshot.docs.map((item) => ({ ...(item.data() as Task), id: item.id })));
        setLoaded(true);
      });

      return () => offTasks();
    });

    return () => offAuth();
  }, [auth, db]);

  const years = useMemo(() => {
    const list = [...new Set(tasks.map((task) => new Date(task.endDate || task.dueDate || 0).getFullYear()))]
      .filter((y) => !Number.isNaN(y))
      .sort((a, b) => b - a);
    const currentYear = new Date().getFullYear();
    if (!list.includes(currentYear)) list.unshift(currentYear);
    return list;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let list = [...tasks];

    list = list.filter((task) => {
      const date = new Date(task.endDate || task.dueDate || 0);
      const matchMonth = selectedMonth === 'all' || date.getMonth() === selectedMonth;
      const matchYear = selectedYear === 'all' || date.getFullYear() === selectedYear;
      return matchMonth && matchYear;
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (task) =>
          task.title.toLowerCase().includes(term) ||
          (task.description || '').toLowerCase().includes(term),
      );
    }

    list.sort(
      (a, b) =>
        new Date((b.endDate || b.dueDate || '')).getTime() -
        new Date((a.endDate || a.dueDate || '')).getTime(),
    );
    return list;
  }, [tasks, selectedMonth, selectedYear, searchTerm]);

  const formatDateFull = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateShort = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const yearLabel = selectedYear === 'all' ? 'Tất cả năm' : `Năm ${selectedYear}`;
  const monthLabel =
    selectedMonth === 'all'
      ? 'Tất cả tháng'
      : `Tháng ${(selectedMonth as number) + 1}`;
  const periodLabel = selectedMonth === 'all' && selectedYear === 'all'
    ? 'Tất cả thời gian'
    : `${monthLabel}, ${yearLabel}`;

  return (
    <section className="journal-page">
      {/* Page banner */}
      <div className="journal-banner">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 4.5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <h1 className="journal-banner-title">Nhật ký</h1>
      </div>

      {/* Toolbar */}
      <div className="journal-toolbar">
        <div className="journal-filters">
          <select
            className="work-control"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value));
            }}
          >
            <option value="all">Tất cả năm</option>
            {years.map((year) => (
              <option key={year} value={year}>
                Năm {year}
              </option>
            ))}
          </select>
          <select
            className="work-control"
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
          >
            <option value="all">Tất cả tháng</option>
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                Tháng {i + 1}
              </option>
            ))}
          </select>
        </div>

        <div className="journal-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
            <path d="M21 21l-4.2-4.2" />
          </svg>
          <input
            type="search"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Tìm kiếm nhật ký"
          />
        </div>
      </div>

      {/* Stats */}
      <p className="journal-stats">
        {loaded
          ? `Tìm thấy ${filteredTasks.length} công việc hoàn thành · ${periodLabel}`
          : 'Đang tải dữ liệu...'}
      </p>

      {/* Content */}
      {!loaded ? (
        <div className="journal-skeleton">
          <div className="journal-skeleton-item" />
          <div className="journal-skeleton-item" />
          <div className="journal-skeleton-item" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="journal-empty">
          <div className="journal-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
            </svg>
          </div>
          <h3 className="journal-empty-title">Không có nhật ký nào</h3>
        </div>
      ) : (
        <div className="journal-table-wrap">
          <table className="journal-table">
            <thead>
              <tr>
                <th className="journal-col-date">Ngày hoàn thành</th>
                <th className="journal-col-title">Công việc</th>
                <th className="journal-col-desc">Mô tả</th>
                <th className="journal-col-priority">Ưu tiên</th>
                <th className="journal-col-collab">Phối hợp</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id}>
                  <td className="journal-cell-date">
                    <span className="journal-date-full">{formatDateFull(task.endDate || task.dueDate)}</span>
                    <span className="journal-date-short">{formatDateShort(task.endDate || task.dueDate)}</span>
                  </td>
                  <td className="journal-cell-title">{task.title}</td>
                  <td className="journal-cell-desc">{task.description || '-'}</td>
                  <td className="journal-cell-priority">
                    <span
                      className={`journal-priority-chip ${task.priority === 'Khẩn cấp' ? 'urgent' : ''}`}
                    >
                      {task.priority || 'Thường'}
                    </span>
                  </td>
                  <td className="journal-cell-collab">{task.collaborator || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}