'use client';

import { useState } from 'react';

const tabs = [
  { key: 'overview', label: 'Tổng quan', icon: ClockIcon },
  { key: 'contact', label: 'Liên hệ', icon: MailIcon },
  { key: 'roadmap', label: 'Roadmap', icon: RocketIcon },
];

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 4-10 7.5L2 4" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15c-2.5 0-4.5 2-4.5 4.5 0 0 2-1.5 4.5-1.5s4.5 1.5 4.5 1.5c0-2.5-2-4.5-4.5-4.5z" />
      <path d="M18 9c0-3.3-2.7-6-6-6S6 5.7 6 9c0 3 2 7 6 10 4-3 6-7 6-10z" />
      <circle cx="12" cy="9" r="2" />
    </svg>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="settings-page">
      {/* Hero banner */}
      <div className="settings-hero">
        <div className="settings-hero-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
            <path d="M12 8.25A3.75 3.75 0 1 0 12 15.75A3.75 3.75 0 1 0 12 8.25Z" />
            <path d="M19 12a7.1 7.1 0 0 0-.06-.96l1.57-1.23-1.6-2.77-1.9.64a7 7 0 0 0-1.67-.96l-.3-1.98h-3.2l-.3 1.98a7 7 0 0 0-1.67.96l-1.9-.64-1.6 2.77 1.57 1.23A7.1 7.1 0 0 0 5 12c0 .33.02.65.06.96L3.5 14.19l1.6 2.77 1.9-.64c.5.38 1.06.69 1.67.96l.3 1.98h3.2l.3-1.98c.61-.27 1.17-.58 1.67-.96l1.9.64 1.6-2.77-1.57-1.23c.04-.31.06-.63.06-.96Z" />
          </svg>
        </div>
        <div className="settings-hero-text">
          <h1 className="settings-hero-title">Cài đặt hệ thống</h1>
          <p className="settings-hero-sub">
            Quản lý tài khoản, tùy chỉnh ứng dụng và khám phá các tính năng sắp ra mắt.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="settings-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`settings-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="settings-panels">
        {activeTab === 'overview' && (
          <div className="settings-panel">
            {/* Dev notice */}
            <div className="settings-dev-notice">
              <div className="settings-dev-clock">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6v6l4 2" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <div>
                <p className="settings-dev-text">
                  Tính năng <strong>Cài đặt</strong> đang trong quá trình phát triển
                </p>
                <p className="settings-dev-sub">
                  Đội ngũ AppsViet đang hoàn thiện các tính năng cá nhân hóa. Vui lòng quay lại sau.
                </p>
              </div>
            </div>

            {/* Feature preview cards */}
            <div className="settings-feature-grid">
              <div className="settings-feature-card">
                <div className="settings-feature-icon settings-fi-theme">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a10 10 0 0 1 0 20" />
                    <path d="M12 2C8 6 8 18 12 22" />
                  </svg>
                </div>
                <div className="settings-feature-body">
                  <span className="settings-feature-title">Giao diện</span>
                  <span className="settings-feature-desc">Dark Mode, bảng màu tùy chỉnh</span>
                </div>
                <span className="settings-badge settings-badge-ready">Sẵn sàng</span>
              </div>

              <div className="settings-feature-card">
                <div className="settings-feature-icon settings-fi-cat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </div>
                <div className="settings-feature-body">
                  <span className="settings-feature-title">Danh mục</span>
                  <span className="settings-feature-desc">Phân loại công việc thông minh</span>
                </div>
                <span className="settings-badge settings-badge-ready">Sẵn sàng</span>
              </div>

              <div className="settings-feature-card">
                <div className="settings-feature-icon settings-fi-sync">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2v6h-6" />
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                    <path d="M3 22v-6h6" />
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  </svg>
                </div>
                <div className="settings-feature-body">
                  <span className="settings-feature-title">Đồng bộ</span>
                  <span className="settings-feature-desc">Đa thiết bị, real-time</span>
                </div>
                <span className="settings-badge settings-badge-dev">Phát triển</span>
              </div>

              <div className="settings-feature-card">
                <div className="settings-feature-icon settings-fi-export">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div className="settings-feature-body">
                  <span className="settings-feature-title">Xuất báo cáo</span>
                  <span className="settings-feature-desc">PDF, Excel chuyên nghiệp</span>
                </div>
                <span className="settings-badge settings-badge-dev">Phát triển</span>
              </div>

              <div className="settings-feature-card">
                <div className="settings-feature-icon settings-fi-notif">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div className="settings-feature-body">
                  <span className="settings-feature-title">Thông báo</span>
                  <span className="settings-feature-desc">Nhắc việc qua email, Zalo</span>
                </div>
                <span className="settings-badge settings-badge-dev">Phát triển</span>
              </div>

              <div className="settings-feature-card">
                <div className="settings-feature-icon settings-fi-api">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <div className="settings-feature-body">
                  <span className="settings-feature-title">API tích hợp</span>
                  <span className="settings-feature-desc">Webhook, Google Calendar</span>
                </div>
                <span className="settings-badge settings-badge-dev">Phát triển</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="settings-panel">
            <div className="settings-contact-hero">
              <div className="settings-contact-hero-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div>
                <h2 className="settings-contact-hero-title">Bạn cần hỗ trợ?</h2>
                <p className="settings-contact-hero-sub">
                  Đội ngũ AppsViet luôn sẵn sàng lắng nghe và phát triển theo nhu cầu của bạn.
                </p>
              </div>
            </div>

            <div className="settings-contact-2col">
              <a
                href="mailto:vietnam.tri@gmail.com"
                className="settings-contact-card-large"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="settings-cl-icon-wrap settings-cl-email">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 4-10 7.5L2 4" />
                  </svg>
                </div>
                <div className="settings-cl-body">
                  <span className="settings-cl-label">Email hỗ trợ</span>
                  <span className="settings-cl-value">vietnam.tri@gmail.com</span>
                  <span className="settings-cl-hint">Phản hồi trong 24h</span>
                </div>
                <svg className="settings-cl-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </a>

              <a
                href="https://zalo.me/0919898933"
                className="settings-contact-card-large"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="settings-cl-icon-wrap settings-cl-zalo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div className="settings-cl-body">
                  <span className="settings-cl-label">Zalo</span>
                  <span className="settings-cl-value">0919 898 933</span>
                  <span className="settings-cl-hint">Nhắn tin trực tiếp</span>
                </div>
                <svg className="settings-cl-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </a>
            </div>

            <div className="settings-feedback-box">
              <span className="settings-feedback-emoji">💡</span>
              <span>Góp ý tính năng bạn mong muốn — đội ngũ AppsViet sẽ ưu tiên phát triển.</span>
            </div>
          </div>
        )}

        {activeTab === 'roadmap' && (
          <div className="settings-panel">
            <div className="settings-roadmap-timeline">
              <div className="settings-timeline-item done">
                <div className="settings-timeline-dot" />
                <div className="settings-timeline-content">
                  <span className="settings-timeline-phase">v1.0 — Đã hoàn thành</span>
                  <h3 className="settings-timeline-title">Giao diện người dùng</h3>
                  <p className="settings-timeline-desc">Dark Mode, bảng màu tùy chỉnh, responsive hoàn chỉnh.</p>
                </div>
              </div>

              <div className="settings-timeline-item done">
                <div className="settings-timeline-dot" />
                <div className="settings-timeline-content">
                  <span className="settings-timeline-phase">v1.0 — Đã hoàn thành</span>
                  <h3 className="settings-timeline-title">Quản lý danh mục</h3>
                  <p className="settings-timeline-desc">Phân loại công việc theo danh mục, tag, ưu tiên thông minh.</p>
                </div>
              </div>

              <div className="settings-timeline-item progress">
                <div className="settings-timeline-dot" />
                <div className="settings-timeline-content">
                  <span className="settings-timeline-phase">v1.5 — Đang phát triển</span>
                  <h3 className="settings-timeline-title">Đồng bộ đa thiết bị</h3>
                  <p className="settings-timeline-desc">Dữ liệu real-time trên web, mobile, tablet qua Firestore.</p>
                </div>
              </div>

              <div className="settings-timeline-item planned">
                <div className="settings-timeline-dot" />
                <div className="settings-timeline-content">
                  <span className="settings-timeline-phase">v2.0 — Kế hoạch</span>
                  <h3 className="settings-timeline-title">Xuất báo cáo PDF/Excel</h3>
                  <p className="settings-timeline-desc">Tạo báo cáo chuyên nghiệp, biểu đồ trực quan, tải xuống 1 chạm.</p>
                </div>
              </div>

              <div className="settings-timeline-item planned">
                <div className="settings-timeline-dot" />
                <div className="settings-timeline-content">
                  <span className="settings-timeline-phase">v2.0 — Kế hoạch</span>
                  <h3 className="settings-timeline-title">Thông báo thông minh</h3>
                  <p className="settings-timeline-desc">Nhắc việc qua email, Zalo; cảnh báo deadline; nhắc định kỳ.</p>
                </div>
              </div>

              <div className="settings-timeline-item planned">
                <div className="settings-timeline-dot" />
                <div className="settings-timeline-content">
                  <span className="settings-timeline-phase">v2.5 — Kế hoạch</span>
                  <h3 className="settings-timeline-title">API & Tích hợp</h3>
                  <p className="settings-timeline-desc">Webhook, Google Calendar, Slack, Telegram — kết nối mọi nơi.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}