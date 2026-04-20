param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
$target = Resolve-Path -LiteralPath $FilePath -ErrorAction Stop
$absPath = $target.Path
$ext = [System.IO.Path]::GetExtension($absPath).ToLowerInvariant()

function Get-PythonExe {
    $venvPython = Join-Path $repoRoot ".venv\\Scripts\\python.exe"
    if (Test-Path $venvPython) {
        return $venvPython
    }
    return "python"
}

if ($ext -eq ".py") {
    $pythonExe = Get-PythonExe

    Write-Host "[check-file] Formatting Python with black: $absPath"
    & $pythonExe -m black --quiet -- "$absPath"

    Write-Host "[check-file] Linting Python with ruff: $absPath"
    & $pythonExe -m ruff check "$absPath"
    exit $LASTEXITCODE
}

$jsLike = @(".js", ".jsx", ".ts", ".tsx")
if ($jsLike -contains $ext) {
    $prettier = Join-Path $repoRoot "frontend\\node_modules\\.bin\\prettier.cmd"
    $eslint = Join-Path $repoRoot "frontend\\node_modules\\.bin\\eslint.cmd"

    if (Test-Path $prettier) {
        Write-Host "[check-file] Formatting JS/TS with Prettier: $absPath"
        & $prettier --write "$absPath"
    } else {
        Write-Host "[check-file] Skipping Prettier (frontend dependencies not installed)."
    }

    if (Test-Path $eslint) {
        Write-Host "[check-file] Linting JS/TS with ESLint: $absPath"
        & $eslint "$absPath"
        exit $LASTEXITCODE
    }

    Write-Host "[check-file] Skipping ESLint (frontend dependencies not installed)."
    exit 0
}

Write-Host "[check-file] No formatter/linter configured for extension '$ext'."
exit 0
