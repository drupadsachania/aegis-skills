# Disk Forensics

## Purpose
Extract and analyse filesystem artifacts: timeline, deleted files, browser history, Windows-specific artifacts, and application artifacts.

---

## 1. Filesystem Timeline Creation

### NTFS (Windows) — The Sleuth Kit
```bash
# Create body file from NTFS image
fls -r -m / -o <partition_offset> hostname_disk.dd > hostname_body.txt

# Convert to timeline
mactime -b hostname_body.txt -d > hostname_timeline.csv
mactime -b hostname_body.txt -z UTC -d 2026-01-01 2026-06-01 > filtered.csv

# Get partition offset
mmls hostname_disk.dd  # shows start sector of each partition
```

### Plaso / log2timeline
```bash
# Create plaso storage file (parses ALL artifact types)
log2timeline.py --storage-file hostname.plaso hostname_disk.dd

# Filter and export to CSV
psort.py -o L2tcsv -w hostname_timeline.csv hostname.plaso "date > '2026-01-01'"

# Filter by artifact types
psort.py hostname.plaso "source_short == 'LOG'" -o L2tcsv -w logs.csv
```

---

## 2. Deleted File Recovery

### Autopsy
```
1. New Case > Add Data Source > Disk Image (hostname_disk.dd)
2. Enable modules: File Type Identification, Hash Lookup, Keyword Search
3. Deleted Files view shows recovered entries
4. File Recovery: right-click > Extract File(s)
5. Validate extracted files by hash
```

### PhotoRec (command-line)
```bash
photorec /d /mnt/recovery/ hostname_disk.dd
# Carves files by signature regardless of filesystem
# Recovers: documents, images, archives, executables
# Note: filenames not recovered, only content
```

---

## 3. Windows Artifact Analysis

### Prefetch Files
```
Location: C:\Windows\Prefetch\<EXECNAME>-<HASH>.pf
Contains: execution count, last run time, files/directories accessed

# Parse with PECmd (Eric Zimmermann Tools)
PECmd.exe -d C:\Windows\Prefetch --csv C:\output\ --csvf prefetch.csv

# Key information:
# - Last run time (8 timestamps)
# - Run count
# - Files loaded (DLLs, data files — can show staged data)
```

### Shimcache (AppCompatCache)
```
Registry: HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\AppCompatCache

# Parse with AppCompatCacheParser.exe (Eric Zimmermann)
AppCompatCacheParser.exe -f SYSTEM --csv C:\output\ --csvf shimcache.csv

# Contains: file path, last modified time, execution flag (XP/2003 only)
# KEY USE: files that existed on system even if deleted
```

### Amcache
```
Location: C:\Windows\AppCompat\Programs\Amcache.hve

# Parse with AmcacheParser.exe (Eric Zimmermann)
AmcacheParser.exe -f Amcache.hve --csv C:\output\ --csvf amcache.csv

# Contains: SHA1 hash, publisher, install date, file path
# KEY USE: hash of executed files even if deleted
```

### Windows Event Logs
```powershell
# Export relevant logs
wevtutil epl Security Security.evtx
wevtutil epl System System.evtx
wevtutil epl Microsoft-Windows-Sysmon/Operational Sysmon.evtx
wevtutil epl Microsoft-Windows-PowerShell/Operational PS.evtx

# Key Security event IDs:
# 4624 - Logon success (type 2=interactive, 3=network, 10=remote)
# 4625 - Logon failure
# 4634/4647 - Logoff
# 4648 - Logon with explicit credentials (runas)
# 4672 - Special privileges assigned (admin logon)
# 4688 - Process creation (if auditing enabled)
# 4698 - Scheduled task created
# 4720 - User account created
# 4776 - NTLM authentication attempt
# 4768 - Kerberos TGT request
# 4769 - Kerberos service ticket request

# Analyse with EvtxECmd (Eric Zimmermann)
EvtxECmd.exe -d C:\Windows\System32\winevt\Logs --csv C:\output\ --csvf evtx.csv
```

---

## 4. Browser Artifacts

### Chrome/Chromium
```
Profile location: %LOCALAPPDATA%\Google\Chrome\User Data\Default\

# Databases (SQLite):
History:          History (URLs, visits, download history)
Cookies:          Cookies
Web Data:         Web Data (form autofill)
Login Data:       Login Data (saved passwords — encrypted)
Downloads:        entries in History database

# Query History
sqlite3 History "SELECT url, title, visit_count, last_visit_time FROM urls ORDER BY last_visit_time DESC LIMIT 100;"

# Convert Chrome timestamp (microseconds since Jan 1, 1601)
python3 -c "from datetime import datetime, timedelta; ts=<chrome_ts>; print(datetime(1601,1,1)+timedelta(microseconds=ts))"
```

### Firefox
```
Profile: %APPDATA%\Mozilla\Firefox\Profiles\<profile>\
places.sqlite  → URLs, bookmarks, history
cookies.sqlite → Cookies
formhistory.sqlite → Form data
```

---

## 5. LNK Files and Jumplists

```
LNK files: %USERPROFILE%\AppData\Roaming\Microsoft\Windows\Recent\
Jumplists: %USERPROFILE%\AppData\Roaming\Microsoft\Windows\Recent\AutomaticDestinations\

# Parse with LECmd (LNK) and JLECmd (Jumplist) — Eric Zimmermann Tools
LECmd.exe -d "C:\Users\<user>\Recent" --csv C:\output\ --csvf lnk.csv
JLECmd.exe -d "C:\Users\<user>\Recent\AutomaticDestinations" --csv C:\output\

# LNK files contain: target path, MAC timestamps, volume serial, machine ID
# Jumplists contain: recently opened files per application
```

---

## 6. Disk Forensics Checklist

- [ ] Filesystem timeline created (fls + mactime or log2timeline)
- [ ] Deleted file recovery attempted
- [ ] Prefetch files parsed and reviewed
- [ ] Shimcache parsed (files that existed, with timestamps)
- [ ] Amcache parsed (hashes of executed files)
- [ ] Event logs exported and key security events reviewed
- [ ] Browser history, cookies, and downloads extracted
- [ ] LNK files and jumplists parsed
- [ ] Registry hives exported: SYSTEM, SOFTWARE, SAM, NTUSER.DAT
- [ ] $MFT and $UsnJrnl analysed for file creation/deletion activity
- [ ] Recycle Bin analysed ($I files contain original path + deletion time)
