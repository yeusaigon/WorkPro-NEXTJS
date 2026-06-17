'use client';

import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, type DocumentData } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';

type Task = {
  id: string;
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  collaborator?: string;
  location?: string;
  isRecurring?: boolean;
  instanceDate?: string;
};

type ReportItem = Task & {
  isGroup?: boolean;
  reportInclude?: boolean;
};

type ReportConfig = {
  unit: string;
  dept: string;
  recipient: string;
  suffix: string;
  approverTitle: string;
  approverName: string;
  creatorTitle: string;
  creatorName: string;
  showApprover: boolean;
};

const defaultConfig: ReportConfig = {
  unit: 'TRUNG TÂM THƯ VIỆN',
  dept: 'BP NGHIỆP VỤ',
  recipient: 'Ban Giám đốc',
  suffix: 'BC-TV',
  approverTitle: 'Trưởng phòng',
  approverName: '',
  creatorTitle: 'Nhân viên',
  creatorName: '',
  showApprover: true,
};

export default function ReportPage() {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('Đang tải...');
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [items, setItems] = useState<ReportItem[]>([]);
  const [config, setConfig] = useState<ReportConfig>(defaultConfig);
  const [suggestions, setSuggestions] = useState('');
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingGroupTitle, setEditingGroupTitle] = useState('');

  const auth = useMemo(() => getFirebaseAuth(), []);
  const db = useMemo(() => getFirebaseDb(), []);

  useEffect(() => {
    const offAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = '/login/';
        return;
      }

      setUserId(user.uid);
      setUserName(user.displayName || 'Người dùng');
      setConfig((prev) => ({ ...prev, creatorName: prev.creatorName || user.displayName || '' }));
    });

    return () => offAuth();
  }, [auth]);

  useEffect(() => {
    const stored = localStorage.getItem('aworkpro_conf');
    if (stored) {
      try {
        setConfig((prev) => ({ ...prev, ...JSON.parse(stored) }));
      } catch {
        // ignore invalid local state
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);
      const tasksSnap = await getDocs(collection(db, 'users', userId, 'tasks'));
      const loaded = tasksSnap.docs.map((item) => ({ ...(item.data() as Task), id: item.id }));
      setAllTasks(loaded);

      const monthTasks = loaded.filter((task) => {
        if (task.isRecurring && !task.instanceDate) return false;
        const dateValue = task.endDate || task.startDate || task.dueDate || '';
        const date = new Date(dateValue);
        return date.getMonth() === month && date.getFullYear() === year;
      });

      const layoutRef = doc(db, 'users', userId, 'report_layouts', `${year}-${month}`);
      const layoutSnap = await getDoc(layoutRef);

      if (layoutSnap.exists()) {
        const data = layoutSnap.data() as DocumentData;
        const saved = (data.items || []) as Array<{ id: string; title?: string; isGroup?: boolean; reportInclude?: boolean }>;
        const savedIds = new Set(saved.map((item) => item.id));
        const mapped: ReportItem[] = saved
          .map((savedItem) => {
            if (savedItem.isGroup) return { id: savedItem.id, title: savedItem.title || 'Nhóm', isGroup: true, reportInclude: true };
            const task = monthTasks.find((item) => item.id === savedItem.id);
            return task ? { ...task, reportInclude: savedItem.reportInclude !== false } : null;
          })
          .filter(Boolean) as ReportItem[];

        const newTasks = monthTasks.filter((task) => !savedIds.has(task.id));
        if (newTasks.length > 0) {
          mapped.push({ id: `grp_${Date.now()}`, title: 'Mới bổ sung', isGroup: true, reportInclude: true });
          mapped.push(...newTasks.map((task) => ({ ...task, reportInclude: true })));
        }

        setItems(mapped);
      } else {
        setItems(
          [...monthTasks]
            .sort((a, b) => new Date(a.startDate || a.dueDate || 0).getTime() - new Date(b.startDate || b.dueDate || 0).getTime())
            .map((task) => ({ ...task, reportInclude: true })),
        );
      }

      setLoading(false);
    };

    load();
  }, [db, month, userId, year]);

  useEffect(() => {
    localStorage.setItem('aworkpro_conf', JSON.stringify(config));
  }, [config]);

  const reportText = useMemo(() => `${month + 1}/${year}`, [month, year]);

  const saveLayout = async (nextItems: ReportItem[]) => {
    if (!userId) return;
    await setDoc(doc(db, 'users', userId, 'report_layouts', `${year}-${month}`), {
      items: nextItems.map((item) => ({
        id: item.id,
        title: item.title,
        isGroup: !!item.isGroup,
        reportInclude: item.reportInclude,
      })),
    });
  };

  const updateItem = (index: number, updater: (item: ReportItem) => ReportItem) => {
    setItems((prev) => {
      const next = prev.map((item, idx) => (idx === index ? updater(item) : item));
      saveLayout(next);
      return next;
    });
  };

  const addGroup = () => {
    const title = window.prompt('Nhập tên nhóm mới:');
    if (!title) return;

    setItems((prev) => {
      const next = [...prev, { id: `grp_${Date.now()}`, title, isGroup: true, reportInclude: true }];
      saveLayout(next);
      return next;
    });
  };

  const generateSuggestions = () => {
    const activeTasks = items.filter((item) => !item.isGroup && item.reportInclude);
    const overdue = activeTasks.filter((task) => task.status === 'overdue').length;
    const completed = activeTasks.filter((task) => task.status === 'completed').length;
    setSuggestions(
      `Báo cáo tháng ${month + 1}:\n- Hoàn thành: ${completed} công việc.\n- Tồn đọng/Quá hạn: ${overdue} công việc.\n- Kiến nghị: Đảm bảo tiến độ cho các công việc trọng tâm tháng sau.`,
    );
  };

  const saveGroupTitle = (index: number) => {
    setItems((prev) => {
      const next = prev.map((item, idx) => (idx === index && item.isGroup ? { ...item, title: editingGroupTitle || item.title } : item));
      saveLayout(next);
      return next;
    });
  };

  const refreshData = async () => {
    if (!userId) return;
    const snap = await getDocs(collection(db, 'users', userId, 'tasks'));
    const loaded = snap.docs.map((item) => ({ ...(item.data() as Task), id: item.id }));
    setAllTasks(loaded);
  };

  const renderPreviewRows = () => {
    let stt = 1;
    const rows: string[] = [];

    items.forEach((item, index) => {
      if (item.isGroup) {
        const nextGroupIdx = items.findIndex((next, nextIdx) => nextIdx > index && next.isGroup);
        const end = nextGroupIdx === -1 ? items.length : nextGroupIdx;
        const children = items.slice(index + 1, end);
        const hasActiveChildren = children.some((child) => child.reportInclude);
        if (hasActiveChildren || item.reportInclude) {
          rows.push(`<tr><td colspan="5" class="border border-black p-2 font-bold bg-slate-100 text-left">${item.title}</td></tr>`);
        }
        return;
      }

      if (!item.reportInclude) return;

      const start = item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '';
      const end = item.endDate ? new Date(item.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '';
      const desc = (item.description || '').replace(/- /g, '• ').replace(/\n/g, '<br>');

      rows.push(`
        <tr>
          <td class="border border-black p-1.5 text-center align-top">${stt++}</td>
          <td class="border border-black p-1.5 align-top text-justify">
            <b>${item.title || ''}</b>
            ${desc ? `<div class="text-[10pt] mt-1">${desc}</div>` : ''}
          </td>
          <td class="border border-black p-1.5 text-center align-top text-[10pt]">${start}</td>
          <td class="border border-black p-1.5 text-center align-top text-[10pt]">${end}</td>
          <td class="border border-black p-1.5 align-top text-[10pt] text-center">${item.collaborator || ''}</td>
        </tr>
      `);
    });

    return rows.join('');
  };

  return (
    <div className="page" style={{ height: '100vh', overflow: 'hidden' }}>
      <style jsx global>{`
        body {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .a4-paper {
          width: 210mm;
          min-height: 297mm;
          background: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          margin: 0 auto;
          padding: 20mm;
          position: relative;
          transform-origin: top center;
        }
        .sortable-item {
          cursor: grab;
        }
        @media print {
          body {
            background: white;
            height: auto;
            overflow: visible;
          }
          .no-print {
            display: none !important;
          }
          #app-layout {
            display: block;
            height: auto;
            overflow: visible;
          }
          #main-preview {
            padding: 0;
            margin: 0;
            background: white;
            height: auto;
            overflow: visible;
          }
          .a4-paper {
            width: 100%;
            height: auto;
            min-height: auto;
            box-shadow: none;
            margin: 0;
            padding: 0;
            transform: none !important;
          }
          * {
            font-family: 'Times New Roman', serif !important;
            color: black !important;
          }
          table,
          th,
          td {
            border: 1px solid black !important;
            border-collapse: collapse !important;
          }
        }
      `}</style>

      <div id="app-layout" className="flex h-full flex-col md:flex-row">
        <aside className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col h-[40vh] md:h-full z-20 shadow-xl no-print">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Link href="/admin/" className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-a-primary transition-colors" title="Quay lại">
                ←
              </Link>
              <h1 className="font-bold text-lg text-a-primary-dark">Tạo Báo cáo</h1>
            </div>
            <button className="btn btn-primary" onClick={() => window.print()}>
              In
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Dữ liệu nguồn</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }).map((_, index) => (
                    <option key={index} value={index}>
                      Tháng {index + 1}
                    </option>
                  ))}
                </select>
                <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {Array.from({ length: 8 }).map((_, index) => {
                    const value = 2023 + index;
                    return (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button className="btn btn-secondary" onClick={refreshData} style={{ width: '100%' }}>
                Tải dữ liệu mới nhất
              </button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Nội dung báo cáo</label>
                <button className="text-xs text-a-primary font-semibold hover:underline" onClick={addGroup}>
                  + Thêm nhóm
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1 space-y-1">
                  {loading ? (
                    <div className="p-4 text-center text-slate-400 text-sm">Đang tải danh sách...</div>
                  ) : items.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">Không có dữ liệu cho tháng này.</div>
                  ) : (
                    items.map((item, index) => (
                      <div
                        key={item.id}
                        className={`sortable-item flex items-center gap-2 p-2 rounded-lg border text-sm ${item.isGroup ? 'bg-slate-200 border-slate-300 font-bold text-slate-800 mt-2' : 'bg-white border-slate-100 text-slate-600'}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', String(index));
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromIdx = Number(e.dataTransfer.getData('text/plain'));
                          if (fromIdx === index) return;
                          setItems((prev) => {
                            const next = [...prev];
                            const moved = next.splice(fromIdx, 1)[0];
                            next.splice(index, 0, moved);
                            saveLayout(next);
                            return next;
                          });
                        }}
                      >
                        <span>⋮⋮</span>
                        <input
                          type="checkbox"
                          checked={item.reportInclude !== false}
                          onChange={(e) =>
                            updateItem(index, (current) => ({
                              ...current,
                              reportInclude: e.target.checked,
                            }))
                          }
                        />
                        {item.isGroup ? (
                          <button
                            type="button"
                            className="flex-1 text-left"
                            onClick={() => {
                              const nextTitle = window.prompt('Sửa tên nhóm:', item.title || '');
                              if (!nextTitle) return;
                              updateItem(index, (current) => ({ ...current, title: nextTitle }));
                            }}
                          >
                            {item.title}
                          </button>
                        ) : (
                          <span className={`flex-1 truncate select-none ${!item.reportInclude ? 'opacity-50 line-through' : ''}`}>{item.title}</span>
                        )}
                        {item.isGroup ? (
                          <button
                            type="button"
                            className="text-rose-400 hover:text-rose-600 p-1 rounded-full hover:bg-rose-50 transition-colors"
                            onClick={() => {
                              setItems((prev) => {
                                const next = prev.filter((_, idx) => idx !== index);
                                saveLayout(next);
                                return next;
                              });
                            }}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1 italic">Kéo thả để sắp xếp. Bỏ chọn để ẩn.</p>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <button
                className="flex items-center justify-between w-full text-left text-sm font-semibold text-slate-700 hover:text-a-primary transition-colors"
                onClick={() => {
                  const panel = document.getElementById('config-panel');
                  panel?.classList.toggle('hidden');
                }}
              >
                <span>Thông tin chung & Người ký</span>
              </button>
              <div id="config-panel" className="hidden mt-3 space-y-3">
                {[
                  ['unit', 'Tên đơn vị (dòng 1)'],
                  ['dept', 'Tên bộ phận (dòng 2)'],
                  ['recipient', 'Kính gửi (Nơi nhận)'],
                  ['suffix', 'Số hiệu văn bản (vd: BC-TV)'],
                  ['approverTitle', 'Chức danh duyệt'],
                  ['approverName', 'Tên người duyệt'],
                  ['creatorTitle', 'Chức danh lập'],
                  ['creatorName', 'Tên người lập'],
                ].map(([key, placeholder]) => (
                  <input
                    key={key}
                    className="input"
                    value={config[key as keyof ReportConfig] as string}
                    placeholder={placeholder}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }) as ReportConfig)
                    }
                  />
                ))}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={config.showApprover}
                    onChange={(e) => setConfig((prev) => ({ ...prev, showApprover: e.target.checked }))}
                  />
                  <span className="text-xs text-slate-600">Hiển thị người duyệt</span>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Đề xuất / Kiến nghị</label>
                <button className="text-xs text-a-primary font-semibold hover:underline" onClick={generateSuggestions}>
                  Gợi ý tự động
                </button>
              </div>
              <textarea
                className="input"
                rows={4}
                placeholder="Nhập nội dung kiến nghị..."
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
              />
            </div>
          </div>
        </aside>

        <main id="main-preview" className="flex-1 bg-slate-100 overflow-y-auto custom-scrollbar relative p-4 md:p-8 flex justify-center items-start">
          <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-4 border border-slate-200 z-10 no-print">
            <span className="text-xs font-bold text-slate-400 uppercase">Zoom</span>
            <input type="range" min="0.5" max="1.5" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
          </div>

          <div className="transition-transform origin-top" style={{ transform: `scale(${zoom})` }}>
            <div className="a4-paper font-times text-black">
              {loading ? (
                <div className="animate-pulse space-y-6">
                  <div className="flex justify-between">
                    <div className="h-4 bg-slate-200 w-32 rounded" />
                    <div className="h-4 bg-slate-200 w-40 rounded" />
                  </div>
                  <div className="h-8 bg-slate-200 w-2/3 mx-auto rounded mt-8" />
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="text-center">
                      <p className="font-bold uppercase text-[11pt]" id="print-unit">{config.unit}</p>
                      <p className="font-bold underline text-[11pt]" id="print-dept">{config.dept}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-[11pt]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                      <p className="font-bold underline text-[11pt]">Độc lập - Tự do - Hạnh phúc</p>
                    </div>
                  </div>

                  <div className="flex justify-between italic text-[11pt] mb-6">
                    <p>
                      Số: <span id="print-num">{`${month + 1}/${config.suffix}`}</span>
                    </p>
                    <p id="print-date">
                      {new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  <h1 className="text-center font-bold text-[14pt] mb-2 uppercase">
                    BÁO CÁO CÔNG VIỆC THÁNG <span id="print-month-title">{reportText}</span>
                  </h1>
                  <p className="text-center font-bold text-[12pt] mb-6">
                    Kính gửi: <span id="print-recipient">{config.recipient}</span>
                  </p>

                  <div className="text-[12pt]">
                    <p className="font-bold mb-2">I. Nội dung chi tiết:</p>
                    <table className="w-full border-collapse border border-black mb-6 text-[11pt]">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black p-1.5 w-10 text-center">STT</th>
                          <th className="border border-black p-1.5 text-left">Nội dung công việc</th>
                          <th className="border border-black p-1.5 w-24 text-center">Bắt đầu</th>
                          <th className="border border-black p-1.5 w-24 text-center">Kết thúc</th>
                          <th className="border border-black p-1.5 w-28 text-left">Ghi chú/Phối hợp</th>
                        </tr>
                      </thead>
                      <tbody id="print-tbody" dangerouslySetInnerHTML={{ __html: renderPreviewRows() }} />
                    </table>

                    <p className="font-bold mb-2">II. Đề xuất/Kiến nghị:</p>
                    <div id="print-suggest" className="whitespace-pre-wrap pl-4 mb-8 text-justify">
                      {suggestions || 'Không có.'}
                    </div>

                    <div className="grid grid-cols-2 mt-10">
                      <div className="text-center" id="area-approver" style={{ visibility: config.showApprover ? 'visible' : 'hidden' }}>
                        <p className="font-bold" id="print-approver-title">
                          {config.approverTitle}
                        </p>
                        <p className="italic mb-16">(Ký, họ tên)</p>
                        <p className="font-bold" id="print-approver-name">
                          {config.approverName}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold" id="print-creator-title">
                          {config.creatorTitle}
                        </p>
                        <p className="italic mb-16">(Ký, họ tên)</p>
                        <p className="font-bold" id="print-creator-name">
                          {config.creatorName || userName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
