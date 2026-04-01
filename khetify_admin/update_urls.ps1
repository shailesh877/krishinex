# KrishiNex Admin - Global URL Update Script
# This script ensures all HTML files use the production API URL fallback.

$productionApi = "https://demo.ranx24.com/api"
$productionImage = "https://demo.ranx24.com"

Write-Host "🚀 Starting Global URL Update for KrishiNex..." -ForegroundColor Cyan

# Get all HTML files in the current directory and subdirectories
$htmlFiles = Get-ChildItem -Filter *.html -Recurse

foreach ($file in $htmlFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Gray
    $content = Get-Content $file.FullName -Raw

    # 1. Update existing API_BASE fallbacks
    $content = $content -replace "window\.API_BASE\s*\|\|\s*''", "window.API_BASE || '$productionApi'"
    $content = $content -replace "window\.API_BASE\s*\|\|\s*\"\"", "window.API_BASE || '$productionApi'"

    # 2. Add explicit config if script tag is missing but needed
    if ($content -like "*`${API_BASE}*" -and $content -notlike "*window.API_BASE =*") {
        # Inject at the top of the script tag
        $content = $content -replace "<script\s*src=`"js/auth\.js`"`s*></script>", "<script src=`"js/auth.js`"></script>`n  <script>window.API_BASE = '$productionApi'; window.IMAGE_BASE = '$productionImage';</script>"
    }

    # 3. Final safety: replace any direct ${API_BASE} calls with the fallback logic if not already done
    # (Matches ${API_BASE}/path and replaces with ${window.API_BASE || '...'}/path)
    $content = $content -replace '`\${API_BASE}', "`${window.API_BASE || '$productionApi'}"

    Set-Content $file.FullName $content -NoNewline
}

Write-Host "✅ All files updated! Please upload the contents and restart your server." -ForegroundColor Green
