#!/bin/bash
set -e

echo "🔧 Vercel Node.js build düzeltme başlatıldı..."

# 1. pnpm kurulu değilse kur
if ! command -v pnpm &> /dev/null
then
    echo "📦 pnpm yüklü değil, yükleniyor..."
    npm install -g pnpm
fi

# 2. bağımlılıkları kur
echo "📥 Bağımlılıklar kuruluyor..."
pnpm install

# 3. build script varsa çalıştır
if pnpm run | grep -q "build"; then
    echo "🏗️ Build script çalıştırılıyor..."
    pnpm build
else
    echo "⚠️ package.json içinde build script bulunamadı, atlanıyor..."
fi

# 4. Vercel build
echo "🚀 Vercel build çalıştırılıyor..."
npx vercel build --prod

echo "✅ İşlem tamamlandı!"
