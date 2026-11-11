$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$framework = Split-Path $compiler
$probeExe = Join-Path $env:TEMP 'LumenWordCloud-ReaderProbe.exe'
$reader = Join-Path $PSScriptRoot 'collector\InputReader.cs'
$probe = Join-Path $PSScriptRoot 'collector\ReaderProbe.cs'
& $compiler /nologo /target:exe /main:ReaderProbe /platform:x64 /out:$probeExe /r:System.dll /r:System.Core.dll /r:System.Web.Extensions.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll "/r:$framework\WPF\UIAutomationClient.dll" "/r:$framework\WPF\UIAutomationTypes.dll" "/r:$framework\WPF\WindowsBase.dll" $reader $probe
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $probeExe
exit $LASTEXITCODE
