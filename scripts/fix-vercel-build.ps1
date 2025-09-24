# PowerShell version for Windows users
Write-Host "🔧 Vercel Node.js build düzeltme başlatıldı..." -ForegroundColor Green

# 1. Check if pnpm is installed
if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "📦 pnpm yüklü değil, yükleniyor..." -ForegroundColor Yellow
    npm install -g pnpm
}

# 2. Install dependencies
Write-Host "📥 Bağımlılıklar kuruluyor..." -ForegroundColor Blue
pnpm install

# 3. Run build script if exists
$buildExists = pnpm run | Select-String "build"
if ($buildExists) {
    Write-Host "🏗️ Build script çalıştırılıyor..." -ForegroundColor Blue
    pnpm build
} else {
    Write-Host "⚠️ package.json içinde build script bulunamadı, atlanıyor..." -ForegroundColor Yellow
}

# 4. Vercel build
Write-Host "🚀 Vercel build çalıştırılıyor..." -ForegroundColor Green
npx vercel build --prod

Write-Host "✅ İşlem tamamlandı!" -ForegroundColor Green
