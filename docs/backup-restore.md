# Encrypted OneDrive backups

Approved destination: the existing OneDrive account, with zero recurring service cost. Do not store database exports, media exports, passwords, private encryption keys or recovery credentials in GitHub or this repository. The backup program must not be deployed to Cloudflare.

## Implemented, not yet operational

`scripts/backup/run.mjs` streams a PostgreSQL custom-format export and each Storage object directly through GnuPG before writing to OneDrive. The manifest (object paths, metadata and plaintext hashes) is also encrypted. Only a timestamp/completion marker is unencrypted. No plaintext export file is staged in a sync directory. A failed run has no trusted completion marker. Storage inventory is compared before and after; concurrent object changes require retrying the backup.

The exporter uses an ASCII-armored **public** recipient certificate pinned by SHA-256 in a local configuration file. It does not require or store the private recovery key or its passphrase. Keep that private key and a recoverable copy of its passphrase in an independently accessible offline medium or password manager, outside OneDrive, Supabase, Cloudflare and GitHub. The public certificate and configuration must also remain outside the repository and OneDrive. Recovery is impossible if the private key is lost.

The implementation uses installed Node.js and GnuPG, with no npm encryption dependency, AI service or paid API. OneDrive capacity still applies; do not enable a paid plan automatically. GnuPG's [recipient-file mode](https://gnupg.org/documentation/manuals/gnupg/GPG-Key-related-Options.html) supports unattended encryption using the public certificate alone.

## User-controlled local setup

1. Install official PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) matching or newer than the source server version. They are currently missing from PATH. Use the [PostgreSQL download page](https://www.postgresql.org/download/windows/); no database server or paid service is required. GnuPG is already installed through Git on this machine.
2. Create a dedicated backup encryption key in your local GnuPG key manager, or use an independently managed existing backup key. Choose its passphrase privately. Retain an offline/private recovery copy and prove you can unlock it. Export **only the public certificate**, armored, to a local folder such as `%LOCALAPPDATA%\PhoneFuturistBackup`. Do not place the private key or passphrase in the sync folder, source repository, terminal command arguments or chat.
3. In Supabase **Connect**, get the session-pooler hostname and database username (port 5432). Obtain the database CA certificate from Supabase connection settings and save it outside the repository. This tool requires verified TLS; it will not fall back to disabling certificate validation.
4. Create a dedicated folder under your existing OneDrive for encrypted backups. Keep OneDrive running and confirm its actual cloud upload status after each export.
5. Create a JSON configuration file under `%LOCALAPPDATA%\PhoneFuturistBackup`, outside both OneDrive and the repository. Required fields are listed below. No passwords or private keys belong in that file. Use `Get-FileHash -Algorithm SHA256` locally to pin your public certificate; enter its lowercase hash in `recipientSha256`.

| Field | Local value to configure |
| --- | --- |
| `supabaseUrl` | `https://ehldokmrgahrlcoyidjy.supabase.co` |
| `databaseHost` | Actual session-pooler hostname from Supabase Connect |
| `databaseUser` | Actual database username from Supabase Connect |
| `databaseCaFile` | Absolute path to the downloaded database CA certificate |
| `postgresBin` | Absolute directory containing PostgreSQL client executables |
| `gpg` | Absolute path to the installed GnuPG executable |
| `gpgHome` | Dedicated existing local directory for the public-only backup process |
| `recipientFile` | Absolute path to the exported public certificate |
| `recipientSha256` | Locally computed certificate hash; never a recovery secret |
| `destination` | Dedicated encrypted-backup directory under OneDrive |

Run the launcher in **PowerShell 7**:

```powershell
& .\scripts\backup\Run-Backup.ps1 -ConfigPath "$env:LOCALAPPDATA\PhoneFuturistBackup\config.json"
```

It privately prompts for the database password and a server-only Supabase Storage export key. Credentials travel to the child process through stdin; the database password is passed only in the PostgreSQL child environment. They are not written to disk or echoed. The Storage key is used only against the fixed PhoneFuturist Supabase origin. Do not paste either into chat. Do not reduce your system execution policy to run the script; use a locally reviewed/signed script under your existing policy if PowerShell blocks it.

## Restore drill

Create a separate local recovery configuration containing only the GnuPG executable path and `recoveryHome` (the privately managed GnuPG recovery directory). Keep it outside the repository and OneDrive. Run:

```powershell
node .\scripts\backup\recover.mjs <completed-backup-directory> <new-local-recovery-directory> <local-recovery-config>
```

Recovery refuses repository/OneDrive output paths. Files become available only after GnuPG integrity verification succeeds, then hashes and sizes are checked against the encrypted manifest. It does **not** execute SQL or upload objects. Test recovery on an isolated compatible Supabase/PostgreSQL environment before using the result. No automated destructive restore to production is supplied.

The database archive covers `public`, `private`, `auth`, `storage` and `supabase_migrations` at a consistent PostgreSQL snapshot. Managed schemas require selective restoration: do not blindly restore platform-owned DDL into a hosted project. Use `pg_restore --list` to review the archive; restore application schema/functions/grants, compatible Auth/application data and migration history under a reviewed plan. Import Storage objects via the Storage API and reconcile metadata instead of treating Storage SQL rows as the media itself. Supabase's [backup/restore guidance](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) explains managed-schema constraints. SMTP/OAuth, runtime variables and recovery access require separate reconstruction; no secret values belong in this document.

Acceptance requires: restore a sourced article and its exact revision/source history, media bytes, accounts/role assignments, RLS and MFA behavior; verify private drafts remain private and public content renders. Measure restoration time and compare counts/hashes. Crypto round-trip tests alone do not satisfy database restore acceptance.

## Scheduling and freshness

Target an export every 12 hours with failure follow-up before 18 hours and a maximum 24-hour data-loss window. `status.mjs <backup-directory>` exits nonzero when no local completed run exists within 18 hours. This checks local markers, **not** cloud durability. Verify OneDrive completion and perform periodic restore drills.

Scheduling is **not enabled** yet: the first real export, private credential setup and restore drill are prerequisites. The interactive launcher deliberately does not persist secrets. Unattended database/API credentials will need a local Windows-protected credential store, separate from the private recovery key. A powered-off or offline PC cannot meet the target; if no existing always-on device is available, document the gap instead of claiming a guarantee. No credentials, keys, OneDrive token or paid backup service has been provisioned.

Retention and deletion automation remain disabled until actual backup size, free quota and restore evidence are known. Incomplete ciphertext folders may be removed after a newer completed backup is verified. Never remove the only restorable backup automatically.
