# watchdog.ps1
# Watchdog de encerramento seguro para Windows
# Uso recomendado:
#   powershell -ExecutionPolicy Bypass -File .\watchdog.ps1
#
# Por padrão:
# - espera 10 minutos de inatividade de mouse/teclado;
# - verifica se os arquivos do projeto pararam de mudar;
# - opcionalmente verifica se um processo do Hermes está ativo;
# - inicia contagem regressiva antes de desligar;
# - permite cancelar pressionando qualquer tecla.

param(
    [int]$IdleMinutes = 10,

    # Altere para a pasta raiz do seu projeto.
    [string]$ProjectPath = (Get-Location).Path,

    # Se o Hermes usa outro nome de processo, ajuste aqui.
    # Deixe vazio para NÃO usar essa verificação.
    [string]$AgentProcessName = "",

    # Tempo mínimo sem alteração de arquivos do projeto.
    [int]$FileQuietMinutes = 10,

    # Contagem regressiva antes do desligamento.
    [int]$ShutdownCountdownSeconds = 60,

    # "Simulação" não desliga o PC; apenas mostra o que faria.
    [switch]$DryRun
)

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class UserActivity {
    [StructLayout(LayoutKind.Sequential)]
    struct LASTINPUTINFO {
        public uint cbSize;
        public uint dwTime;
    }

    [DllImport("user32.dll")]
    static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    public static uint GetIdleSeconds() {
        LASTINPUTINFO info = new LASTINPUTINFO();
        info.cbSize = (uint)Marshal.SizeOf(info);

        if (!GetLastInputInfo(ref info))
            return 0;

        return ((uint)Environment.TickCount - info.dwTime) / 1000;
    }
}
"@

function Get-IdleMinutes {
    return [math]::Round(([UserActivity]::GetIdleSeconds() / 60), 1)
}

function Get-LatestProjectChange {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    try {
        return Get-ChildItem -LiteralPath $Path -Recurse -File -Force -ErrorAction SilentlyContinue |
            Where-Object {
                $_.FullName -notmatch '\\(node_modules|\.git|dist|build|\.next|coverage)\\'
            } |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
    }
    catch {
        return $null
    }
}

function Get-AgentProcess {
    param([string]$Name)

    if ([string]::IsNullOrWhiteSpace($Name)) {
        return $null
    }

    $cleanName = [IO.Path]::GetFileNameWithoutExtension($Name)

    try {
        return Get-Process -Name $cleanName -ErrorAction SilentlyContinue
    }
    catch {
        return $null
    }
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "        WINDOWS AUTONOMOUS WATCHDOG" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Projeto:       $ProjectPath"
Write-Host "Inatividade:   $IdleMinutes minutos"
Write-Host "Arquivos:      $FileQuietMinutes minutos"
if ($AgentProcessName) {
    Write-Host "Processo:      $AgentProcessName"
}
else {
    Write-Host "Processo:      não configurado"
}
Write-Host "DryRun:        $DryRun"
Write-Host ""
Write-Host "O watchdog está ativo. Pressione Ctrl+C para encerrar." -ForegroundColor Yellow
Write-Host ""

# Validação inicial
if (-not (Test-Path -LiteralPath $ProjectPath)) {
    Write-Host "ERRO: pasta do projeto não encontrada." -ForegroundColor Red
    exit 1
}

$lastProjectChange = Get-LatestProjectChange -Path $ProjectPath
$lastChangeTime = if ($lastProjectChange) {
    $lastProjectChange.LastWriteTime
}
else {
    Get-Date
}

while ($true) {

    $now = Get-Date
    $idle = Get-IdleMinutes

    $latest = Get-LatestProjectChange -Path $ProjectPath

    if ($latest -and $latest.LastWriteTime -gt $lastChangeTime) {
        $lastChangeTime = $latest.LastWriteTime
    }

    $fileQuiet = ($now - $lastChangeTime).TotalMinutes

    $agentRunning = $false
    if ($AgentProcessName) {
        $agentRunning = $null -ne (Get-AgentProcess -Name $AgentProcessName)
    }

    Clear-Host

    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "        WINDOWS AUTONOMOUS WATCHDOG" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host ("Hora atual:              {0}" -f $now.ToString("dd/MM/yyyy HH:mm:ss"))
    Write-Host ("Inatividade teclado:     {0} min" -f $idle)
    Write-Host ("Arquivos sem alteração:  {0:N1} min" -f $fileQuiet)
    Write-Host ("Última alteração:        {0}" -f $lastChangeTime.ToString("dd/MM/yyyy HH:mm:ss"))

    if ($AgentProcessName) {
        if ($agentRunning) {
            Write-Host "Processo do agente:       ATIVO" -ForegroundColor Yellow
        }
        else {
            Write-Host "Processo do agente:       NÃO DETECTADO" -ForegroundColor Green
        }
    }

    Write-Host ""

    $activityReady = $idle -ge $IdleMinutes
    $filesReady = $fileQuiet -ge $FileQuietMinutes

    # Se um processo foi configurado, o desligamento só é autorizado
    # quando ele NÃO estiver mais ativo.
    $agentReady = if ($AgentProcessName) {
        -not $agentRunning
    }
    else {
        $true
    }

    if ($activityReady -and $filesReady -and $agentReady) {

        Write-Host "CONDIÇÕES DE DESLIGAMENTO ATINGIDAS." -ForegroundColor Green
        Write-Host ""
        Write-Host "Iniciando verificação final..." -ForegroundColor Yellow

        Start-Sleep -Seconds 3

        # Segunda leitura para reduzir falsos positivos.
        $idle2 = Get-IdleMinutes
        $latest2 = Get-LatestProjectChange -Path $ProjectPath
        $fileQuiet2 = if ($latest2) {
            ((Get-Date) - $latest2.LastWriteTime).TotalMinutes
        }
        else {
            $fileQuiet
        }

        $agentRunning2 = $false
        if ($AgentProcessName) {
            $agentRunning2 = $null -ne (Get-AgentProcess -Name $AgentProcessName)
        }

        if (
            $idle2 -ge $IdleMinutes -and
            $fileQuiet2 -ge $FileQuietMinutes -and
            -not $agentRunning2
        ) {

            Write-Host ""
            Write-Host "VERIFICAÇÃO FINAL: OK" -ForegroundColor Green
            Write-Host ""
            Write-Host "O computador será desligado em $ShutdownCountdownSeconds segundos." -ForegroundColor Red
            Write-Host "Pressione qualquer tecla para CANCELAR." -ForegroundColor Yellow
            Write-Host ""

            for ($remaining = $ShutdownCountdownSeconds; $remaining -gt 0; $remaining--) {

                if ([Console]::KeyAvailable) {
                    [void][Console]::ReadKey($true)

                    Write-Host ""
                    Write-Host "DESLIGAMENTO CANCELADO PELO USUÁRIO." -ForegroundColor Yellow
                    Write-Host "Watchdog continuará monitorando." -ForegroundColor Yellow

                    Start-Sleep -Seconds 3
                    break
                }

                Write-Host -NoNewline "`rDesligando em $remaining segundos...   "
                Start-Sleep -Seconds 1
            }

            # Se ainda estiver sem atividade, faz uma última checagem.
            if (-not [Console]::KeyAvailable) {

                $finalIdle = Get-IdleMinutes
                $finalLatest = Get-LatestProjectChange -Path $ProjectPath
                $finalFileQuiet = if ($finalLatest) {
                    ((Get-Date) - $finalLatest.LastWriteTime).TotalMinutes
                }
                else {
                    $fileQuiet2
                }

                $finalAgentRunning = $false
                if ($AgentProcessName) {
                    $finalAgentRunning = $null -ne (Get-AgentProcess -Name $AgentProcessName)
                }

                if (
                    $finalIdle -ge $IdleMinutes -and
                    $finalFileQuiet -ge $FileQuietMinutes -and
                    -not $finalAgentRunning
                ) {

                    Write-Host ""
                    Write-Host ""
                    Write-Host "CHECK FINAL: PASS" -ForegroundColor Green

                    if ($DryRun) {
                        Write-Host "DRY RUN: o computador SERIA desligado agora." -ForegroundColor Cyan
                        Write-Host "Nenhum comando de desligamento foi executado." -ForegroundColor Cyan
                        exit 0
                    }

                    Write-Host "Desligando o Windows..." -ForegroundColor Red

                    shutdown.exe /s /t 0 /d p:0:0 /c "Watchdog: sistema ocioso e projeto sem alterações."

                    exit 0
                }
                else {
                    Write-Host ""
                    Write-Host ""
                    Write-Host "Desligamento abortado: atividade detectada na última checagem." -ForegroundColor Yellow
                    Start-Sleep -Seconds 3
                }
            }
        }
    }

    Start-Sleep -Seconds 10
}
