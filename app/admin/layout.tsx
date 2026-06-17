"use client";

import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';

/* ─── Types ─── */

type NavItem = {
  href: string;
  label: string;
  icon: () => React.JSX.Element;
  badgeKey?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

/* ─── Data ─── */

const navGroups: NavGroup[] = [
  {
    title: 'Điều hướng',
    items: [
      { href: '/', label: 'Về trang chủ', icon: HomeIcon },
      { href: '/admin/', label: 'Tổng quan', icon: DashboardIcon, badgeKey: 'doing' },
    ],
  },
  {
    title: 'Công việc',
    items: [
      { href: '/admin/journal/', label: 'Nhật ký', icon: JournalIcon, badgeKey: 'completed' },
      { href: '/admin/templates/', label: 'Định kỳ', icon: RepeatIcon, badgeKey: 'templates' },
    ],
  },
  {
    title: 'Phân tích',
    items: [
      { href: '/admin/report/', label: 'Báo cáo tháng', icon: ReportIcon },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { href: '/admin/settings/', label: 'Cài đặt', icon: SettingsIcon },
    ],
  },
];

const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

/* ─── Icons ─── */

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4l-8 7h3v8h4v-5h2v5h4v-8h3l-8-7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13 5.5A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4A1.5 1.5 0 0 1 18.5 11h-4A1.5 1.5 0 0 1 13 9.5v-4Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 14.5A1.5 1.5 0 0 1 5.5 13h4A1.5 1.5 0 0 1 11 14.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13 14.5A1.5 1.5 0 0 1 14.5 13h4A1.5 1.5 0 0 1 20 14.5v4A1.5 1.5 0 0 1 18.5 20h-4A1.5 1.5 0 0 1 13 18.5v-4Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function JournalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4.5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 7h10l-2-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17H7l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 7a5 5 0 0 1 0 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 17a5 5 0 0 1 0-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 8.25A3.75 3.75 0 1 0 12 15.75A3.75 3.75 0 1 0 12 8.25Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19 12a7.1 7.1 0 0 0-.06-.96l1.57-1.23-1.6-2.77-1.9.64a7 7 0 0 0-1.67-.96l-.3-1.98h-3.2l-.3 1.98a7 7 0 0 0-1.67.96l-1.9-.64-1.6 2.77 1.57 1.23A7.1 7.1 0 0 0 5 12c0 .33.02.65.06.96L3.5 14.19l1.6 2.77 1.9-.64c.5.38 1.06.69 1.67.96l.3 1.98h3.2l.3-1.98c.61-.27 1.17-.58 1.67-.96l1.9.64 1.6-2.77-1.57-1.23c.04-.31.06-.63.06-.96Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4.75h7l4 4v10.5A1.75 1.75 0 0 1 16.25 21h-9.5A1.75 1.75 0 0 1 5 19.25V6.5A1.75 1.75 0 0 1 6.75 4.75Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 4.75V9h4.25" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.5 13h7M8.5 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m11 7-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m13 7 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Component ─── */

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = pathname.replace(/\/+$/, '') || '/';
  const [userLabel, setUserLabel] = useState('Đang tải...');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ─── Badge counts from Firestore ─── */

  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const auth = getFirebaseAuth();
    const offAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const db = getFirebaseDb();
      const tasksCol = collection(db, 'users', user.uid, 'tasks');

      // Doing count
      const qDoing = query(tasksCol, where('status', '==', 'doing'));
      const offDoing = onSnapshot(qDoing, (snap) => {
        setBadgeCounts((prev) => ({ ...prev, doing: snap.size }));
      });

      // Completed count (today + past)
      const qCompleted = query(tasksCol, where('status', '==', 'completed'));
      const offCompleted = onSnapshot(qCompleted, (snap) => {
        setBadgeCounts((prev) => ({ ...prev, completed: snap.size }));
      });

      // Templates count (recurring templates)
      const templatesCol = collection(db, 'users', user.uid, 'templates');
      const offTemplates = onSnapshot(templatesCol, (snap) => {
        setBadgeCounts((prev) => ({ ...prev, templates: snap.size }));
      });

      return () => {
        offDoing();
        offCompleted();
        offTemplates();
      };
    });
    return () => offAuth();
  }, []);

  /* ─── Filtered search items ─── */

  const filteredNavItems = useMemo(() => {
    if (!searchTerm.trim()) return navItems;
    const term = searchTerm.toLowerCase();
    return navItems.filter(
      (n) =>
        n.label.toLowerCase().includes(term) ||
        n.href.toLowerCase().includes(term),
    );
  }, [searchTerm]);

  /* ─── Other side-effects ─── */

  const pageTitle = useMemo(() => {
    const item = navItems.find((n) => {
      const target = n.href.replace(/\/+$/, '') || '/';
      if (target === '/admin') return currentPath === target;
      return currentPath === target || currentPath.startsWith(`${target}/`);
    });
    return item?.label || '';
  }, [currentPath]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (user) => {
      setUserLabel(user?.displayName ? `Chào ${user.displayName}!` : 'Chào bạn!');
    });
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  /* ─── Keyboard shortcuts ─── */

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchTerm('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isActive = useCallback(
    (href: string) => {
      const target = href.replace(/\/+$/, '') || '/';
      if (target === '/admin') return currentPath === target;
      return currentPath === target || currentPath.startsWith(`${target}/`);
    },
    [currentPath],
  );

  const handleSearchSelect = useCallback(
    (href: string) => {
      setSearchOpen(false);
      setSearchTerm('');
      setMobileNavOpen(false);
      router.push(href);
    },
    [router],
  );

  /* ─── Collapse sidebar on desktop only ─── */

  const isDesktopCollapsed = sidebarCollapsed && typeof window !== 'undefined' && window.innerWidth > 920;

  /* ─── Render ─── */

  return (
    <div className={`admin-shell${isDesktopCollapsed ? ' sidebar-collapsed' : ''}`}>
      <div
        className={`admin-mobile-overlay${mobileNavOpen ? ' open' : ''}`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      <aside className={`admin-sidebar${mobileNavOpen ? ' open' : ''}${isDesktopCollapsed ? ' collapsed' : ''}`} aria-label="Điều hướng admin">
        <div className="admin-sidebar-inner">
          <div className="admin-mobile-drawer-head">
            <span className="admin-mobile-drawer-title">Menu</span>
            <button
              type="button"
              className="admin-mobile-close-button"
              aria-label="Đóng menu"
              onClick={() => setMobileNavOpen(false)}
            >
              <span />
              <span />
            </button>
          </div>

          <div className="admin-brand-block">
            <Link href="/" className="admin-brand" aria-label="aWorkPro Home">
              <span className="admin-brand-mark">
                <Image src="/logo.svg" alt="" width={24} height={24} priority />
              </span>
              <span className="admin-brand-copy">
                <span className="admin-brand-title">aWorkPro</span>
                <span className="admin-brand-greeting">{userLabel}</span>
              </span>
            </Link>

            {!isDesktopCollapsed && (
              <button
                type="button"
                className="admin-signout-button"
                onClick={async () => {
                  await signOut(getFirebaseAuth());
                  window.location.href = '/login/';
                }}
              >
                Đăng xuất
              </button>
            )}
          </div>

          {/* Quick search trigger */}
          {!isDesktopCollapsed && (
            <button
              type="button"
              className="admin-nav-search-trigger"
              onClick={() => setSearchOpen(true)}
              aria-label="Tìm kiếm nhanh"
            >
              <SearchIcon />
              <span className="admin-nav-search-placeholder">Tìm nhanh...</span>
              <kbd className="admin-nav-search-kbd">⌘K</kbd>
            </button>
          )}

          {/* Search overlay */}
          {searchOpen && (
            <div className="admin-nav-search-overlay" onClick={() => { setSearchOpen(false); setSearchTerm(''); }}>
              <div className="admin-nav-search-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="admin-nav-search-input-wrap">
                  <SearchIcon />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="admin-nav-search-input"
                    placeholder="Tìm trang, tính năng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchOpen(false);
                        setSearchTerm('');
                      }
                      if (e.key === 'Enter' && filteredNavItems.length === 1) {
                        handleSearchSelect(filteredNavItems[0].href);
                      }
                    }}
                  />
                  <kbd className="admin-nav-search-kbd">esc</kbd>
                </div>
                <div className="admin-nav-search-results">
                  {filteredNavItems.length === 0 && (
                    <div className="admin-nav-search-empty">Không tìm thấy kết quả</div>
                  )}
                  {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <button
                        key={item.href}
                        type="button"
                        className={`admin-nav-search-result${active ? ' active' : ''}`}
                        onClick={() => handleSearchSelect(item.href)}
                      >
                        <span className="admin-nav-search-result-icon"><Icon /></span>
                        <span className="admin-nav-search-result-label">{item.label}</span>
                        <span className="admin-nav-search-result-href">{item.href}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <nav className="admin-nav">
            {navGroups.map((group) => (
              <div key={group.title} className="admin-nav-group">
                {!isDesktopCollapsed && (
                  <div className="admin-nav-group-title">{group.title}</div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : undefined;
                  const showBadge = badgeCount !== undefined && badgeCount > 0;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`admin-nav-item${active ? ' active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setMobileNavOpen(false)}
                      title={isDesktopCollapsed ? item.label : undefined}
                    >
                      <span className="admin-nav-item-icon">
                        <Icon />
                        {isDesktopCollapsed && showBadge && (
                          <span className="admin-nav-badge admin-nav-badge-dot" />
                        )}
                      </span>
                      <span className="admin-nav-item-label">{item.label}</span>
                      {!isDesktopCollapsed && showBadge && (
                        <span className="admin-nav-badge">{badgeCount}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Collapse toggle */}
          <button
            type="button"
            className="admin-sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            title={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {sidebarCollapsed ? <ExpandIcon /> : <CollapseIcon />}
            {!isDesktopCollapsed && <span>Thu gọn</span>}
          </button>

          {!isDesktopCollapsed && (
            <div className="admin-sidebar-footer">
              <span className="admin-sidebar-footer-copy">
                &copy; {new Date().getFullYear()} Bản quyền thuộc về Phan Minh Trí. All Rights Reserved.
              </span>
              <span className="admin-sidebar-footer-by">
                Phát triển bởi AppsViet Projects
              </span>
            </div>
          )}
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-mobile-topbar">
          <button
            type="button"
            className="admin-mobile-menu-button"
            aria-label={mobileNavOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>

          <Link href="/" className="admin-mobile-brand" aria-label="Về trang chủ">
            <span className="admin-mobile-brand-mark">
              <Image src="/logo.svg" alt="" width={20} height={20} priority />
            </span>
            <span className="admin-mobile-brand-copy">
              <span className="admin-mobile-brand-title">aWorkPro</span>
            </span>
          </Link>

          {pageTitle && (
            <span className="admin-mobile-page-title">{pageTitle}</span>
          )}
        </header>

        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}