/**
 * printers-helper.cjs
 * Enterprise Windows Native Hardware Printer Detector
 * Queries real-time Windows Spooler and Driver statuses including Offline/Online/Error.
 */

const { exec } = require('child_process');

function getWindowsPrintersReal() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve([]);
    }

    // PowerShell script to query Get-Printer and Win32_Printer
    const psScript = `
      $ErrorActionPreference = 'SilentlyContinue'
      $printers = Get-Printer
      $wmi = Get-CimInstance Win32_Printer
      $res = @()
      foreach ($p in $printers) {
        $w = $wmi | Where-Object { $_.Name -eq $p.Name } | Select-Object -First 1
        $statusNum = [int]$p.PrinterStatus
        $isOffline = (($statusNum -band 128) -ne 0) -or ($p.PrinterStatus -match 'Offline') -or ($w.WorkOffline -eq $true)
        $statusText = 'Ready'
        if ($isOffline) {
          $statusText = 'Offline'
        } elseif (($statusNum -band 8) -ne 0) {
          $statusText = 'Paper Jam'
        } elseif (($statusNum -band 16) -ne 0) {
          $statusText = 'Paper Out'
        } elseif (($statusNum -band 2) -ne 0) {
          $statusText = 'Error'
        } elseif (($statusNum -band 512) -ne 0 -or ($statusNum -band 1024) -ne 0) {
          $statusText = 'Busy'
        }
        
        $caps = @($w.CapabilityDescriptions)
        $capNums = @($w.Capabilities)
        $hasColor = ($caps -match 'Color').Count -gt 0 -or $capNums -contains 2
        $hasDuplex = ($caps -match 'Duplex').Count -gt 0 -or $capNums -contains 3
        $isDef = if ($w) { [bool]$w.Default } else { $false }

        $res += [PSCustomObject]@{
          name = $p.Name
          displayName = $p.Name
          description = if ($p.DriverName) { $p.DriverName } else { 'Windows System Printer' }
          isDefault = $isDef
          status = $statusText
          isOffline = [bool]$isOffline
          jobCount = [int]$p.JobCount
          capabilities = [PSCustomObject]@{
            color = [bool]$hasColor
            duplex = [bool]$hasDuplex
            copies = $true
            collate = $true
            paperSizes = @('A4', '4R', 'Legal', 'Letter', 'A5', 'Stamp', 'Custom')
          }
        }
      }
      $res | ConvertTo-Json -Depth 4 -Compress
    `;

    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`;

    exec(cmd, { timeout: 4000, maxBuffer: 1024 * 1024 }, (err, stdout) => {
      if (err || !stdout) {
        console.warn('PowerShell printer query error:', err);
        return resolve([]);
      }
      try {
        const raw = JSON.parse(stdout.trim());
        const list = Array.isArray(raw) ? raw : [raw];
        const normalized = list.map(item => ({
          name: item.name,
          displayName: item.displayName || item.name,
          description: item.description || '',
          isDefault: Boolean(item.isDefault),
          status: item.status || (item.isOffline ? 'Offline' : 'Ready'),
          isOffline: Boolean(item.isOffline),
          jobCount: item.jobCount || 0,
          capabilities: {
            color: Boolean(item.capabilities?.color),
            duplex: Boolean(item.capabilities?.duplex),
            copies: true,
            collate: true,
            paperSizes: Array.isArray(item.capabilities?.paperSizes)
              ? item.capabilities.paperSizes
              : ['A4', '4R', 'Legal', 'Letter', 'A5', 'Stamp', 'Custom'],
          },
        }));
        resolve(normalized);
      } catch (parseErr) {
        console.warn('Failed to parse printer JSON:', parseErr);
        resolve([]);
      }
    });
  });
}

module.exports = { getWindowsPrintersReal };
