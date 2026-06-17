"use client";

import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";

/* ─── Types ─── */

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  collaborator?: string;
  priority?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  isRecurring?: boolean;
  instanceDate?: string;
}

interface ReportItem {
  id: string;
  title: string;
  isGroup: boolean;
  reportInclude: boolean;
  // task fields (only for non-group items)
  description?: string;
  collaborator?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

interface ReportConfig {
  unit: string;
  dept: string;
  recipient: string;
  suffix: string;
  approverTitle: string;
  approverName: string;
  creatorTitle: string;
  creatorName: string;
  showApprover: boolean;
}

/* ─── Constants ─── */

const DEFAULT_CONFIG: ReportConfig = {
  unit: "TRUNG TÂM THƯ VIỆN",
  dept: "BP NGHIỆP VỤ",
  recipient: "Ban Giám đốc",
  suffix: "BC-TV",
  approverTitle: "Trưởng phòng",
  approverName: "",
  creatorTitle: "Nhân viên",
  creatorName: "",
  showApprover: true,
};

const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

/* ─── ReportPage ─── */

export default function ReportPage() {
  /* ── Refs ── */
  const dragIdxRef = useRef<number | null>(null);

  /* ── State ── */
  const [user, setUser] = useState<any>(null);
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [selMonth, setSelMonth] = useState(new Date().getMonth());
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [zoom, setZoom] = useState(1);
  const [suggestions, setSuggestions] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [config, setConfig] = useState<ReportConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const s = localStorage.getItem("aworkpro_conf");
      if (s) return { ...DEFAULT_CONFIG, ...JSON.parse(s) };
    } catch { /* ignore */ }
    return DEFAULT_CONFIG;
  });

  const auth = useMemo(() => getFirebaseAuth(), []);
  const db = useMemo(() => getFirebaseDb(), []);

  /* ── Auth ── */

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) {
        window.location.href = "/login/";
        return;
      }
      setUser(u);
      if (!config.creatorName && u.displayName) {
        setConfig((prev) => ({ ...prev, creatorName: u.displayName || "" }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  /* ── Fetch data ── */

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!user) return;
      setLoading(true);

      const tasksCol = collection(db, "users", user.uid, "tasks");
      const snap = await getDocs(tasksCol);
      const tasks: TaskItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as TaskItem));
      setAllTasks(tasks);

      // Filter by month
      const monthTasks = tasks.filter((t) => {
        if (t.isRecurring && !t.instanceDate) return false;
        const d = new Date(t.endDate || t.startDate || t.dueDate || "");
        return d.getMonth() === selMonth && d.getFullYear() === selYear;
      });

      // Load saved layout
      const layoutRef = doc(
        db,
        "users",
        user.uid,
        "report_layouts",
        `${selYear}-${selMonth}`,
      );
      const layoutSnap = await getDoc(layoutRef);

      let items: ReportItem[];

      if (layoutSnap.exists() && !forceRefresh) {
        const savedItems: ReportItem[] = layoutSnap.data().items;
        const savedIds = new Set(savedItems.map((i) => i.id));

        items = savedItems
          .map((i) => {
            if (i.isGroup) return i;
            const t = monthTasks.find((x) => x.id === i.id);
            return t
              ? {
                  ...i,
                  description: t.description,
                  collaborator: t.collaborator,
                  startDate: t.startDate,
                  endDate: t.endDate,
                  status: t.status,
                  reportInclude: i.reportInclude !== false,
                }
              : null;
          })
          .filter(Boolean) as ReportItem[];

        const newTasks = monthTasks.filter((t) => !savedIds.has(t.id));
        if (newTasks.length > 0) {
          items.push({
            id: "grp_new_" + Date.now(),
            title: "Mới bổ sung",
            isGroup: true,
            reportInclude: true,
          });
          items.push(
            ...newTasks.map((t) => ({
              id: t.id,
              title: t.title,
              isGroup: false,
              reportInclude: true,
              description: t.description,
              collaborator: t.collaborator,
              startDate: t.startDate,
              endDate: t.endDate,
              status: t.status,
            })),
          );
        }
      } else {
        items = monthTasks
          .sort(
            (a, b) =>
              new Date(a.startDate || "").getTime() -
              new Date(b.startDate || "").getTime(),
          )
          .map((t) => ({
            id: t.id,
            title: t.title,
            isGroup: false,
            reportInclude: true,
            description: t.description,
            collaborator: t.collaborator,
            startDate: t.startDate,
            endDate: t.endDate,
            status: t.status,
          }));
      }

      setReportItems(items);
      setLoading(false);
    },
    [user, db, selMonth, selYear],
  );

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  /* ── Save layout ── */

  const saveLayout = useCallback(async () => {
    if (!user) return;
    const data = reportItems.map((i) => ({
      id: i.id,
      title: i.title,
      isGroup: i.isGroup || false,
      reportInclude: i.reportInclude,
    }));
    await setDoc(
      doc(db, "users", user.uid, "report_layouts", `${selYear}-${selMonth}`),
      { items: data },
    );
  }, [user, db, selYear, selMonth, reportItems]);

  /* ── Save config to localStorage ── */

  const updateConfig = useCallback(
    (key: keyof ReportConfig, value: string | boolean) => {
      setConfig((prev) => {
        const next = { ...prev, [key]: value };
        localStorage.setItem("aworkpro_conf", JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  /* ── Toggle item include ── */

  const toggleItem = useCallback(
    (idx: number) => {
      setReportItems((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], reportInclude: !next[idx].reportInclude };
        return next;
      });
      // Delay save to avoid stale state
      setTimeout(() => saveLayout(), 50);
    },
    [saveLayout],
  );

  /* ── Drag & Drop ── */

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    dragIdxRef.current = idx;
    (e.target as HTMLElement).classList.add("dragging");
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove("dragging");
    document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add("drag-over");
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove("drag-over");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIdx: number) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).classList.remove("drag-over");
      const fromIdx = dragIdxRef.current;
      if (fromIdx === null || fromIdx === dropIdx) return;
      setReportItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(dropIdx, 0, moved);
        return next;
      });
      dragIdxRef.current = null;
      setTimeout(() => saveLayout(), 50);
    },
    [saveLayout],
  );

  /* ── Add group ── */

  const addGroup = useCallback(() => {
    const title = prompt("Nhập tên nhóm mới (VD: Công việc phát sinh):");
    if (!title) return;
    setReportItems((prev) => [
      ...prev,
      { id: "grp_" + Date.now(), title, isGroup: true, reportInclude: true },
    ]);
    setTimeout(() => saveLayout(), 50);
  }, [saveLayout]);

  /* ── Delete group ── */

  const deleteGroup = useCallback(
    (idx: number) => {
      setReportItems((prev) => prev.filter((_, i) => i !== idx));
      setTimeout(() => saveLayout(), 50);
    },
    [saveLayout],
  );

  /* ── Rename group ── */

  const renameGroup = useCallback(
    (idx: number, oldTitle: string) => {
      const newTitle = prompt("Sửa tên nhóm:", oldTitle);
      if (!newTitle) return;
      setReportItems((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], title: newTitle };
        return next;
      });
      setTimeout(() => saveLayout(), 50);
    },
    [saveLayout],
  );

  /* ── Auto suggest ── */

  const generateSuggestions = useCallback(() => {
    const activeTasks = reportItems.filter((i) => !i.isGroup && i.reportInclude);
    const overdue = activeTasks.filter((t) => t.status === "overdue").length;
    const completed = activeTasks.filter((t) => t.status === "completed").length;
    const txt =
      `Báo cáo tháng ${selMonth + 1}:\n- Hoàn thành: ${completed} công việc.\n- Tồn đọng/Quá hạn: ${overdue} công việc.\n- Kiến nghị: Đảm bảo tiến độ cho các công việc trọng tâm tháng sau.`;
    setSuggestions(txt);
  }, [reportItems, selMonth]);

  /* ── Print ── */

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /* ── Computed values for preview ── */

  const now = new Date();

  const previewRows = useMemo(() => {
    let stt = 1;
    const rows: React.ReactNode[] = [];

    reportItems.forEach((item, idx) => {
      if (item.isGroup) {
        const nextGroupIdx = reportItems.findIndex(
          (x, i) => i > idx && x.isGroup,
        );
        const sliceEnd = nextGroupIdx === -1 ? reportItems.length : nextGroupIdx;
        const children = reportItems.slice(idx + 1, sliceEnd);
        const hasActive = children.some((c) => c.reportInclude);

        if (hasActive || item.reportInclude) {
          rows.push(
            <tr key={item.id}>
              <td
                colSpan={5}
                className="rp-table-cell rp-group-cell"
              >
                {item.title}
              </td>
            </tr>,
          );
        }
      } else if (item.reportInclude) {
        const d1 = item.startDate
          ? new Date(item.startDate).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
            })
          : "";
        const d2 = item.endDate
          ? new Date(item.endDate).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
            })
          : "";
        const desc = (item.description || "")
          .replace(/- /g, "• ")
          .replace(/\n/g, "<br>");

        rows.push(
          <tr key={item.id}>
            <td className="rp-table-cell rp-col-stt">{stt++}</td>
            <td className="rp-table-cell rp-col-desc">
              <b>{item.title}</b>
              {desc && <div className="rp-desc-text">{desc}</div>}
            </td>
            <td className="rp-table-cell rp-col-date">{d1}</td>
            <td className="rp-table-cell rp-col-date">{d2}</td>
            <td className="rp-table-cell rp-col-note">
              {item.collaborator || ""}
            </td>
          </tr>,
        );
      }
    });

    return rows;
  }, [reportItems]);

  /* ── Render ── */

  return (
    <>
      {/* ═══ PRINT STYLES (injected inline for reliable @media print) ═══ */}
      <style>{`
        @media print {
          head, script, style, title, meta, link, noscript { display: none !important; }
          html, body, #__next, .admin-shell, .admin-workspace, .admin-main, .admin-sidebar, .admin-mobile-topbar, .admin-workspace > header {
            background: white !important;
            background-image: none !important;
            background-color: white !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
            position: static !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .rp-no-print { display: none !important; }
          .rp-root {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .rp-sidebar { display: none !important; }
          .rp-main {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            height: auto !important;
            overflow: visible !important;
          }
          .rp-main > div {
            transform: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .rp-a4-paper {
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            box-shadow: none !important;
            margin: 0 !important;
            margin-top: -22cm !important;
            padding: 0 !important;
            padding-left: 1.5cm !important;
            padding-right: 0.5cm !important;
            transform: none !important;
            page-break-after: auto !important;
          }
          .rp-a4-paper * { font-family: 'Times New Roman', serif !important; color: black !important; }
          .rp-print-table, .rp-print-table th, .rp-print-table td { border: 1px solid black !important; border-collapse: collapse !important; }
          .rp-print-table th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; font-weight: bold !important; }
          .rp-print-table tr { page-break-inside: avoid !important; }
          .rp-signatures { page-break-inside: avoid !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      <div className="rp-root">
        {/* Sidebar */}
        <aside className="rp-sidebar rp-no-print">
          {/* Header */}
          <div className="rp-sidebar-header">
            <div className="rp-sidebar-title">
              <svg className="rp-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <h1 className="rp-title">Tạo Báo cáo</h1>
            </div>
            <button className="rp-btn-print" onClick={handlePrint}>
              <svg className="rp-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm7-8a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              In
            </button>
          </div>

          <div className="rp-sidebar-body">
            {/* Data Source */}
            <div className="rp-card">
              <label className="rp-label">Dữ liệu nguồn</label>
              <div className="rp-date-row">
                <select
                  className="rp-select"
                  value={selMonth}
                  onChange={(e) => setSelMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  className="rp-select"
                  value={selYear}
                  onChange={(e) => setSelYear(Number(e.target.value))}
                >
                  {Array.from({ length: 8 }, (_, i) => 2023 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button className="rp-btn-refresh" onClick={() => fetchData(true)}>
                Tải dữ liệu mới nhất
              </button>
            </div>

            {/* Content Manager */}
            <div>
              <div className="rp-section-header">
                <label className="rp-label">Nội dung báo cáo</label>
                <button className="rp-link-btn" onClick={addGroup}>
                  + Thêm nhóm
                </button>
              </div>
              <div className="rp-sort-container">
                <div className="rp-sort-list">
                  {loading ? (
                    <div className="rp-empty-msg">Đang tải danh sách...</div>
                  ) : reportItems.length === 0 ? (
                    <div className="rp-empty-msg">Không có dữ liệu cho tháng này.</div>
                  ) : (
                    reportItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`rp-sort-item ${item.isGroup ? "rp-sort-group" : ""} ${!item.reportInclude ? "rp-sort-excluded" : ""}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, idx)}
                      >
                        <svg className="rp-grip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                        </svg>
                        <input
                          type="checkbox"
                          className="rp-checkbox"
                          checked={item.reportInclude}
                          onChange={() => toggleItem(idx)}
                        />
                        <span
                          className={`rp-item-title ${!item.reportInclude ? "rp-line-through" : ""}`}
                          onClick={item.isGroup ? () => renameGroup(idx, item.title) : undefined}
                          style={item.isGroup ? { cursor: "pointer" } : undefined}
                        >
                          {item.title}
                        </span>
                        {item.isGroup && (
                          <button
                            className="rp-delete-btn"
                            onClick={() => deleteGroup(idx)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <p className="rp-hint">Kéo thả để sắp xếp. Bỏ chọn để ẩn.</p>
            </div>

            {/* Configuration */}
            <div className="rp-config-section">
              <button
                className="rp-config-toggle"
                onClick={() => setConfigOpen(!configOpen)}
              >
                <span>Thông tin chung & Người ký</span>
                <svg
                  className="rp-icon-sm"
                  style={{ transform: configOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {configOpen && (
                <div className="rp-config-panel">
                  <input
                    className="rp-input"
                    placeholder="Tên đơn vị (dòng 1)"
                    value={config.unit}
                    onChange={(e) => updateConfig("unit", e.target.value)}
                  />
                  <input
                    className="rp-input"
                    placeholder="Tên bộ phận (dòng 2)"
                    value={config.dept}
                    onChange={(e) => updateConfig("dept", e.target.value)}
                  />
                  <input
                    className="rp-input"
                    placeholder="Kính gửi (Nơi nhận)"
                    value={config.recipient}
                    onChange={(e) => updateConfig("recipient", e.target.value)}
                  />
                  <input
                    className="rp-input"
                    placeholder="Số hiệu văn bản (vd: BC-TV)"
                    value={config.suffix}
                    onChange={(e) => updateConfig("suffix", e.target.value)}
                  />
                  <div className="rp-config-divider" />
                  <p className="rp-sub-label">Người ký duyệt</p>
                  <label className="rp-check-label">
                    <input
                      type="checkbox"
                      checked={config.showApprover}
                      onChange={(e) => updateConfig("showApprover", e.target.checked)}
                    />
                    Hiển thị người duyệt
                  </label>
                  <input
                    className="rp-input"
                    placeholder="Chức danh duyệt"
                    value={config.approverTitle}
                    onChange={(e) => updateConfig("approverTitle", e.target.value)}
                  />
                  <input
                    className="rp-input"
                    placeholder="Tên người duyệt"
                    value={config.approverName}
                    onChange={(e) => updateConfig("approverName", e.target.value)}
                  />
                  <div className="rp-config-divider" />
                  <p className="rp-sub-label">Người lập</p>
                  <input
                    className="rp-input"
                    placeholder="Chức danh lập"
                    value={config.creatorTitle}
                    onChange={(e) => updateConfig("creatorTitle", e.target.value)}
                  />
                  <input
                    className="rp-input"
                    placeholder="Tên người lập"
                    value={config.creatorName}
                    onChange={(e) => updateConfig("creatorName", e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Suggestions */}
            <div className="rp-suggest-section">
              <div className="rp-section-header">
                <label className="rp-label">Đề xuất / Kiến nghị</label>
                <button className="rp-link-btn" onClick={generateSuggestions}>
                  Gợi ý tự động
                </button>
              </div>
              <textarea
                className="rp-textarea"
                rows={4}
                placeholder="Nhập nội dung kiến nghị..."
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
              />
            </div>
          </div>
        </aside>

        {/* Main Preview */}
        <main className="rp-main">
          {/* Zoom Controls */}
          <div className="rp-zoom-bar rp-no-print">
            <span className="rp-zoom-label">Zoom</span>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="rp-zoom-slider"
            />
          </div>

          {/* A4 Paper */}
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.2s ease" }}>
            <div className="rp-a4-paper">
              {/* Loading skeleton */}
              {loading ? (
                <div className="rp-skeleton">
                  <div className="rp-skel-row">
                    <div className="rp-skel-box rp-skel-sm" />
                    <div className="rp-skel-box rp-skel-md" />
                  </div>
                  <div className="rp-skel-box rp-skel-lg" />
                  <div className="rp-skel-box rp-skel-full" />
                  <div className="rp-skel-box rp-skel-full" />
                  <div className="rp-skel-box rp-skel-full" />
                </div>
              ) : (
                <div className="rp-paper-content">
                  {/* Header */}
                  <div className="rp-paper-header">
                    <div className="rp-header-left">
                      <p className="rp-header-unit">{config.unit}</p>
                      <p className="rp-header-dept">{config.dept}</p>
                    </div>
                    <div className="rp-header-right">
                      <p className="rp-header-country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                      <p className="rp-header-motto">Độc lập - Tự do - Hạnh phúc</p>
                    </div>
                  </div>

                  <div className="rp-paper-meta">
                    <p>Số: {selMonth + 1}/{config.suffix}</p>
                    <p>Tp.HCM, ngày {now.getDate()} tháng {now.getMonth() + 1} năm {now.getFullYear()}</p>
                  </div>

                  <h1 className="rp-paper-title">
                    BÁO CÁO CÔNG VIỆC THÁNG {selMonth + 1}/{selYear}
                  </h1>
                  <p className="rp-paper-recipient">Kính gửi: {config.recipient}</p>

                  {/* Table */}
                  <div className="rp-paper-body">
                    <p className="rp-section-title">I. Nội dung chi tiết:</p>
                    <table className="rp-print-table">
                      <thead>
                        <tr>
                          <th className="rp-th-stt">STT</th>
                          <th className="rp-th-desc">Nội dung công việc</th>
                          <th className="rp-th-date">Bắt đầu</th>
                          <th className="rp-th-date">Kết thúc</th>
                          <th className="rp-th-note">Ghi chú/Phối hợp</th>
                        </tr>
                      </thead>
                      <tbody>{previewRows}</tbody>
                    </table>

                    <p className="rp-section-title">II. Đề xuất/Kiến nghị:</p>
                    <div className="rp-suggest-text">
                      {suggestions || "Không có."}
                    </div>

                    {/* Signatures */}
                    <div className="rp-signatures">
                      <div
                        className="rp-sig-block"
                        style={{ visibility: config.showApprover ? "visible" : "hidden" }}
                      >
                        <p className="rp-sig-title">{config.approverTitle}</p>
                        <p className="rp-sig-hint">(Ký, họ tên)</p>
                        <p className="rp-sig-name">{config.approverName}</p>
                      </div>
                      <div className="rp-sig-block">
                        <p className="rp-sig-title">{config.creatorTitle}</p>
                        <p className="rp-sig-hint">(Ký, họ tên)</p>
                        <p className="rp-sig-name">{config.creatorName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ═══ GLOBAL STYLES ═══ */}
      <style>{`
        /* ── Reset within .rp-root ── */
        .rp-root {
          display: flex;
          height: calc(100vh - 1px);
          overflow: hidden;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: #f1f5f9;
          color: #0f172a;
          margin: -20px -24px -28px;
        }

        /* ── Sidebar ── */
        .rp-sidebar {
          width: 384px;
          min-width: 384px;
          background: #fff;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          z-index: 20;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .rp-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #f1f5f9;
          background: #f8fafc;
        }
        .rp-sidebar-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rp-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f3d4f;
        }
        .rp-btn-print {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          background: #0891b2;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(8,145,178,0.25);
          transition: background 0.15s;
        }
        .rp-btn-print:hover { background: #0e7490; }
        .rp-sidebar-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .rp-sidebar-body::-webkit-scrollbar { width: 6px; }
        .rp-sidebar-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }

        /* ── Cards ── */
        .rp-card {
          background: #f8fafc;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .rp-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          display: block;
          margin-bottom: 8px;
        }
        .rp-date-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }
        .rp-select {
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          background: #fff;
          outline: none;
        }
        .rp-select:focus { border-color: #0891b2; box-shadow: 0 0 0 2px rgba(8,145,178,0.15); }
        .rp-btn-refresh {
          width: 100%;
          padding: 8px;
          background: #fff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #334155;
          cursor: pointer;
          transition: background 0.15s;
        }
        .rp-btn-refresh:hover { background: #f1f5f9; }

        /* ── Section header ── */
        .rp-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .rp-link-btn {
          background: none;
          border: none;
          color: #0891b2;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .rp-link-btn:hover { text-decoration: underline; }

        /* ── Sort list ── */
        .rp-sort-container {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
        }
        .rp-sort-list {
          max-height: 300px;
          overflow-y: auto;
          padding: 4px;
        }
        .rp-sort-list::-webkit-scrollbar { width: 6px; }
        .rp-sort-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        .rp-sort-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          margin: 2px 0;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
          font-size: 14px;
          color: #475569;
          cursor: grab;
          transition: background 0.15s;
          user-select: none;
        }
        .rp-sort-item:hover { background: #f8fafc; }
        .rp-sort-item:active { cursor: grabbing; }
        .rp-sort-group {
          background: #e2e8f0;
          border-color: #cbd5e1;
          font-weight: 700;
          color: #1e293b;
          margin-top: 8px;
        }
        .rp-sort-excluded { opacity: 0.5; }
        .rp-grip-icon {
          width: 16px;
          height: 16px;
          color: #94a3b8;
          flex-shrink: 0;
        }
        .rp-checkbox {
          width: 16px;
          height: 16px;
          accent-color: #0891b2;
          flex-shrink: 0;
        }
        .rp-item-title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rp-line-through { text-decoration: line-through; }
        .rp-delete-btn {
          background: none;
          border: none;
          color: #f87171;
          font-size: 18px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }
        .rp-delete-btn:hover { color: #ef4444; }
        .rp-hint { font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 4px; }

        /* Drag states */
        .rp-sort-item.dragging { opacity: 0.5; background: #e0f2fe; border: 2px dashed #0891b2; }
        .rp-sort-item.drag-over { border-bottom: 2px solid #0891b2; }

        /* ── Empty msg ── */
        .rp-empty-msg { padding: 16px; text-align: center; color: #94a3b8; font-size: 13px; }

        /* ── Config ── */
        .rp-config-section { border-top: 1px solid #f1f5f9; padding-top: 8px; }
        .rp-config-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: none;
          border: none;
          padding: 4px 0;
          font-size: 14px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
        }
        .rp-config-toggle:hover { color: #0891b2; }
        .rp-config-panel {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rp-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
        }
        .rp-input:focus { border-color: #0891b2; box-shadow: 0 0 0 2px rgba(8,145,178,0.15); }
        .rp-config-divider { border-top: 1px solid #f1f5f9; margin: 4px 0; }
        .rp-sub-label { font-size: 12px; font-weight: 600; color: #64748b; }
        .rp-check-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #475569;
        }
        .rp-check-label input { accent-color: #0891b2; }

        /* ── Suggestions ── */
        .rp-suggest-section { border-top: 1px solid #f1f5f9; padding-top: 8px; }
        .rp-textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
          outline: none;
          font-family: inherit;
          box-sizing: border-box;
        }
        .rp-textarea:focus { border-color: #0891b2; box-shadow: 0 0 0 2px rgba(8,145,178,0.15); }

        /* ── Main ── */
        .rp-main {
          flex: 1;
          overflow-y: auto;
          background: #e2e8f0;
          padding: 32px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          position: relative;
        }
        .rp-main::-webkit-scrollbar { width: 6px; }
        .rp-main::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }

        /* ── Zoom ── */
        .rp-zoom-bar {
          position: fixed;
          bottom: 16px;
          right: 16px;
          background: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-radius: 999px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #e2e8f0;
          z-index: 10;
        }
        .rp-zoom-label {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
        }
        .rp-zoom-slider {
          width: 96px;
          accent-color: #0891b2;
          cursor: pointer;
        }

        /* ── A4 Paper ── */
        .rp-a4-paper {
          width: 210mm;
          min-height: 297mm;
          background: #fff;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          margin: 0 auto;
          padding: 20mm;
          font-family: 'Times New Roman', serif;
          color: #000;
        }

        /* ── Skeleton ── */
        .rp-skeleton { display: flex; flex-direction: column; gap: 24px; }
        .rp-skel-row { display: flex; justify-content: space-between; }
        .rp-skel-box { background: #e2e8f0; border-radius: 4px; height: 16px; }
        .rp-skel-sm { width: 128px; }
        .rp-skel-md { width: 160px; }
        .rp-skel-lg { width: 67%; height: 32px; margin: 32px auto 0; }
        .rp-skel-full { width: 100%; }

        /* ── Paper content ── */
        .rp-paper-content { font-size: 11pt; }
        .rp-paper-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .rp-header-left { text-align: center; }
        .rp-header-unit { font-weight: 700; text-transform: uppercase; }
        .rp-header-dept { font-weight: 700; text-decoration: underline; }
        .rp-header-right { text-align: center; }
        .rp-header-country { font-weight: 700; }
        .rp-header-motto { font-weight: 700; text-decoration: underline; }
        .rp-paper-meta {
          display: flex;
          justify-content: space-between;
          font-style: italic;
          margin-bottom: 24px;
        }
        .rp-paper-title {
          text-align: center;
          font-weight: 700;
          font-size: 14pt;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .rp-paper-recipient {
          text-align: center;
          font-weight: 700;
          font-size: 12pt;
          margin-bottom: 24px;
        }
        .rp-paper-body { font-size: 12pt; }
        .rp-section-title { font-weight: 700; margin-bottom: 8px; }

        /* ── Print table ── */
        .rp-print-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #000;
          margin-bottom: 24px;
          font-size: 11pt;
        }
        .rp-print-table th {
          border: 1px solid #000;
          padding: 6px;
          background: #f3f4f6;
          font-weight: 700;
        }
        .rp-th-stt { width: 40px; text-align: center; }
        .rp-th-desc { text-align: left; }
        .rp-th-date { width: 96px; text-align: center; }
        .rp-th-note { width: 112px; text-align: left; }

        .rp-table-cell {
          border: 1px solid #000;
          padding: 6px;
          vertical-align: top;
        }
        .rp-group-cell {
          font-weight: 700;
          background: #f8fafc;
          text-align: left;
        }
        .rp-col-stt { text-align: center; }
        .rp-col-desc { text-align: justify; }
        .rp-desc-text { font-size: 10pt; margin-top: 4px; }
        .rp-col-date { text-align: center; font-size: 10pt; }
        .rp-col-note { text-align: center; font-size: 10pt; }

        /* ── Suggest ── */
        .rp-suggest-text {
          white-space: pre-wrap;
          padding-left: 16px;
          margin-bottom: 32px;
          text-align: justify;
        }

        /* ── Signatures ── */
        .rp-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          margin-top: 40px;
        }
        .rp-sig-block { text-align: center; }
        .rp-sig-title { font-weight: 700; }
        .rp-sig-hint { font-style: italic; margin-bottom: 64px; }
        .rp-sig-name { font-weight: 700; }

        /* ── Icons ── */
        .rp-icon { width: 20px; height: 20px; }
        .rp-icon-sm { width: 16px; height: 16px; }

        /* ── Responsive ── */
        @media (max-width: 920px) {
          .rp-root { flex-direction: column; }
          .rp-sidebar { width: 100%; min-width: 100%; height: 40vh; }
          .rp-main { height: 60vh; padding: 16px; }
        }
      `}</style>
    </>
  );
}