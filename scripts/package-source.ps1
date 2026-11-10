$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$destination = Join-Path $workspace 'handoff'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$sourceFiles = @(git -C $workspace ls-files --cached --others --exclude-standard)
if ($LASTEXITCODE -ne 0 -or $sourceFiles.Count -eq 0) { throw 'Unable to enumerate the Git source manifest.' }
$sourceFiles = $sourceFiles | Sort-Object -Unique
foreach ($relative in $sourceFiles) {
    if ($relative -match '(^|/)(\.git|\.cache|node_modules|handoff|out)(/|$)' -or (($relative -match '(^|/)\.env') -and $relative -ne '.env.example')) {
        throw "Excluded material found in source manifest: $relative"
    }
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archivePath = Join-Path $destination 'SerbisyoGo-source.zip'
$stream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
try {
    foreach ($relative in $sourceFiles) {
        $absolute = [System.IO.Path]::GetFullPath((Join-Path $workspace $relative))
        if (-not $absolute.StartsWith($workspace + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Source path escaped workspace.' }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $absolute, $relative.Replace('\','/'), [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally {
    $archive.Dispose()
    $stream.Dispose()
}
$sourceFiles | Set-Content -LiteralPath (Join-Path $destination 'source-manifest.txt') -Encoding utf8
$checksum = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
"$checksum  SerbisyoGo-source.zip" | Set-Content -LiteralPath (Join-Path $destination 'SHA256SUMS.txt') -Encoding ascii
Write-Output "Prepared $($sourceFiles.Count) source files in $archivePath"
