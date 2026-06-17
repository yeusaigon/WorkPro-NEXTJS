'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import Link from 'next/link';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

const quotes = [
  'Cách tốt nhất để bắt đầu là ngưng nói và hãy làm.',
  'Thành công không phải là chìa khóa của hạnh phúc. Hạnh phúc là chìa khóa của thành công.',
  'Hãy đặt mục tiêu cao và đừng dừng lại cho đến khi bạn đạt được nó.',
  'Một ngày làm việc hiệu quả bắt đầu từ một kế hoạch rõ ràng.',
  'Sự khác biệt giữa một người thành công và những người khác nằm ở ý chí.',
  'Hãy biến mỗi ngày thành kiệt tác của bạn.',
  'Chất lượng công việc của bạn quyết định chất lượng cuộc sống của bạn.',
];

export default function LoginPage() {
  useEffect(() => {
    const auth = getFirebaseAuth();
    const loader = document.getElementById('loader');
    const loginView = document.getElementById('login-view');
    const loginQuoteEl = document.getElementById('login-quote');
    const errorToast = document.getElementById('error-toast');
    const googleLoginBtn = document.getElementById('google-login-btn');

    const setupLoginQuote = () => {
      if (loginQuoteEl) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        loginQuoteEl.textContent = `"${quotes[randomIndex]}"`;
      }
    };

    const showLoginError = (message: string) => {
      if (!errorToast) return;
      errorToast.textContent = message;
      errorToast.classList.remove('hidden');
      window.setTimeout(() => errorToast.classList.add('hidden'), 3000);
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        window.location.href = '/admin/dashboard/';
      } else {
        loader?.classList.add('hidden');
        loginView?.classList.remove('hidden');
        setupLoginQuote();
      }
    });

    const provider = new GoogleAuthProvider();
    googleLoginBtn?.addEventListener('click', () => {
      signInWithPopup(auth, provider).catch((error) => {
        console.error('Login failed:', error);
        showLoginError('Đăng nhập thất bại. Vui lòng thử lại.');
      });
    });

    const year = new Date().getFullYear();
    const copyrightEl = document.getElementById('copyright-notice');
    if (copyrightEl) {
      copyrightEl.innerHTML = `&copy; ${year} Bản quyền thuộc về Phan Minh Trí. All Rights Reserved.`;
    }

    return () => unsubscribe();
  }, []);

  return (
    <>
      <style jsx global>{`
        html,
        body {
          font-family: 'Inter', sans-serif;
          background-color: #f1f5f9;
          -webkit-tap-highlight-color: transparent;
          overflow-x: hidden;
        }
        .main-bg::before,
        .main-bg::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          z-index: 0;
          filter: blur(80px);
          opacity: 0.25;
        }
        .main-bg::before {
          width: 300px;
          height: 300px;
          background-color: #0891b2;
          top: -50px;
          right: -100px;
        }
        .main-bg::after {
          width: 250px;
          height: 250px;
          background-color: #64748b;
          bottom: -80px;
          left: -80px;
        }
        .content-wrapper {
          position: relative;
          z-index: 1;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>

      <div className="text-a-dark min-h-screen">
        <div id="loader" className="fixed inset-0 flex items-center justify-center bg-a-light z-50">
          <div className="flex flex-col items-center">
            <Image src="/logo.svg" alt="aWorkPro Logo" width={80} height={80} priority className="rounded-full animate-pulse" />
            <p className="mt-4 text-a-primary-dark font-semibold">Đang tải...</p>
          </div>
        </div>

        <div id="login-view" className="min-h-screen flex flex-col items-center justify-center p-4 main-bg relative hidden">
          <div className="content-wrapper w-full max-w-sm">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/20 animate-fadeInUp">
              <div className="flex flex-col items-center text-center">
                <Image src="/logo.svg" alt="aWorkPro Logo" width={80} height={80} priority className="rounded-full" />
                <h1 className="text-3xl font-bold text-a-primary-dark mt-4">aWorkPro</h1>
                <p className="text-a-secondary mt-1 mb-8">Đăng nhập để bắt đầu quản lý công việc của bạn.</p>

                <button id="google-login-btn" className="w-full inline-flex items-center justify-center gap-3 bg-white px-6 py-3 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 transition-all transform hover:scale-105">
                  <svg className="w-6 h-6" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h12.8c-.57 2.82-2.29 5.22-4.83 6.88l7.98 6.19c4.63-4.28 7.3-10.43 7.3-17.03z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.98-6.19c-2.16 1.45-4.92 2.3-8.02 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                  <span>Tiếp tục với Google</span>
                </button>
                <Link href="/" className="mt-4 text-sm text-a-secondary hover:text-a-primary hover:underline">
                  Quay về trang chủ
                </Link>
              </div>
            </div>
            <p id="login-quote" className="mt-8 text-center text-a-secondary italic animate-fadeInUp" style={{ animationDelay: '0.2s' }} />
          </div>

          <footer className="absolute bottom-0 left-0 right-0 w-full p-4 md:p-6 text-xs text-slate-500">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between">
              <p id="copyright-notice" className="mb-2 sm:mb-0" />
              <div className="flex items-center gap-x-4 font-medium">
                <span className="hidden md:inline text-slate-400">AppsViet Projects:</span>
                <a href="https://www.appsviet.com/detail.html?id=BD7Ijp1NG6O1wNWL3RFc" target="_blank" className="hover:text-a-primary hover:underline">
                  Sổ Tay Coi Thi
                </a>
                <a href="https://www.appsviet.com/detail.html?id=iax2dFcwyOUHY5tG4vEd" target="_blank" className="hover:text-a-primary hover:underline">
                  LibConnect
                </a>
                <a href="https://www.appsviet.com/detail.html?id=vZ1GLejUjbUPcTFufpW3" target="_blank" className="hover:text-a-primary hover:underline">
                  Giáo Dục Định Hướng
                </a>
              </div>
            </div>
          </footer>
        </div>

        <div id="error-toast" className="hidden fixed bottom-5 right-5 bg-rose-600 text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300" />
      </div>
    </>
  );
}
