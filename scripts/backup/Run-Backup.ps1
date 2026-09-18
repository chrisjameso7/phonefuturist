# Requires PowerShell 7. Credentials are prompted privately and sent over stdin, never command arguments.
param([Parameter(Mandatory=$true)][string]$ConfigPath)
$ErrorActionPreference='Stop'
$databasePassword=Read-Host 'Supabase database password (not the API key)' -AsSecureString
$storageKey=Read-Host 'Supabase server-only Storage export key' -AsSecureString
$processInfo=[Diagnostics.ProcessStartInfo]::new()
$processInfo.FileName=(Get-Command node -ErrorAction Stop).Source
$processInfo.UseShellExecute=$false
$processInfo.CreateNoWindow=$true
$processInfo.RedirectStandardInput=$true
$processInfo.ArgumentList.Add((Join-Path $PSScriptRoot 'run.mjs'))
$processInfo.ArgumentList.Add((Resolve-Path -LiteralPath $ConfigPath).Path)
$runner=[Diagnostics.Process]::Start($processInfo)
try {
 $credentials=@{databasePassword=[Net.NetworkCredential]::new('', $databasePassword).Password;storageKey=[Net.NetworkCredential]::new('', $storageKey).Password}
 $runner.StandardInput.WriteLine(($credentials | ConvertTo-Json -Compress))
 $runner.StandardInput.Close()
 $credentials=$null
 $runner.WaitForExit()
 if($runner.ExitCode -ne 0){throw 'Backup did not complete.'}
} finally {$databasePassword.Dispose();$storageKey.Dispose();$runner.Dispose()}
