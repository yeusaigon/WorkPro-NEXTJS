#!/bin/bash
# Di chuyển vào thư mục chứa file script này
cd "$(dirname "$0")"

echo "========================================="
echo "  Đang khởi động ThaiKyPro (Dev Mode)... "
echo "========================================="
echo ""

# Chạy dự án
npm run dev
