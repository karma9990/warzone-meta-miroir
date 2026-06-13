param(
  [string]$Site = $env:WZPRO_SITE,
  [int]$PollMs = 5000,
  [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if ($ValidateOnly) {
  Write-Output 'WZPRO Companion GUI syntax OK'
  exit 0
}

$script:root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$script:companionProcess = $null
$script:pendingLines = New-Object 'System.Collections.Concurrent.ConcurrentQueue[string]'
$script:historyCount = 0
$script:allowExit = $false
$script:minimizeNoticeShown = $false
$script:site = if ($Site) { $Site.TrimEnd('/') } else { 'https://wzprometa.com' }
$script:deviceToken = ''
$script:connectedName = ''
$script:deviceCode = ''
$script:deviceId = ''
$script:pollingLogin = $false
$script:sessionDir = Join-Path $env:APPDATA 'WZPRO Companion'
$script:sessionPath = Join-Path $script:sessionDir 'session.json'

function Save-Session {
  New-Item -ItemType Directory -Force -Path $script:sessionDir | Out-Null
  @{
    site = $script:site
    token = $script:deviceToken
    userName = $script:connectedName
  } | ConvertTo-Json | Set-Content -Path $script:sessionPath -Encoding UTF8
}

function Load-Session {
  if (-not (Test-Path $script:sessionPath)) { return }
  try {
    $session = Get-Content -Raw $script:sessionPath | ConvertFrom-Json
    if ($session.site) { $script:site = [string]$session.site }
    if ($session.token) { $script:deviceToken = [string]$session.token }
    if ($session.userName) { $script:connectedName = [string]$session.userName }
  } catch {
    $script:deviceToken = ''
    $script:connectedName = ''
  }
}

function Api-Post {
  param([string]$Path, [hashtable]$Body)
  $json = $Body | ConvertTo-Json -Compress
  try {
    return Invoke-RestMethod -Uri "$script:site$Path" -Method Post -ContentType 'application/json' -Body $json
  } catch {
    throw "Impossible de joindre $script:site. Verifie ta connexion internet ou relance l'app avec -Site https://wzprometa.com. $($_.Exception.Message)"
  }
}

function Add-LogLine {
  param([string]$Line)
  if ([string]::IsNullOrWhiteSpace($Line)) { return }
  $stamp = Get-Date -Format 'HH:mm:ss'
  $logBox.AppendText("[$stamp] $Line`r`n")
  if ($Line -match 'Uploaded game') {
    $script:historyCount += 1
    [void]$historyList.Items.Insert(0, "Game $script:historyCount - $Line")
  }
  if ($Line -match 'Waiting for Call of Duty') {
    $statusLabel.Text = 'Warzone non detecte'
    $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(185, 185, 185)
    $tray.Text = 'WZPRO Companion - Waiting for Warzone'
  } elseif ($Line -match 'waiting for the game window') {
    $statusLabel.Text = 'Warzone ouvert - active le jeu'
    $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 204, 0)
    $tray.Text = 'WZPRO Companion - Waiting for focus'
  } elseif ($Line -match 'Watching active game window') {
    $statusLabel.Text = 'Warzone actif - surveillance'
    $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(0, 180, 255)
    $tray.Text = 'WZPRO Companion - Watching Warzone'
  } elseif ($Line -match 'Uploaded game') {
    $statusLabel.Text = 'Game importee'
    $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(0, 230, 140)
    $tray.ShowBalloonTip(3500, 'WZPRO Companion', $Line, [System.Windows.Forms.ToolTipIcon]::Info)
  } elseif ($Line -match 'Companion waiting') {
    $statusLabel.Text = 'En attente'
    $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 204, 0)
  }
}

function Set-RunningState {
  param([bool]$Running)
  $startButton.Enabled = -not $Running
  $stopButton.Enabled = $Running
  $pollBox.Enabled = -not $Running
  $connectButton.Enabled = (-not $Running) -and (-not $script:pollingLogin)
  if (-not $Running) {
    $statusLabel.Text = 'Arrete'
    $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(185, 185, 185)
    $tray.Text = 'WZPRO Companion - Stopped'
  }
}

function Start-Companion {
  if ($script:companionProcess -and -not $script:companionProcess.HasExited) { return }
  $poll = [Math]::Max(3000, [int]$pollBox.Value * 1000)

  if (-not $script:deviceToken) {
    [System.Windows.Forms.MessageBox]::Show('Connecte d abord WZPRO Companion a ton compte.', 'WZPRO Companion') | Out-Null
    return
  }

  $statusLabel.Text = 'Demarrage...'
  $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(0, 180, 255)
  Add-LogLine "Starting companion for $script:site"

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'cmd.exe'
  $psi.Arguments = "/d /s /c npm.cmd run companion -- --site $script:site --token $script:deviceToken --poll_ms $poll"
  $psi.WorkingDirectory = $script:root
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi
  $process.EnableRaisingEvents = $true
  $process.add_OutputDataReceived({
    if ($EventArgs.Data) { $script:pendingLines.Enqueue($EventArgs.Data) }
  })
  $process.add_ErrorDataReceived({
    if ($EventArgs.Data) { $script:pendingLines.Enqueue($EventArgs.Data) }
  })
  $process.add_Exited({
    $script:pendingLines.Enqueue('Companion stopped.')
  })

  [void]$process.Start()
  $process.BeginOutputReadLine()
  $process.BeginErrorReadLine()
  $script:companionProcess = $process
  Set-RunningState $true
}

function Refresh-ConnectionUi {
  if ($script:deviceToken) {
    $connectionLabel.Text = "Connecte : $script:connectedName"
    $connectionLabel.ForeColor = [System.Drawing.Color]::FromArgb(0, 230, 140)
    $connectButton.Text = 'RECONNECTER'
    $startButton.Enabled = $true
  } else {
    $connectionLabel.Text = 'Non connecte'
    $connectionLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 204, 0)
    $connectButton.Text = 'SE CONNECTER A WZPRO'
    $startButton.Enabled = $false
  }
}

function Start-LoginFlow {
  if ($script:pollingLogin) { return }
  try {
    $script:pollingLogin = $true
    $connectButton.Enabled = $false
    $connectionLabel.Text = 'Connexion en cours...'
    $connectionLabel.ForeColor = [System.Drawing.Color]::FromArgb(0, 180, 255)
    $deviceName = "$env:COMPUTERNAME"
    $result = Api-Post '/api/companion/device/start' @{ deviceName = $deviceName }
    $script:deviceCode = [string]$result.code
    $script:deviceId = [string]$result.deviceId
    Add-LogLine "Open browser authorization code $script:deviceCode"
    Start-Process ([string]$result.connectUrl)
    $loginPollTimer.Start()
  } catch {
    $script:pollingLogin = $false
    $connectButton.Enabled = $true
    $connectionLabel.Text = 'Connexion impossible'
    $connectionLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 204, 0)
    Add-LogLine "Login failed: $($_.Exception.Message)"
  }
}

function Poll-LoginFlow {
  if (-not $script:pollingLogin -or -not $script:deviceCode -or -not $script:deviceId) { return }
  try {
    $result = Api-Post '/api/companion/device/poll' @{
      code = $script:deviceCode
      deviceId = $script:deviceId
    }
    if ($result.status -eq 'authorized') {
      $loginPollTimer.Stop()
      $script:pollingLogin = $false
      $script:deviceToken = [string]$result.token
      $script:connectedName = [string]$result.userName
      Save-Session
      Refresh-ConnectionUi
      Add-LogLine "Connected to WZPRO as $script:connectedName"
    } elseif ($result.status -eq 'expired') {
      $loginPollTimer.Stop()
      $script:pollingLogin = $false
      $script:deviceCode = ''
      $script:deviceId = ''
      Refresh-ConnectionUi
      Add-LogLine 'Connection code expired. Start again.'
    }
  } catch {
    Add-LogLine "Waiting for authorization: $($_.Exception.Message)"
  }
}

function Stop-Companion {
  if ($script:companionProcess -and -not $script:companionProcess.HasExited) {
    Add-LogLine 'Stopping companion...'
    try {
      $script:companionProcess.Kill()
      $script:companionProcess.WaitForExit(2500) | Out-Null
    } catch {
      Add-LogLine "Stop failed: $($_.Exception.Message)"
    }
  }
  Set-RunningState $false
}

function Hide-ToBackground {
  $form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
  $form.ShowInTaskbar = $false
  $form.Hide()
  $tray.Visible = $true
  if (-not $script:minimizeNoticeShown) {
    $tray.ShowBalloonTip(3000, 'WZprometa', 'WZprometa est reduit dans les applications.', [System.Windows.Forms.ToolTipIcon]::Info)
    $script:minimizeNoticeShown = $true
  }
}

function Show-FromBackground {
  $form.ShowInTaskbar = $true
  $form.Show()
  $form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
  $form.Activate()
}

function Show-CloseChoice {
  $dialog = New-Object System.Windows.Forms.Form
  $dialog.Text = 'WZprometa'
  $dialog.Size = New-Object System.Drawing.Size(460, 190)
  $dialog.StartPosition = 'CenterParent'
  $dialog.FormBorderStyle = 'FixedDialog'
  $dialog.MaximizeBox = $false
  $dialog.MinimizeBox = $false
  $dialog.BackColor = [System.Drawing.Color]::FromArgb(8, 8, 10)
  $dialog.ForeColor = [System.Drawing.Color]::White
  $dialog.Font = New-Object System.Drawing.Font('Consolas', 9)

  $message = New-Object System.Windows.Forms.Label
  $message.Text = 'WZprometa est reduit dans les applications.'
  $message.Location = New-Object System.Drawing.Point(22, 24)
  $message.Size = New-Object System.Drawing.Size(400, 42)
  $message.ForeColor = [System.Drawing.Color]::FromArgb(235, 235, 235)
  $dialog.Controls.Add($message)

  $detail = New-Object System.Windows.Forms.Label
  $detail.Text = 'L app peut continuer en arriere-plan. Tu peux aussi fermer totalement l application.'
  $detail.Location = New-Object System.Drawing.Point(22, 64)
  $detail.Size = New-Object System.Drawing.Size(400, 38)
  $detail.ForeColor = [System.Drawing.Color]::FromArgb(165, 165, 170)
  $dialog.Controls.Add($detail)

  $hide = New-Object System.Windows.Forms.Button
  $hide.Text = 'REDUIRE'
  $hide.Location = New-Object System.Drawing.Point(156, 112)
  $hide.Size = New-Object System.Drawing.Size(116, 30)
  $hide.BackColor = [System.Drawing.Color]::FromArgb(22, 60, 255)
  $hide.ForeColor = [System.Drawing.Color]::White
  $hide.FlatStyle = 'Flat'
  $hide.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $dialog.Controls.Add($hide)

  $quit = New-Object System.Windows.Forms.Button
  $quit.Text = 'FERMER TOTALEMENT'
  $quit.Location = New-Object System.Drawing.Point(282, 112)
  $quit.Size = New-Object System.Drawing.Size(140, 30)
  $quit.BackColor = [System.Drawing.Color]::FromArgb(42, 42, 48)
  $quit.ForeColor = [System.Drawing.Color]::White
  $quit.FlatStyle = 'Flat'
  $quit.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $dialog.Controls.Add($quit)

  $dialog.AcceptButton = $hide
  $dialog.CancelButton = $hide
  return $dialog.ShowDialog($form)
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'WZPRO Companion'
$form.Size = New-Object System.Drawing.Size(760, 560)
$form.MinimumSize = New-Object System.Drawing.Size(680, 500)
$form.StartPosition = 'CenterScreen'
$form.BackColor = [System.Drawing.Color]::FromArgb(8, 8, 10)
$form.ForeColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font('Consolas', 9)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'WZPRO COMPANION'
$title.Font = New-Object System.Drawing.Font('Consolas', 18, [System.Drawing.FontStyle]::Bold)
$title.Location = New-Object System.Drawing.Point(20, 18)
$title.Size = New-Object System.Drawing.Size(360, 32)
$form.Controls.Add($title)

$helpText = New-Object System.Windows.Forms.Label
$helpText.Text = 'Connecte cette app a ton compte WZPRO, puis laisse-la surveiller Warzone quand tu joues.'
$helpText.Location = New-Object System.Drawing.Point(22, 54)
$helpText.Size = New-Object System.Drawing.Size(690, 20)
$helpText.ForeColor = [System.Drawing.Color]::FromArgb(185, 185, 185)
$form.Controls.Add($helpText)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = 'Arrete'
$statusLabel.Font = New-Object System.Drawing.Font('Consolas', 10, [System.Drawing.FontStyle]::Bold)
$statusLabel.Location = New-Object System.Drawing.Point(22, 78)
$statusLabel.Size = New-Object System.Drawing.Size(460, 24)
$statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(185, 185, 185)
$form.Controls.Add($statusLabel)

$connectionLabel = New-Object System.Windows.Forms.Label
$connectionLabel.Text = 'Non connecte'
$connectionLabel.Location = New-Object System.Drawing.Point(22, 118)
$connectionLabel.Size = New-Object System.Drawing.Size(320, 24)
$connectionLabel.Font = New-Object System.Drawing.Font('Consolas', 10, [System.Drawing.FontStyle]::Bold)
$connectionLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 204, 0)
$form.Controls.Add($connectionLabel)

$connectButton = New-Object System.Windows.Forms.Button
$connectButton.Text = 'SE CONNECTER A WZPRO'
$connectButton.Location = New-Object System.Drawing.Point(374, 112)
$connectButton.Size = New-Object System.Drawing.Size(336, 34)
$connectButton.BackColor = [System.Drawing.Color]::FromArgb(22, 60, 255)
$connectButton.ForeColor = [System.Drawing.Color]::White
$connectButton.FlatStyle = 'Flat'
$connectButton.Add_Click({ Start-LoginFlow })
$form.Controls.Add($connectButton)

$pollLabel = New-Object System.Windows.Forms.Label
$pollLabel.Text = 'Verifier toutes'
$pollLabel.Location = New-Object System.Drawing.Point(22, 166)
$pollLabel.Size = New-Object System.Drawing.Size(120, 20)
$form.Controls.Add($pollLabel)

$pollBox = New-Object System.Windows.Forms.NumericUpDown
$pollBox.Minimum = 3
$pollBox.Maximum = 30
$pollBox.Increment = 1
$pollBox.Value = [Math]::Max(3, [Math]::Round($PollMs / 1000))
$pollBox.Location = New-Object System.Drawing.Point(150, 162)
$pollBox.Size = New-Object System.Drawing.Size(120, 24)
$pollBox.BackColor = [System.Drawing.Color]::FromArgb(14, 18, 45)
$pollBox.ForeColor = [System.Drawing.Color]::White
$form.Controls.Add($pollBox)

$secondsLabel = New-Object System.Windows.Forms.Label
$secondsLabel.Text = 'secondes'
$secondsLabel.Location = New-Object System.Drawing.Point(278, 166)
$secondsLabel.Size = New-Object System.Drawing.Size(80, 20)
$form.Controls.Add($secondsLabel)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = 'START'
$startButton.Location = New-Object System.Drawing.Point(374, 160)
$startButton.Size = New-Object System.Drawing.Size(120, 30)
$startButton.BackColor = [System.Drawing.Color]::FromArgb(22, 60, 255)
$startButton.ForeColor = [System.Drawing.Color]::White
$startButton.FlatStyle = 'Flat'
$startButton.Add_Click({ Start-Companion })
$form.Controls.Add($startButton)

$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Text = 'STOP'
$stopButton.Location = New-Object System.Drawing.Point(506, 160)
$stopButton.Size = New-Object System.Drawing.Size(120, 30)
$stopButton.BackColor = [System.Drawing.Color]::FromArgb(42, 42, 48)
$stopButton.ForeColor = [System.Drawing.Color]::White
$stopButton.FlatStyle = 'Flat'
$stopButton.Enabled = $false
$stopButton.Add_Click({ Stop-Companion })
$form.Controls.Add($stopButton)

$fieldHelp = New-Object System.Windows.Forms.Label
$fieldHelp.Text = 'La connexion ouvre ton navigateur. Une fois autorisee sur le site, la cle reste cachee dans cette app.'
$fieldHelp.Location = New-Object System.Drawing.Point(22, 198)
$fieldHelp.Size = New-Object System.Drawing.Size(690, 34)
$fieldHelp.ForeColor = [System.Drawing.Color]::FromArgb(150, 150, 155)
$form.Controls.Add($fieldHelp)

$historyTitle = New-Object System.Windows.Forms.Label
$historyTitle.Text = 'Imports'
$historyTitle.Location = New-Object System.Drawing.Point(22, 246)
$historyTitle.Size = New-Object System.Drawing.Size(160, 20)
$form.Controls.Add($historyTitle)

$historyList = New-Object System.Windows.Forms.ListBox
$historyList.Location = New-Object System.Drawing.Point(22, 270)
$historyList.Size = New-Object System.Drawing.Size(314, 204)
$historyList.BackColor = [System.Drawing.Color]::FromArgb(4, 4, 6)
$historyList.ForeColor = [System.Drawing.Color]::White
$historyList.BorderStyle = 'FixedSingle'
$form.Controls.Add($historyList)

$logTitle = New-Object System.Windows.Forms.Label
$logTitle.Text = 'Journal'
$logTitle.Location = New-Object System.Drawing.Point(356, 246)
$logTitle.Size = New-Object System.Drawing.Size(160, 20)
$form.Controls.Add($logTitle)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Location = New-Object System.Drawing.Point(356, 270)
$logBox.Size = New-Object System.Drawing.Size(344, 204)
$logBox.Multiline = $true
$logBox.ScrollBars = 'Vertical'
$logBox.ReadOnly = $true
$logBox.BackColor = [System.Drawing.Color]::FromArgb(4, 4, 6)
$logBox.ForeColor = [System.Drawing.Color]::FromArgb(220, 220, 225)
$logBox.BorderStyle = 'FixedSingle'
$form.Controls.Add($logBox)

$trayMenu = New-Object System.Windows.Forms.ContextMenuStrip
$showItem = $trayMenu.Items.Add('Afficher')
$showItem.Add_Click({ Show-FromBackground })
$startItem = $trayMenu.Items.Add('Start')
$startItem.Add_Click({ Start-Companion })
$stopItem = $trayMenu.Items.Add('Stop')
$stopItem.Add_Click({ Stop-Companion })
$exitItem = $trayMenu.Items.Add('Fermer totalement')
$exitItem.Add_Click({ $script:allowExit = $true; Stop-Companion; $tray.Visible = $false; $form.Close() })

$tray = New-Object System.Windows.Forms.NotifyIcon
$iconPath = Join-Path $script:root 'scripts\wzpro-companion.ico'
if (Test-Path $iconPath) {
  try {
    $tray.Icon = New-Object System.Drawing.Icon($iconPath)
    $form.Icon = New-Object System.Drawing.Icon($iconPath)
  } catch {
    $tray.Icon = [System.Drawing.SystemIcons]::Application
  }
} else {
  $tray.Icon = [System.Drawing.SystemIcons]::Application
}
$tray.Text = 'WZPRO Companion - Stopped'
$tray.Visible = $true
$tray.ContextMenuStrip = $trayMenu
$tray.Add_DoubleClick({ Show-FromBackground })

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 300
$timer.Add_Tick({
  $line = $null
  while ($script:pendingLines.TryDequeue([ref]$line)) {
    Add-LogLine $line
  }
  if ($script:companionProcess -and $script:companionProcess.HasExited) {
    Set-RunningState $false
  }
})
$timer.Start()

$loginPollTimer = New-Object System.Windows.Forms.Timer
$loginPollTimer.Interval = 2200
$loginPollTimer.Add_Tick({ Poll-LoginFlow })

$form.Add_Resize({
  if ($form.WindowState -eq [System.Windows.Forms.FormWindowState]::Minimized) {
    Hide-ToBackground
  }
})

$form.Add_FormClosing({
  param($sender, $eventArgs)
  if (-not $script:allowExit) {
    $choice = Show-CloseChoice
    if ($choice -eq [System.Windows.Forms.DialogResult]::OK) {
      $script:allowExit = $true
      Stop-Companion
      $loginPollTimer.Stop()
      $timer.Stop()
      $tray.Visible = $false
      $tray.Dispose()
    } else {
      $eventArgs.Cancel = $true
      Hide-ToBackground
    }
    return
  }

  Stop-Companion
  $loginPollTimer.Stop()
  $timer.Stop()
  $tray.Visible = $false
  $tray.Dispose()
})

Load-Session
Refresh-ConnectionUi
Add-LogLine 'Ready. Start when Warzone is open.'
[System.Windows.Forms.Application]::EnableVisualStyles()
[System.Windows.Forms.Application]::Run($form)
