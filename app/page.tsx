'use client';

import './page.css';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [year] = useState(new Date().getFullYear());

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => signOut(getFirebaseAuth());

  return (
    <div className="landing-root">
      {/* ─── Navigation ─── */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-brand">
            <Image src="/logo.svg" alt="aWorkPro" width={36} height={36} priority className="landing-logo" />
            <span className="landing-brand-name">aWorkPro</span>
          </div>

          <div className="landing-header-actions">
            {user ? (
              <div className="landing-user-pill">
                <img
                  src={user.photoURL || undefined}
                  alt=""
                  className="landing-avatar"
                  referrerPolicy="no-referrer"
                />
                <span className="landing-user-name">{user.displayName || 'Người dùng'}</span>
                <button onClick={handleLogout} className="landing-logout-btn">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1"/></svg>
                </button>
              </div>
            ) : (
              <a href="/login/" className="landing-nav-login">Đăng nhập</a>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="landing-hero">
        <div className="landing-hero-glow" />
        <div className="landing-hero-grid" />
        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <span className="landing-hero-badge-dot" />
            Nền tảng quản lý công việc thế hệ mới
          </div>
          <h1 className="landing-hero-title">
            Làm việc thông minh hơn,<br />
            <span className="landing-hero-title-accent">không vất vả hơn.</span>
          </h1>
          <p className="landing-hero-sub">
            aWorkPro giúp bạn và đội nhóm sắp xếp công việc, theo dõi tiến độ và hoàn thành mục tiêu — tất cả trong một không gian làm việc tinh gọn, trực quan.
          </p>
          <div className="landing-hero-cta-group">
            <a href={user ? '/admin/dashboard/' : '/login/'} className="landing-btn-primary">
              {user ? 'Vào khu vực làm việc' : 'Bắt đầu miễn phí'}
            </a>
            <a href="#features" className="landing-btn-ghost">
              Khám phá tính năng
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="landing-features">
        <div className="landing-section-head">
          <h2 className="landing-section-title">Thiết kế cho hiệu suất</h2>
          <p className="landing-section-sub">Mọi công cụ bạn cần, gói gọn trong một nền tảng duy nhất.</p>
        </div>

        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="landing-feature-title">Quản lý trực quan</h3>
            <p className="landing-feature-desc">Kéo thả, sắp xếp và theo dõi công việc trên giao diện Kanban hiện đại, dễ sử dụng.</p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 className="landing-feature-title">Báo cáo chuyên nghiệp</h3>
            <p className="landing-feature-desc">Tự động tạo báo cáo chuẩn hành chính, sẵn sàng in ấn chỉ với một cú nhấp.</p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
            </div>
            <h3 className="landing-feature-title">Thông báo thông minh</h3>
            <p className="landing-feature-desc">Nhận cảnh báo deadline, nhắc việc đúng lúc để không bỏ lỡ bất kỳ nhiệm vụ quan trọng nào.</p>
          </div>
        </div>
      </section>

      {/* ─── Trust Banner ─── */}
      <section className="landing-trust">
        <div className="landing-trust-inner">
          <div className="landing-trust-stat">
            <span className="landing-trust-number">100%</span>
            <span className="landing-trust-label">Miễn phí sử dụng</span>
          </div>
          <div className="landing-trust-divider" />
          <div className="landing-trust-stat">
            <span className="landing-trust-number">24/7</span>
            <span className="landing-trust-label">Đồng bộ dữ liệu</span>
          </div>
          <div className="landing-trust-divider" />
          <div className="landing-trust-stat">
            <span className="landing-trust-number">Bảo mật</span>
            <span className="landing-trust-label">Dữ liệu mã hóa</span>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <Image src="/logo.svg" alt="aWorkPro" width={28} height={28} className="landing-logo" />
            <span className="landing-footer-brand-name">aWorkPro</span>
          </div>
          <p className="landing-footer-copy">
            &copy; {year} Bản quyền thuộc về Phan Minh Trí. All Rights Reserved.
          </p>
          <p className="landing-footer-by">
            Phát triển bởi{' '}
            <a href="https://www.appsviet.com/" target="_blank" rel="noopener noreferrer">
              AppsViet Projects
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}