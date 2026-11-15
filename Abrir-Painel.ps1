Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$form = New-Object Windows.Forms.Form
$form.Text = 'Recrutamento • Inicializador'
$form.Size = New-Object Drawing.Size(500,290)
$form.StartPosition = 'CenterScreen'
$form.BackColor = [Drawing.Color]::FromArgb(17,21,27)
$form.ForeColor = [Drawing.Color]::White
$form.Font = New-Object Drawing.Font('Segoe UI',10)
$title = New-Object Windows.Forms.Label
$title.Text = 'Painel de Recrutamento'
$title.Font = New-Object Drawing.Font('Segoe UI Semibold',18)
$title.Location = New-Object Drawing.Point(28,25); $title.Size = New-Object Drawing.Size(420,38)
$form.Controls.Add($title)
$status = New-Object Windows.Forms.Label
$status.Text = 'Escolha uma ação para continuar.'
$status.Location = New-Object Drawing.Point(30,75); $status.Size = New-Object Drawing.Size(425,35)
$form.Controls.Add($status)
function New-Button($text,$x,$color) { $b=New-Object Windows.Forms.Button; $b.Text=$text; $b.Location=New-Object Drawing.Point($x,125); $b.Size=New-Object Drawing.Size(190,55); $b.FlatStyle='Flat'; $b.BackColor=$color; $b.ForeColor=[Drawing.Color]::White; $b.FlatAppearance.BorderSize=0; $form.Controls.Add($b); return $b }
$start = New-Button '▶  Iniciar painel' 30 ([Drawing.Color]::FromArgb(99,156,61))
$publish = New-Button '↑  Publicar no GitHub' 245 ([Drawing.Color]::FromArgb(48,57,68))
$start.Add_Click({
  $node=Get-Command node -ErrorAction SilentlyContinue
  if(-not $node){[Windows.Forms.MessageBox]::Show('Instale o Node.js 20 ou superior para iniciar.','Node.js necessário')|Out-Null;return}
  if(-not $script:server -or $script:server.HasExited){$script:server=Start-Process -FilePath $node.Source -ArgumentList 'server.mjs' -WorkingDirectory $root -PassThru -WindowStyle Hidden; Start-Sleep -Milliseconds 900}
  Start-Process 'http://localhost:4173'
  $status.Text='Painel aberto em http://localhost:4173'
})
$publish.Add_Click({
  try { & (Join-Path $root 'publicar-no-github.ps1'); if($LASTEXITCODE -eq 0){[Windows.Forms.MessageBox]::Show('Publicação concluída.','GitHub')|Out-Null} }
  catch { [Windows.Forms.MessageBox]::Show($_.Exception.Message,'Falha ao publicar')|Out-Null }
})
$note=New-Object Windows.Forms.Label
$note.Text='O primeiro acesso permite cadastrar os desenvolvedores. O envio usa a autenticação do Git configurada no Windows.'
$note.Location=New-Object Drawing.Point(31,202);$note.Size=New-Object Drawing.Size(420,38);$note.ForeColor=[Drawing.Color]::FromArgb(155,164,176);$note.Font=New-Object Drawing.Font('Segoe UI',8)
$form.Controls.Add($note)
[void]$form.ShowDialog()
