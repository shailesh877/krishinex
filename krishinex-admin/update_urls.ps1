# KrishiNex Admin - CLEAN Global Fix Script
# This script ensures all HTML files load the latest 'js/auth.js' with Cache-Busting.

Write-Host "🚀 Starting CLEAN Global Fix for KrishiNex..." -ForegroundColor Cyan

# Get all HTML files in the current directory and subdirectories
$htmlFiles = Get-ChildItem -Filter *.html -Recurse

# A simple version number to force browser to refresh auth.js
$v = "1.0.1"

foreach ($file in $htmlFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Gray
    $content = Get-Content $file.FullName -Raw

    # 1. REMOVE any previous hardcoded fallbacks (Cleaning up my earlier fix)
    $content = $content -replace "\s*// Fallback for API Base if auth\.js fails to load\n\s*const apiBase = window\.API_BASE \|\| 'https://demo\.ranx24\.com/api';", ""
    $content = $content -replace "window\.API_BASE \|\| 'https://demo\.ranx24\.com/api'", "API_BASE"
    $content = $content -replace "const apiBase = API_BASE;", "" # Removing extra variables if any

    # 2. UPDATE <script> tag with Cache-Buster
    # This ensures the browser doesn't use an old cached version of auth.js
    $content = $content -replace '<script\s*src=["'']js/auth\.js(\?v=[\d\.]+)?["'']\s*></script>', "<script src=`"js/auth.js?v=$v`"></script>"

    Set-Content $file.FullName $content -NoNewline
}
Write-Host "✅ All files cleaned and updated with Cache-Busting version $v!" -ForegroundColor Green
Write-Host "💡 Now upload the HTML files to krishinex.com/khetify_admin/" -ForegroundColor White
