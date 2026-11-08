# Builds the Windows live-wallpaper host (WebView2 + .NET Framework).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File native/build-windows-host.ps1

$ErrorActionPreference = 'Stop'

$nativeDir = $PSScriptRoot
$root = Split-Path -Parent $nativeDir
Set-Location $root

$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) {
  throw 'csc.exe from .NET Framework 4.x was not found. Windows 10/11 normally includes it; make sure .NET Framework 4.8 is enabled.'
}

$sdkDir = Join-Path $nativeDir 'webview2'
$coreDll = Join-Path $sdkDir 'lib\net462\Microsoft.Web.WebView2.Core.dll'
$winFormsDll = Join-Path $sdkDir 'lib\net462\Microsoft.Web.WebView2.WinForms.dll'
$loaderDll = Join-Path $sdkDir 'runtimes\win-x64\native\WebView2Loader.dll'
$webViewVersion = '1.0.4314.35'

if (-not (Test-Path $coreDll) -or -not (Test-Path $winFormsDll) -or -not (Test-Path $loaderDll)) {
  Write-Host "[Lumen] Downloading WebView2 SDK $webViewVersion ..."
  $zip = Join-Path $env:TEMP "microsoft.web.webview2.$webViewVersion.zip"
  $url = "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$webViewVersion/microsoft.web.webview2.$webViewVersion.nupkg"
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  if (Test-Path $sdkDir) { Remove-Item $sdkDir -Recurse -Force }
  Expand-Archive -LiteralPath $zip -DestinationPath $sdkDir -Force
}

$binDir = Join-Path $nativeDir 'bin'
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

Copy-Item $coreDll (Join-Path $binDir 'Microsoft.Web.WebView2.Core.dll') -Force
Copy-Item $winFormsDll (Join-Path $binDir 'Microsoft.Web.WebView2.WinForms.dll') -Force
Copy-Item $loaderDll (Join-Path $binDir 'WebView2Loader.dll') -Force

$source = Join-Path $nativeDir 'LumenWallpaperHost.cs'
$output = Join-Path $binDir 'LumenWallpaperHost.exe'

Write-Host '[Lumen] Compiling LumenWallpaperHost.exe ...'
& $csc /nologo /target:winexe /platform:x64 /optimize+ /out:$output `
  /r:System.dll /r:System.Core.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll `
  /r:$coreDll /r:$winFormsDll $source

if ($LASTEXITCODE -ne 0) {
  throw "Compile failed with csc exit code $LASTEXITCODE"
}

Write-Host "[Lumen] Done: $output"
Get-ChildItem $binDir | Select-Object Name, Length | Format-Table -AutoSize
