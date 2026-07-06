#!/bin/bash
echo "📦 Menginstall dependencies untuk BOT WANGZ..."
npm install --legacy-peer-deps
if [ $? -eq 0 ]; then
    echo "✅ Instalasi selesai! Jalankan bot dengan: ./run.sh"
else
    echo "❌ Instalasi gagal. Coba lagi."
    exit 1
fi
