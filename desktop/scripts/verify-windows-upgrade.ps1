param(
    [Parameter(Mandatory)][string]$PreviousExe,
    [Parameter(Mandatory)][string]$CandidateExe
)
$ErrorActionPreference = 'Stop'
$previous = (Resolve-Path -LiteralPath $PreviousExe).Path
$candidate = (Resolve-Path -LiteralPath $CandidateExe).Path
$root = Join-Path ([IO.Path]::GetTempPath()) ("contenox-windows-qa-" + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $root

function Test-Launch([string]$exe, [string]$profile, [string]$phase) {
    $roaming = Join-Path $profile 'AppData/Roaming'
    $local = Join-Path $profile 'AppData/Local'
    $null = New-Item -ItemType Directory -Path $roaming, $local -Force
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $exe
    $start.UseShellExecute = $false
    $start.WorkingDirectory = $profile
    foreach ($key in @('USERPROFILE', 'HOME')) { $start.Environment[$key] = $profile }
    $start.Environment['APPDATA'] = $roaming
    $start.Environment['LOCALAPPDATA'] = $local
    $start.Environment['CONTENOX_UPDATE_CHECK'] = 'false'
    $null = $start.Environment.Remove('CONTENOX_RUNTIME_BIN')
    $process = [Diagnostics.Process]::Start($start)
    try {
        $settings = Join-Path $roaming 'ContenoxHarness/workspace.json'
        $deadline = [datetime]::UtcNow.AddSeconds(90)
        $origin = $null
        while ([datetime]::UtcNow -lt $deadline) {
            $process.Refresh()
            if ($process.HasExited) { throw "$phase exited with $($process.ExitCode)" }
            if ($process.MainWindowTitle -and (Test-Path -LiteralPath $settings)) {
                try {
                    $port = (Get-Content -LiteralPath $settings -Raw | ConvertFrom-Json).uiPort
                    $url = "http://127.0.0.1:$port"
                    $page = Invoke-WebRequest "$url/" -TimeoutSec 2
                    $roots = (Invoke-RestMethod "$url/api/workspace/roots" -TimeoutSec 4).roots
                    $scratch = [IO.Path]::Combine($profile, 'Contenox Scratchpad')
                    if ($page.StatusCode -eq 200 -and $roots.path -contains $scratch) {
                        $origin = $url
                        break
                    }
                } catch { Start-Sleep -Milliseconds 150 }
            }
            Start-Sleep -Milliseconds 150
        }
        if (!$origin) { throw "$phase could not open the isolated workbench. See $settings" }
        if ($phase -in @('Previous','Clean')) {
            Invoke-RestMethod "$origin/api/cli-config" -Method Put -ContentType application/json -Body '{"default-think":"medium"}' | Out-Null
        }
        if ((Invoke-RestMethod "$origin/api/cli-config").defaultThink -ne 'medium') {
            throw "$phase lost the saved setting"
        }
        if ($phase -ne 'Previous') {
            $next = (Invoke-RestMethod "$origin/api/workspace/schedules/interval?every=1h").next
            if ([datetimeoffset]$next -le [datetimeoffset]::UtcNow) { throw "$phase returned an invalid interval" }
        }
        Write-Output "$phase passed ($($process.MainWindowTitle), $origin)"
    } finally {
        if (!$process.HasExited) {
            $null = $process.CloseMainWindow()
            if (!$process.WaitForExit(20000)) {
                $process.Kill($true)
                $process.WaitForExit()
                throw "$phase did not shut down normally"
            }
        }
        $process.Dispose()
    }
}

Write-Output "Windows qualification profiles: $root"
Test-Launch $candidate (Join-Path $root 'clean') 'Clean'
Test-Launch $candidate (Join-Path $root 'clean') 'Restart'
Test-Launch $previous (Join-Path $root 'upgrade') 'Previous'
Test-Launch $candidate (Join-Path $root 'upgrade') 'Upgrade'
