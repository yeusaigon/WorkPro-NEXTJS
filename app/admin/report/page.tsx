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
  const dragIdxRef = useRef<number | null>(null);

  const [user, setUser] = useState<any>(null);
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [selMonth, setSelMonth] = useState(new Date().getMonth());
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [zoom, setZoom] = useState(1);
  const [suggestions, setSuggestions] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
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
      if (!u) { window.location.href = "/login/"; return; }
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
      const tasks: TaskItem[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TaskItem));
      setAllTasks(tasks);

      const monthTasks = tasks.filter((t) => {
        if (t.isRecurring && !t.instanceDate) return false;
        const d = new Date(t.endDate || t.startDate || t.dueDate || "");
        return d.getMonth() === selMonth && d.getFullYear() === selYear;
      });

      const layoutRef = doc(db, "users", user.uid, "report_layouts", `${selYear}-${selMonth}`);
      const layoutSnap = await getDoc(layoutRef);
      let items: ReportItem[];

      if (layoutSnap.exists() && !forceRefresh) {
        const savedItems: ReportItem[] = layoutSnap.data().items;
        const savedIds = new Set(savedItems.map((i) => i.id));
        items = savedItems.map((i) => {
          if (i.isGroup) return i;
          const t = monthTasks.find((x) => x.id === i.id);
          return t ? { ...i, description: t.description, collaborator: t.collaborator, startDate: t.startDate, endDate: t.endDate, status: t.status, reportInclude: i.reportInclude !== false } : null;
        }).filter(Boolean) as ReportItem[];

        const newTasks = monthTasks.filter((t) => !savedIds.has(t.id));
        if (newTasks.length > 0) {
          items.push({ id: "grp_new_" + Date.now(), title: "Mới bổ sung", isGroup: true, reportInclude: true });
          items.push(...newTasks.map((t) => ({ id: t.id, title: t.title, isGroup: false, reportInclude: true, description: t.description, collaborator: t.collaborator, startDate: t.startDate, endDate: t.endDate, status: t.status })));
        }
      } else {
        items = monthTasks.sort((a, b) => new Date(a.startDate || "").getTime() - new Date(b.startDate || "").getTime())
          .map((t) => ({ id: t.id, title: t.title, isGroup: false, reportInclude: true, description: t.description, collaborator: t.collaborator, startDate: t.startDate, endDate: t.endDate, status: t.status }));
      }
      setReportItems(items);
      setLoading(false);
    },
    [user, db, selMonth, selYear],
  );

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const saveLayout = useCallback(async () => {
    if (!user) return;
    const data = reportItems.map((i) => ({ id: i.id, title: i.title, isGroup: i.isGroup || false, reportInclude: i.reportInclude }));
    await setDoc(doc(db, "users", user.uid, "report_layouts", `${selYear}-${selMonth}`), { items: data });
  }, [user, db, selYear, selMonth, reportItems]);

  const updateConfig = useCallback((key: keyof ReportConfig, value: string | boolean) => {
    setConfig((prev) => { const next = { ...prev, [key]: value }; localStorage.setItem("aworkpro_conf", JSON.stringify(next)); return next; });
  }, []);

  const toggleItem = useCallback((idx: number) => {
    setReportItems((prev) => { const next = [...prev]; next[idx] = { ...next[idx], reportInclude: !next[idx].reportInclude }; return next; });
    setTimeout(() => saveLayout(), 50);
  }, [saveLayout]);

  /* ── Drag & Drop ── */
  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => { dragIdxRef.current = idx; (e.target as HTMLElement).classList.add("dragging"); }, []);
  const handleDragEnd = useCallback((e: React.DragEvent) => { (e.target as HTMLElement).classList.remove("dragging"); document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over")); }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add("drag-over"); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { (e.currentTarget as HTMLElement).classList.remove("drag-over"); }, []);
  const handleDrop = useCallback((e: React.DragEvent, dropIdx: number) => {
    e.preventDefault(); (e.currentTarget as HTMLElement).classList.remove("drag-over");
    const fromIdx = dragIdxRef.current; if (fromIdx === null || fromIdx === dropIdx) return;
    setReportItems((prev) => { const next = [...prev]; const [moved] = next.splice(fromIdx, 1); next.splice(dropIdx, 0, moved); return next; });
    dragIdxRef.current = null; setTimeout(() => saveLayout(), 50);
  }, [saveLayout]);

  const addGroup = useCallback(() => {
    const title = prompt("Nhập tên nhóm mới (VD: Công việc phát sinh):"); if (!title) return;
    setReportItems((prev) => [...prev, { id: "grp_" + Date.now(), title, isGroup: true, reportInclude: true }]);
    setTimeout(() => saveLayout(), 50);
  }, [saveLayout]);

  const deleteGroup = useCallback((idx: number) => { setReportItems((prev) => prev.filter((_, i) => i !== idx)); setTimeout(() => saveLayout(), 50); }, [saveLayout]);
  const renameGroup = useCallback((idx: number, oldTitle: string) => {
    const newTitle = prompt("Sửa tên nhóm:", oldTitle); if (!newTitle) return;
    setReportItems((prev) => { const next = [...prev]; next[idx] = { ...next[idx], title: newTitle }; return next; });
    setTimeout(() => saveLayout(), 50);
  }, [saveLayout]);

  const generateSuggestions = useCallback(() => {
    const activeTasks = reportItems.filter((i) => !i.isGroup && i.reportInclude);
    const overdue = activeTasks.filter((t) => t.status === "overdue").length;
    const completed = activeTasks.filter((t) => t.status === "completed").length;
    setSuggestions(`Báo cáo tháng ${selMonth + 1}:\n- Hoàn thành: ${completed} công việc.\n- Tồn đọng/Quá hạn: ${overdue} công việc.\n- Kiến nghị: Đảm bảo tiến độ cho các công việc trọng tâm tháng sau.`);
  }, [reportItems, selMonth]);

  /* ── Print ── */
  const handlePrint = useCallback(() => {
    const monthLabel = selMonth + 1;
    const now = new Date();
    const dateStr = `Tp.HCM, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
    let stt = 1; let tableRowsHtml = "";
    reportItems.forEach((item, idx) => {
      if (item.isGroup) {
        const nextGroupIdx = reportItems.findIndex((x, i) => i > idx && x.isGroup);
        const sliceEnd = nextGroupIdx === -1 ? reportItems.length : nextGroupIdx;
        const children = reportItems.slice(idx + 1, sliceEnd);
        if (children.some((c) => c.reportInclude) || item.reportInclude) {
          tableRowsHtml += `<tr><td colspan="5" class="group-cell">${item.title}</td></tr>`;
        }
      } else if (item.reportInclude) {
        const d1 = item.startDate ? new Date(item.startDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "";
        const d2 = item.endDate ? new Date(item.endDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "";
        const desc = (item.description || "").replace(/- /g, "• ").replace(/\n/g, "<br>");
        tableRowsHtml += `<tr><td class="col-stt">${stt++}</td><td class="col-desc"><b>${item.title}</b>${desc ? `<div class="desc-text">${desc}</div>` : ""}</td><td class="col-date">${d1}</td><td class="col-date">${d2}</td><td class="col-note">${item.collaborator || ""}</td></tr>`;
      }
    });
    const printHtml = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Báo cáo tháng ${monthLabel}/${selYear}</title><style>@page{size:A4;margin:20mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:12pt;color:#000;padding:0}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}.header-left{text-align:center}.header-left .unit{font-weight:700;text-transform:uppercase}.header-left .dept{font-weight:700;text-decoration:underline}.header-right{text-align:center}.header-right .country{font-weight:700}.header-right .motto{font-weight:700;text-decoration:underline}.meta{display:flex;justify-content:space-between;font-style:italic;margin-bottom:16px}.title{text-align:center;font-weight:700;font-size:14pt;margin-bottom:8px;text-transform:uppercase}.recipient{text-align:center;font-weight:700;font-size:12pt;margin-bottom:20px}.section-title{font-weight:700;margin-bottom:8px}table{width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:20px;font-size:11pt}th{border:1px solid #000;padding:6px;background:#f3f4f6;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}td{border:1px solid #000;padding:6px;vertical-align:top}.col-stt{width:40px;text-align:center}.col-desc{text-align:justify}.col-date{width:96px;text-align:center;font-size:10pt}.col-note{width:112px;text-align:center;font-size:10pt}.group-cell{font-weight:700;background:#f8fafc;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact}.desc-text{font-size:10pt;margin-top:4px}tr{page-break-inside:avoid}.suggest-text{white-space:pre-wrap;padding-left:16px;margin-bottom:32px;text-align:justify}.signatures{display:flex;justify-content:space-between;margin-top:40px;page-break-inside:avoid}.sig-block{text-align:center;flex:1}.sig-title{font-weight:700}.sig-hint{font-style:italic;margin-bottom:64px}.sig-name{font-weight:700}</style></head><body><div class="header"><div class="header-left"><p class="unit">${config.unit}</p><p class="dept">${config.dept}</p></div><div class="header-right"><p class="country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p><p class="motto">Độc lập - Tự do - Hạnh phúc</p></div></div><div class="meta"><p>Số: ${monthLabel}/${config.suffix}</p><p>${dateStr}</p></div><h1 class="title">BÁO CÁO CÔNG VIỆC THÁNG ${monthLabel}/${selYear}</h1><p class="recipient">Kính gửi: ${config.recipient}</p><p class="section-title">I. Nội dung chi tiết:</p><table><thead><tr><th class="col-stt">STT</th><th class="col-desc">Nội dung công việc</th><th class="col-date">Bắt đầu</th><th class="col-date">Kết thúc</th><th class="col-note">Ghi chú/Phối hợp</th></tr></thead><tbody>${tableRowsHtml}</tbody></table><p class="section-title">II. Đề xuất/Kiến nghị:</p><div class="suggest-text">${suggestions || "Không có."}</div><div class="signatures"><div class="sig-block" style="visibility:${config.showApprover ? "visible" : "hidden"}"><p class="sig-title">${config.approverTitle}</p><p class="sig-hint">(Ký, họ tên)</p><p class="sig-name">${config.approverName}</p></div><div class="sig-block"><p class="sig-title">${config.creatorTitle}</p><p class="sig-hint">(Ký, họ tên)</p><p class="sig-name">${config.creatorName}</p></div></div></body></html>`;
    const printWindow = window.open("", "_blank");
    if (printWindow) { printWindow.document.write(printHtml); printWindow.document.close(); printWindow.focus(); printWindow.onload = () => printWindow.print(); setTimeout(() => printWindow.print(), 500); }
  }, [reportItems, selMonth, selYear, config, suggestions]);

  /* ── Computed values for preview ── */
  const now = new Date();
  const previewRows = useMemo(() => {
    let stt = 1; const rows: React.ReactNode[] = [];
    reportItems.forEach((item, idx) => {
      if (item.isGroup) {
        const nextGroupIdx = reportItems.findIndex((x, i) => i > idx && x.isGroup);
        const sliceEnd = nextGroupIdx === -1 ? reportItems.length : nextGroupIdx;
        const children = reportItems.slice(idx + 1, sliceEnd);
        if (children.some((c) => c.reportInclude) || item.reportInclude) {
          rows.push(<tr key={item.id}><td colSpan={5} className="rp-table-cell rp-group-cell">{item.title}</td></tr>);
        }
      } else if (item.reportInclude) {
        const d1 = item.startDate ? new Date(item.startDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "";
        const d2 = item.endDate ? new Date(item.endDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "";
        const desc = (item.description || "").replace(/- /g, "• ").replace(/\n/g, "<br>");
        rows.push(<tr key={item.id}><td className="rp-table-cell rp-col-stt">{stt++}</td><td className="rp-table-cell rp-col-desc"><b>{item.title}</b>{desc && <div className="rp-desc-text">{desc}</div>}</td><td className="rp-table-cell rp-col-date">{d1}</td><td className="rp-table-cell rp-col-date">{d2}</td><td className="rp-table-cell rp-col-note">{item.collaborator || ""}</td></tr>);
      }
    });
    return rows;
  }, [reportItems]);

  /* ── Render ── */
  return (
    <>
      <div className="rp-root">
        {/* ═══ FLOATING PANEL OVERLAY ═══ */}
        <div className={`rp-panel-overlay${panelOpen ? " rp-panel-open" : ""}`} onClick={() => setPanelOpen(false)} />
        
        <aside className={`rp-panel${panelOpen ? " rp-panel-open" : ""}`}>
          <div className="rp-panel-header">
            <h2 className="rp-panel-title">Tùy chỉnh báo cáo</h2>
            <button className="rp-panel-close-btn" onClick={() => setPanelOpen(false)} type="button" title="Đóng">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="rp-panel-body">
            {/* Data Source */}
            <div className="rp-card">
              <label className="rp-label">Dữ liệu nguồn</label>
              <div className="rp-date-row">
                <select className="rp-select" value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
                <select className="rp-select" value={selYear} onChange={(e) => setSelYear(Number(e.target.value))}>
                  {Array.from({ length: 8 }, (_, i) => 2023 + i).map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
              </div>
              <button className="rp-btn-refresh" onClick={() => fetchData(true)}>Tải dữ liệu mới nhất</button>
            </div>

            {/* Content Manager */}
            <div>
              <div className="rp-section-header">
                <label className="rp-label">Nội dung báo cáo</label>
                <button className="rp-link-btn" onClick={addGroup}>+ Thêm nhóm</button>
              </div>
              <div className="rp-sort-container">
                <div className="rp-sort-list">
                  {loading ? (<div className="rp-empty-msg">Đang tải danh sách...</div>) : reportItems.length === 0 ? (<div className="rp-empty-msg">Không có dữ liệu cho tháng này.</div>) : (
                    reportItems.map((item, idx) => (
                      <div key={item.id} className={`rp-sort-item ${item.isGroup ? "rp-sort-group" : ""} ${!item.reportInclude ? "rp-sort-excluded" : ""}`} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, idx)}>
                        <svg className="rp-grip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"/></svg>
                        <input type="checkbox" className="rp-checkbox" checked={item.reportInclude} onChange={() => toggleItem(idx)} />
                        <span className={`rp-item-title ${!item.reportInclude ? "rp-line-through" : ""}`} onClick={item.isGroup ? () => renameGroup(idx, item.title) : undefined} style={item.isGroup ? { cursor: "pointer" } : undefined}>{item.title}</span>
                        {item.isGroup && (<button className="rp-delete-btn" onClick={() => deleteGroup(idx)}>×</button>)}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <p className="rp-hint">Kéo thả để sắp xếp. Bỏ chọn để ẩn.</p>
            </div>

            {/* Configuration */}
            <div className="rp-config-section">
              <button className="rp-config-toggle" onClick={() => setConfigOpen(!configOpen)}>
                <span>Thông tin chung & Người ký</span>
                <svg className="rp-icon-sm" style={{ transform: configOpen ? "rotate(180deg)" : "rotate(0deg)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
              {configOpen && (
                <div className="rp-config-panel">
                  <input className="rp-input" placeholder="Tên đơn vị (dòng 1)" value={config.unit} onChange={(e) => updateConfig("unit", e.target.value)} />
                  <input className="rp-input" placeholder="Tên bộ phận (dòng 2)" value={config.dept} onChange={(e) => updateConfig("dept", e.target.value)} />
                  <input className="rp-input" placeholder="Kính gửi (Nơi nhận)" value={config.recipient} onChange={(e) => updateConfig("recipient", e.target.value)} />
                  <input className="rp-input" placeholder="Số hiệu văn bản (vd: BC-TV)" value={config.suffix} onChange={(e) => updateConfig("suffix", e.target.value)} />
                  <div className="rp-config-divider" />
                  <p className="rp-sub-label">Người ký duyệt</p>
                  <label className="rp-check-label"><input type="checkbox" checked={config.showApprover} onChange={(e) => updateConfig("showApprover", e.target.checked)} />Hiển thị người duyệt</label>
                  <input className="rp-input" placeholder="Chức danh duyệt" value={config.approverTitle} onChange={(e) => updateConfig("approverTitle", e.target.value)} />
                  <input className="rp-input" placeholder="Tên người duyệt" value={config.approverName} onChange={(e) => updateConfig("approverName", e.target.value)} />
                  <div className="rp-config-divider" />
                  <p className="rp-sub-label">Người lập</p>
                  <input className="rp-input" placeholder="Chức danh lập" value={config.creatorTitle} onChange={(e) => updateConfig("creatorTitle", e.target.value)} />
                  <input className="rp-input" placeholder="Tên người lập" value={config.creatorName} onChange={(e) => updateConfig("creatorName", e.target.value)} />
                </div>
              )}
            </div>

            {/* Suggestions */}
            <div className="rp-suggest-section">
              <div className="rp-section-header">
                <label className="rp-label">Đề xuất / Kiến nghị</label>
                <button className="rp-link-btn" onClick={generateSuggestions}>Gợi ý tự động</button>
              </div>
              <textarea className="rp-textarea" rows={4} placeholder="Nhập nội dung kiến nghị..." value={suggestions} onChange={(e) => setSuggestions(e.target.value)} />
            </div>
          </div>

          <div className="rp-panel-footer">
            <button className="rp-btn-print" onClick={handlePrint} type="button">
              <svg className="rp-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm7-8a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              In báo cáo
            </button>
          </div>
        </aside>

        {/* ═══ MAIN PREVIEW (Full width) ═══ */}
        <main className="rp-main">
          {/* Top toolbar */}
          <div className="rp-toolbar">
            <button className="rp-toolbar-btn" onClick={() => setPanelOpen(true)} type="button" title="Tùy chỉnh báo cáo">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
              <span>Tùy chỉnh</span>
            </button>
            <div className="rp-toolbar-right">
              <div className="rp-zoom-bar-inline">
                <svg className="rp-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" strokeWidth="2"/><path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35"/></svg>
                <input type="range" min="0.5" max="1.5" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="rp-zoom-slider-inline" />
                <span className="rp-zoom-pct">{Math.round(zoom * 100)}%</span>
              </div>
            </div>
          </div>

          {/* A4 Paper */}
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.2s ease" }}>
            <div className="rp-a4-paper">
              {loading ? (
                <div className="rp-skeleton"><div className="rp-skel-row"><div className="rp-skel-box rp-skel-sm"/><div className="rp-skel-box rp-skel-md"/></div><div className="rp-skel-box rp-skel-lg"/><div className="rp-skel-box rp-skel-full"/><div className="rp-skel-box rp-skel-full"/><div className="rp-skel-box rp-skel-full"/></div>
              ) : (
                <div className="rp-paper-content">
                  <div className="rp-paper-header">
                    <div className="rp-header-left"><p className="rp-header-unit">{config.unit}</p><p className="rp-header-dept">{config.dept}</p></div>
                    <div className="rp-header-right"><p className="rp-header-country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p><p className="rp-header-motto">Độc lập - Tự do - Hạnh phúc</p></div>
                  </div>
                  <div className="rp-paper-meta"><p>Số: {selMonth + 1}/{config.suffix}</p><p>Tp.HCM, ngày {now.getDate()} tháng {now.getMonth() + 1} năm {now.getFullYear()}</p></div>
                  <h1 className="rp-paper-title">BÁO CÁO CÔNG VIỆC THÁNG {selMonth + 1}/{selYear}</h1>
                  <p className="rp-paper-recipient">Kính gửi: {config.recipient}</p>
                  <div className="rp-paper-body">
                    <p className="rp-section-title">I. Nội dung chi tiết:</p>
                    <table className="rp-print-table"><thead><tr><th className="rp-th-stt">STT</th><th className="rp-th-desc">Nội dung công việc</th><th className="rp-th-date">Bắt đầu</th><th className="rp-th-date">Kết thúc</th><th className="rp-th-note">Ghi chú/Phối hợp</th></tr></thead><tbody>{previewRows}</tbody></table>
                    <p className="rp-section-title">II. Đề xuất/Kiến nghị:</p>
                    <div className="rp-suggest-text">{suggestions || "Không có."}</div>
                    <div className="rp-signatures">
                      <div className="rp-sig-block" style={{ visibility: config.showApprover ? "visible" : "hidden" }}><p className="rp-sig-title">{config.approverTitle}</p><p className="rp-sig-hint">(Ký, họ tên)</p><p className="rp-sig-name">{config.approverName}</p></div>
                      <div className="rp-sig-block"><p className="rp-sig-title">{config.creatorTitle}</p><p className="rp-sig-hint">(Ký, họ tên)</p><p className="rp-sig-name">{config.creatorName}</p></div>
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
        .rp-root { display: flex; height: calc(100vh - 1px); overflow: hidden; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f1f5f9; color: #0f172a; margin: -20px -24px -28px; position: relative; }

        /* ── Floating Panel ── */
        .rp-panel-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.3); z-index: 40; opacity: 0; pointer-events: none; transition: opacity 0.25s ease; }
        .rp-panel-overlay.rp-panel-open { opacity: 1; pointer-events: auto; }
        .rp-panel { position: fixed; top: 0; left: 0; bottom: 0; width: 400px; background: #fff; z-index: 50; box-shadow: 4px 0 24px rgba(0,0,0,0.12); display: flex; flex-direction: column; transform: translateX(-105%); transition: transform 0.3s cubic-bezier(0.16,1,0.3,1); }
        .rp-panel.rp-panel-open { transform: translateX(0); }
        .rp-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; flex-shrink: 0; }
        .rp-panel-title { font-size: 16px; font-weight: 700; color: #0f3d4f; }
        .rp-panel-close-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0; border: none; border-radius: 8px; background: transparent; color: #94a3b8; cursor: pointer; transition: background 0.15s, color 0.15s; }
        .rp-panel-close-btn:hover { background: #f1f5f9; color: #ef4444; }
        .rp-panel-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .rp-panel-body::-webkit-scrollbar { width: 6px; }
        .rp-panel-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        .rp-panel-footer { padding: 16px 20px; border-top: 1px solid #f1f5f9; flex-shrink: 0; }

        /* ── Toolbar ── */
        .rp-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: rgba(255,255,255,0.9); backdrop-filter: blur(8px); border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
        .rp-toolbar-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; color: #475569; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
        .rp-toolbar-btn:hover { background: #f8fafc; border-color: #0891b2; color: #0891b2; }
        .rp-toolbar-right { display: flex; align-items: center; gap: 12px; }
        .rp-zoom-bar-inline { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; }
        .rp-zoom-slider-inline { width: 80px; accent-color: #0891b2; cursor: pointer; }
        .rp-zoom-pct { font-size: 11px; font-weight: 700; color: #64748b; min-width: 36px; text-align: right; }

        /* ── Main ── */
        .rp-main { flex: 1; overflow-y: auto; background: #e2e8f0; display: flex; flex-direction: column; align-items: center; }
        .rp-main::-webkit-scrollbar { width: 6px; }
        .rp-main::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        .rp-a4-paper { width: 210mm; min-height: 297mm; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); margin: 20px auto; padding: 20mm; font-family: 'Times New Roman', serif; color: #000; }

        /* ── Cards & Shared ── */
        .rp-card { background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .rp-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 8px; }
        .rp-date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
        .rp-select { padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: #fff; outline: none; }
        .rp-select:focus { border-color: #0891b2; box-shadow: 0 0 0 2px rgba(8,145,178,0.15); }
        .rp-btn-refresh { width: 100%; padding: 8px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-weight: 500; color: #334155; cursor: pointer; transition: background 0.15s; }
        .rp-btn-refresh:hover { background: #f1f5f9; }
        .rp-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .rp-link-btn { background: none; border: none; color: #0891b2; font-size: 12px; font-weight: 600; cursor: pointer; }
        .rp-link-btn:hover { text-decoration: underline; }
        .rp-sort-container { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; }
        .rp-sort-list { max-height: 260px; overflow-y: auto; padding: 4px; }
        .rp-sort-list::-webkit-scrollbar { width: 6px; }
        .rp-sort-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        .rp-sort-item { display: flex; align-items: center; gap: 8px; padding: 8px; margin: 2px 0; border-radius: 8px; border: 1px solid #f1f5f9; font-size: 14px; color: #475569; cursor: grab; transition: background 0.15s; user-select: none; }
        .rp-sort-item:hover { background: #f8fafc; }
        .rp-sort-item:active { cursor: grabbing; }
        .rp-sort-group { background: #e2e8f0; border-color: #cbd5e1; font-weight: 700; color: #1e293b; margin-top: 8px; }
        .rp-sort-excluded { opacity: 0.5; }
        .rp-grip-icon { width: 16px; height: 16px; color: #94a3b8; flex-shrink: 0; }
        .rp-checkbox { width: 16px; height: 16px; accent-color: #0891b2; flex-shrink: 0; }
        .rp-item-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rp-line-through { text-decoration: line-through; }
        .rp-delete-btn { background: none; border: none; color: #f87171; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1; }
        .rp-delete-btn:hover { color: #ef4444; }
        .rp-hint { font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 4px; }
        .rp-sort-item.dragging { opacity: 0.5; background: #e0f2fe; border: 2px dashed #0891b2; }
        .rp-sort-item.drag-over { border-bottom: 2px solid #0891b2; }
        .rp-empty-msg { padding: 16px; text-align: center; color: #94a3b8; font-size: 13px; }
        .rp-config-section { border-top: 1px solid #f1f5f9; padding-top: 8px; }
        .rp-config-toggle { display: flex; align-items: center; justify-content: space-between; width: 100%; background: none; border: none; padding: 4px 0; font-size: 14px; font-weight: 600; color: #334155; cursor: pointer; }
        .rp-config-toggle:hover { color: #0891b2; }
        .rp-config-panel { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
        .rp-input { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box; }
        .rp-input:focus { border-color: #0891b2; box-shadow: 0 0 0 2px rgba(8,145,178,0.15); }
        .rp-config-divider { border-top: 1px solid #f1f5f9; margin: 4px 0; }
        .rp-sub-label { font-size: 12px; font-weight: 600; color: #64748b; }
        .rp-check-label { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #475569; }
        .rp-check-label input { accent-color: #0891b2; }
        .rp-suggest-section { border-top: 1px solid #f1f5f9; padding-top: 8px; }
        .rp-textarea { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; resize: vertical; outline: none; font-family: inherit; box-sizing: border-box; }
        .rp-textarea:focus { border-color: #0891b2; box-shadow: 0 0 0 2px rgba(8,145,178,0.15); }
        .rp-btn-print { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px 16px; background: #0891b2; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(8,145,178,0.25); transition: background 0.15s; }
        .rp-btn-print:hover { background: #0e7490; }

        /* ── Skeleton ── */
        .rp-skeleton { display: flex; flex-direction: column; gap: 24px; padding: 0; }
        .rp-skel-row { display: flex; justify-content: space-between; }
        .rp-skel-box { background: #e2e8f0; border-radius: 4px; height: 16px; }
        .rp-skel-sm { width: 128px; } .rp-skel-md { width: 160px; }
        .rp-skel-lg { width: 67%; height: 32px; margin: 32px auto 0; }
        .rp-skel-full { width: 100%; }

        /* ── Paper content ── */
        .rp-paper-content { font-size: 11pt; }
        .rp-paper-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .rp-header-left { text-align: center; } .rp-header-right { text-align: center; }
        .rp-header-unit { font-weight: 700; text-transform: uppercase; }
        .rp-header-dept { font-weight: 700; text-decoration: underline; }
        .rp-header-country { font-weight: 700; }
        .rp-header-motto { font-weight: 700; text-decoration: underline; }
        .rp-paper-meta { display: flex; justify-content: space-between; font-style: italic; margin-bottom: 24px; }
        .rp-paper-title { text-align: center; font-weight: 700; font-size: 14pt; margin-bottom: 8px; text-transform: uppercase; }
        .rp-paper-recipient { text-align: center; font-weight: 700; font-size: 12pt; margin-bottom: 24px; }
        .rp-paper-body { font-size: 12pt; }
        .rp-section-title { font-weight: 700; margin-bottom: 8px; }
        .rp-print-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 24px; font-size: 11pt; }
        .rp-print-table th { border: 1px solid #000; padding: 6px; background: #f3f4f6; font-weight: 700; }
        .rp-th-stt { width: 40px; text-align: center; } .rp-th-desc { text-align: left; }
        .rp-th-date { width: 96px; text-align: center; } .rp-th-note { width: 112px; text-align: left; }
        .rp-table-cell { border: 1px solid #000; padding: 6px; vertical-align: top; }
        .rp-group-cell { font-weight: 700; background: #f8fafc; text-align: left; }
        .rp-col-stt { text-align: center; } .rp-col-desc { text-align: justify; }
        .rp-desc-text { font-size: 10pt; margin-top: 4px; }
        .rp-col-date { text-align: center; font-size: 10pt; } .rp-col-note { text-align: center; font-size: 10pt; }
        .rp-suggest-text { white-space: pre-wrap; padding-left: 16px; margin-bottom: 32px; text-align: justify; }
        .rp-signatures { display: grid; grid-template-columns: 1fr 1fr; margin-top: 40px; }
        .rp-sig-block { text-align: center; } .rp-sig-title { font-weight: 700; }
        .rp-sig-hint { font-style: italic; margin-bottom: 64px; } .rp-sig-name { font-weight: 700; }
        .rp-icon-sm { width: 16px; height: 16px; }

        @media (max-width: 920px) {
          .rp-panel { width: 100%; }
          .rp-toolbar { padding: 8px 10px; }
        }
      `}</style>
    </>
  );
}