$ErrorActionPreference = 'Stop'
$collectorData = Join-Path $env:LOCALAPPDATA 'Lumen\word-cloud'
New-Item -ItemType Directory -Force -Path $collectorData | Out-Null
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$framework = Split-Path $compiler
$readerExe = Join-Path $collectorData 'InputReader.exe'
$sourceFile = Join-Path $PSScriptRoot 'InputReader.cs'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 18+ is required. Install Node.js and retry.' }
& $compiler /nologo /target:exe /platform:x64 /optimize+ /out:$readerExe /r:System.dll /r:System.Core.dll /r:System.Web.Extensions.dll "/r:$framework\WPF\UIAutomationClient.dll" "/r:$framework\WPF\UIAutomationTypes.dll" "/r:$framework\WPF\WindowsBase.dll" $sourceFile
if ($LASTEXITCODE -ne 0) { throw 'Input reader compilation failed. Close any previous collector window and retry.' }
& node (Join-Path $PSScriptRoot 'server.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Collector exited with an error.' }
