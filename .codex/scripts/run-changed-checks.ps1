param(
    [switch]$Staged
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
Push-Location $repoRoot

try {
    if ($Staged) {
        $files = git diff --name-only --cached
    } else {
        $files = git diff --name-only
    }

    if (-not $files) {
        Write-Host "[run-changed-checks] No changed files found."
        exit 0
    }

    $checker = Join-Path $PSScriptRoot "check-file.ps1"
    $hadFailure = $false

    foreach ($relativePath in $files) {
        if ([string]::IsNullOrWhiteSpace($relativePath)) {
            continue
        }

        $absPath = Join-Path $repoRoot $relativePath
        if (-not (Test-Path -LiteralPath $absPath)) {
            continue
        }

        Write-Host ""
        Write-Host "[run-changed-checks] Checking: $relativePath"
        & $checker -FilePath $absPath
        if ($LASTEXITCODE -ne 0) {
            $hadFailure = $true
        }
    }

    if ($hadFailure) {
        Write-Host ""
        Write-Host "[run-changed-checks] One or more file checks failed."
        exit 1
    }

    Write-Host ""
    Write-Host "[run-changed-checks] All applicable checks completed successfully."
    exit 0
}
finally {
    Pop-Location
}
