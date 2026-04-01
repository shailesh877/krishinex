# update_urls.ps1 - Global URL Update & Refactor for Admin Panel (Fixed)
$targetDir = "d:\khetify\khetify_admin"
$newUrl = "https://demo.ranx24.com"
$newApiUrl = "https://demo.ranx24.com/api"

$htmlFiles = Get-ChildItem -Path $targetDir -Filter "*.html" -Recurse

foreach ($file in $htmlFiles) {
    Write-Host "Processing $($file.FullName)..."
    $content = Get-Content $file.FullName -Raw

    # 1. Remove hardcoded API_BASE and IMAGE_BASE definitions
    # Using simpler replacement without complex regex to avoid PS parser issues
    $content = $content -replace "const API_BASE = 'http://192.168.1.10:5500/api';", ""
    $content = $content -replace "const IMAGE_BASE = 'http://192.168.1.10:5500';", ""
    $content = $content -replace "const API_BASE = 'http://192.168.1.15:5500/api';", ""
    $content = $content -replace "const IMAGE_BASE = 'http://192.168.1.15:5500';", ""
    
    # 2. Add auth.js if missing
    if ($content -notmatch "js/auth.js") {
        if ($content -match "<head>") {
            $content = $content -replace "<head>", "<head>`r`n    <script src=`"js/auth.js`"></script>"
            Write-Host "  Added js/auth.js to $($file.Name)"
        }
    }

    # 3. Global safety sweep for any remaining old IP strings
    $content = $content -replace "http://192.168.1.10:5500/api", $newApiUrl
    $content = $content -replace "http://192.168.1.10:5500", $newUrl
    $content = $content -replace "http://192.168.1.15:5500/api", $newApiUrl
    $content = $content -replace "http://192.168.1.15:5500", $newUrl

    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "Global URL update complete for Admin Panel!"
