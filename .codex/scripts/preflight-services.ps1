$ErrorActionPreference = "Continue"

function Get-DotEnvValues {
    param([string]$Path)

    $values = @{}
    if (-not (Test-Path -LiteralPath $Path)) {
        return $values
    }

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }
        $parts = $trimmed -split "=", 2
        if ($parts.Count -ne 2) {
            continue
        }
        $name = $parts[0].Trim()
        $value = ($parts[1] -split "#", 2)[0].Trim()
        if ($name) {
            $values[$name] = $value
        }
    }
    return $values
}

function Get-ConfigValue {
    param(
        [hashtable]$DotEnv,
        [string]$Name,
        [string]$Default
    )

    $envValue = [Environment]::GetEnvironmentVariable($Name)
    if ($envValue) {
        return ($envValue -split "#", 2)[0].Trim()
    }
    if ($DotEnv.ContainsKey($Name) -and $DotEnv[$Name]) {
        return $DotEnv[$Name]
    }
    return $Default
}

function Test-JsonEndpoint {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$Url
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
            Write-Host ("[preflight] OK   {0}: {1}" -f $Name, $Url)
            return $true
        }

        Write-Host ("[preflight] WARN {0}: HTTP {1} from {2}" -f $Name, $response.StatusCode, $Url)
        return $false
    }
    catch {
        Write-Host ("[preflight] FAIL {0}: {1}" -f $Name, $_.Exception.Message)
        return $false
    }
}

$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$dotEnv = Get-DotEnvValues -Path (Join-Path $workspaceRoot ".env")
$llmProvider = Get-ConfigValue -DotEnv $dotEnv -Name "LLM_PROVIDER" -Default "ollama"
$llmBaseUrl = Get-ConfigValue -DotEnv $dotEnv -Name "LLM_BASE_URL" -Default ""
$configuredLlmBaseUrl = $llmBaseUrl
$defaultLlmBaseUrl = if ($configuredLlmBaseUrl) { $configuredLlmBaseUrl } else { "" }

if ($llmProvider -eq "llama_cpp") {
    if (-not $defaultLlmBaseUrl) {
        $defaultLlmBaseUrl = "http://127.0.0.1:8080"
    }
    $llmBaseUrl = Get-ConfigValue -DotEnv $dotEnv -Name "LLAMA_CPP_BASE_URL" -Default $defaultLlmBaseUrl
    $llmHealthUrl = "$($llmBaseUrl.TrimEnd('/'))/health"
    $llmModelsUrl = "$($llmBaseUrl.TrimEnd('/'))/v1/models"
    $llmLabel = "llama.cpp wrapper"
} else {
    if (-not $defaultLlmBaseUrl) {
        $defaultLlmBaseUrl = "http://127.0.0.1:11434"
    }
    $llmBaseUrl = Get-ConfigValue -DotEnv $dotEnv -Name "OLLAMA_BASE_URL" -Default $defaultLlmBaseUrl
    $llmHealthUrl = "$($llmBaseUrl.TrimEnd('/'))/api/tags"
    $llmModelsUrl = $null
    $llmLabel = "Ollama"
}

$comfyBaseUrl = Get-ConfigValue -DotEnv $dotEnv -Name "COMFYUI_BASE_URL" -Default "http://127.0.0.1:8188"

Write-Host ("[preflight] Checking configured services for provider '{0}'..." -f $llmProvider)

$apiOk = Test-JsonEndpoint -Name "FastAPI health" -Url "http://127.0.0.1:8000/health"
$llmOk = Test-JsonEndpoint -Name $llmLabel -Url $llmHealthUrl
$llmModelsOk = $true
if ($llmModelsUrl) {
    $llmModelsOk = Test-JsonEndpoint -Name "$llmLabel models" -Url $llmModelsUrl
}
$comfyOk = Test-JsonEndpoint -Name "ComfyUI queue" -Url "$($comfyBaseUrl.TrimEnd('/'))/queue"

Write-Host ""
if ($apiOk -and $llmOk -and $llmModelsOk) {
    Write-Host "[preflight] Ready for text chat work."
} else {
    Write-Host ("[preflight] Start FastAPI and the configured {0} service before running chat flows." -f $llmLabel)
}

if (-not $comfyOk) {
    Write-Host "[preflight] ComfyUI is optional unless you are testing image generation."
}
