using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace PrintHubSpooler
{
    class Program
    {
        static int Main(string[] args)
        {
            try
            {
                var options = ParseArguments(args);

                if (options.ShowHelp)
                {
                    PrintHelp();
                    return 0;
                }

                if (options.ListPrinters)
                {
                    ListPrinters();
                    return 0;
                }

                if (options.OpenProperties)
                {
                    OpenPrinterProperties(options.PrinterName);
                    return 0;
                }

                if (string.IsNullOrEmpty(options.FilePath) || !File.Exists(options.FilePath))
                {
                    OutputJson(new { success = false, error = $"Print file not found: {options.FilePath}" });
                    return 1;
                }

                if (string.IsNullOrEmpty(options.PrinterName))
                {
                    options.PrinterName = GetDefaultPrinterName();
                    if (string.IsNullOrEmpty(options.PrinterName))
                    {
                        OutputJson(new { success = false, error = "No default Windows printer found." });
                        return 1;
                    }
                }

                bool success = PrintDirectWithDevMode(options, out string errorMessage);
                if (success)
                {
                    OutputJson(new
                    {
                        success = true,
                        printer = options.PrinterName,
                        paper = options.PaperSize,
                        paperType = options.PaperType,
                        quality = options.Quality,
                        copies = options.Copies
                    });
                    return 0;
                }
                else
                {
                    OutputJson(new { success = false, error = errorMessage });
                    return 1;
                }
            }
            catch (Exception ex)
            {
                OutputJson(new { success = false, error = ex.Message, stack = ex.StackTrace });
                return 1;
            }
        }

        // ── Win32 P/Invoke & Structures ──────────────────────────────────────────

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct DOCINFO
        {
            public int cbSize;
            [MarshalAs(UnmanagedType.LPWStr)]
            public string lpszDocName;
            [MarshalAs(UnmanagedType.LPWStr)]
            public string? lpszOutput;
            [MarshalAs(UnmanagedType.LPWStr)]
            public string? lpszDatatype;
            public int fwType;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct DEVMODEW
        {
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
            public string dmDeviceName;
            public short dmSpecVersion;
            public short dmDriverVersion;
            public short dmSize;
            public short dmDriverExtra;
            public int dmFields;

            public short dmOrientation;
            public short dmPaperSize;
            public short dmPaperLength;
            public short dmPaperWidth;
            public short dmScale;
            public short dmCopies;
            public short dmDefaultSource;
            public short dmPrintQuality;

            public short dmColor;
            public short dmDuplex;
            public short dmYResolution;
            public short dmTTOption;
            public short dmCollate;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
            public string dmFormName;
            public short dmLogPixels;
            public int dmBitsPerPel;
            public int dmPelsWidth;
            public int dmPelsHeight;
            public int dmNup;
            public int dmDisplayFrequency;
            public int dmICMMethod;
            public int dmICMIntent;
            public int dmMediaType;
            public int dmDitherType;
            public int dmReserved1;
            public int dmReserved2;
            public int dmPanningWidth;
            public int dmPanningHeight;
        }

        const int DM_MODIFY = 1;
        const int DM_IN_BUFFER = 8;
        const int DM_OUT_BUFFER = 2;

        const int DM_ORIENTATION = 0x00000001;
        const int DM_PAPERSIZE = 0x00000002;
        const int DM_PAPERLENGTH = 0x00000004;
        const int DM_PAPERWIDTH = 0x00000008;
        const int DM_COPIES = 0x00000100;
        const int DM_PRINTQUALITY = 0x00000400;
        const int DM_COLOR = 0x00000800;
        const int DM_DUPLEX = 0x00001000;
        const int DM_MEDIATYPE = 0x00800000;

        const int DMMEDIA_STANDARD = 1;      // Plain paper
        const int DMMEDIA_TRANSPARENCY = 2;  // Transparency
        const int DMMEDIA_GLOSSY = 4;        // Glossy photo paper
        const int DMMEDIA_MATTE = 5;         // Matte paper

        const short DMORIENT_PORTRAIT = 1;
        const short DMORIENT_LANDSCAPE = 2;

        const short DMCOLOR_MONOCHROME = 1;
        const short DMCOLOR_COLOR = 2;

        const short DMDUP_SIMPLEX = 1;
        const short DMDUP_VERTICAL = 2;   // Long Edge
        const short DMDUP_HORIZONTAL = 3; // Short Edge

        const short DMPAPER_LETTER = 1;
        const short DMPAPER_LEGAL = 5;
        const short DMPAPER_A4 = 9;
        const short DMPAPER_A5 = 11;
        const short DMPAPER_USER = 256;

        const short DMRES_DRAFT = -1;
        const short DMRES_LOW = -2;
        const short DMRES_MEDIUM = -3;
        const short DMRES_HIGH = -4;

        const int HORZRES = 8;
        const int VERTRES = 10;
        const int PHYSICALWIDTH = 110;
        const int PHYSICALHEIGHT = 111;
        const int PHYSICALOFFSETX = 112;
        const int PHYSICALOFFSETY = 113;
        const int LOGPIXELSX = 88;
        const int LOGPIXELSY = 90;

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

        [DllImport("winspool.drv", SetLastError = true)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern int DocumentProperties(IntPtr hWnd, IntPtr hPrinter, string pDeviceName, IntPtr pDevModeOutput, IntPtr pDevModeInput, int fMode);

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool GetDefaultPrinter(System.Text.StringBuilder pszBuffer, ref int pcchBuffer);

        [DllImport("gdi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern IntPtr CreateDC(string? lpszDriver, string lpszDevice, string? lpszOutput, IntPtr lpInitData);

        [DllImport("gdi32.dll", SetLastError = true)]
        public static extern bool DeleteDC(IntPtr hdc);

        [DllImport("gdi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern int StartDoc(IntPtr hdc, [In] ref DOCINFO lpDocInfo);

        [DllImport("gdi32.dll", SetLastError = true)]
        public static extern int EndDoc(IntPtr hdc);

        [DllImport("gdi32.dll", SetLastError = true)]
        public static extern int StartPage(IntPtr hdc);

        [DllImport("gdi32.dll", SetLastError = true)]
        public static extern int EndPage(IntPtr hdc);

        [DllImport("gdi32.dll", SetLastError = true)]
        public static extern int GetDeviceCaps(IntPtr hdc, int nIndex);

        // ── Direct Hardware Print with Injected DEVMODE ──────────────────────────

        public static bool PrintDirectWithDevMode(PrintOptions options, out string errorMessage)
        {
            errorMessage = "";
            IntPtr hPrinter = IntPtr.Zero;
            IntPtr pDevMode = IntPtr.Zero;
            IntPtr hdc = IntPtr.Zero;

            if (string.IsNullOrEmpty(options.PrinterName) || string.IsNullOrEmpty(options.FilePath))
            {
                errorMessage = "Printer name and file path are required.";
                return false;
            }

            try
            {
                if (!OpenPrinter(options.PrinterName, out hPrinter, IntPtr.Zero))
                {
                    errorMessage = $"Could not open printer handle for '{options.PrinterName}'. Error code: {Marshal.GetLastWin32Error()}";
                    return false;
                }

                // 1. Get required size for driver's DEVMODE structure (including private extra driver data)
                int devModeSize = DocumentProperties(IntPtr.Zero, hPrinter, options.PrinterName, IntPtr.Zero, IntPtr.Zero, 0);
                if (devModeSize <= 0)
                {
                    errorMessage = $"Failed to retrieve DEVMODE buffer size for '{options.PrinterName}'.";
                    return false;
                }

                pDevMode = Marshal.AllocHGlobal(devModeSize);

                // 2. Retrieve current DEVMODE from driver
                int res = DocumentProperties(IntPtr.Zero, hPrinter, options.PrinterName, pDevMode, IntPtr.Zero, DM_OUT_BUFFER);
                if (res < 0)
                {
                    errorMessage = $"Failed to populate DEVMODE from printer driver.";
                    return false;
                }

                DEVMODEW dm = Marshal.PtrToStructure<DEVMODEW>(pDevMode);

                // 3. Inject our custom Paper Type (Media Type)
                string paperType = (options.PaperType ?? "plain").ToLowerInvariant();
                int mediaType = DMMEDIA_STANDARD;
                if (paperType.Contains("glossy") || paperType.Contains("photo"))
                {
                    mediaType = DMMEDIA_GLOSSY;
                }
                else if (paperType.Contains("matte") || paperType.Contains("cardstock"))
                {
                    mediaType = DMMEDIA_MATTE;
                }
                else if (paperType.Contains("envelope") || paperType.Contains("transparency"))
                {
                    mediaType = DMMEDIA_TRANSPARENCY;
                }

                dm.dmFields |= DM_MEDIATYPE;
                dm.dmMediaType = mediaType;

                // 4. Inject Print Quality (Draft / Standard / High / 600 / 1200 DPI)
                string quality = (options.Quality ?? "standard").ToLowerInvariant();
                short printQuality = DMRES_MEDIUM;
                if (quality.Contains("draft"))
                {
                    printQuality = DMRES_DRAFT;
                }
                else if (quality.Contains("high") || quality.Contains("ultra"))
                {
                    printQuality = DMRES_HIGH;
                }
                else
                {
                    printQuality = DMRES_MEDIUM;
                }

                dm.dmFields |= DM_PRINTQUALITY;
                dm.dmPrintQuality = printQuality;

                // 5. Inject Paper Size
                string paperSize = (options.PaperSize ?? "A4").ToUpperInvariant();
                dm.dmFields |= DM_PAPERSIZE;
                if (paperSize == "A4")
                {
                    dm.dmPaperSize = DMPAPER_A4;
                }
                else if (paperSize == "4R" || paperSize.Contains("4X6") || paperSize.Contains("102"))
                {
                    // 4R Photo Paper: 101.6 mm x 152.4 mm (in tenths of mm: 1016 x 1524)
                    dm.dmPaperSize = DMPAPER_USER;
                    dm.dmFields |= (DM_PAPERLENGTH | DM_PAPERWIDTH);
                    dm.dmPaperWidth = 1016;
                    dm.dmPaperLength = 1524;
                }
                else if (paperSize == "LEGAL")
                {
                    dm.dmPaperSize = DMPAPER_LEGAL;
                }
                else if (paperSize == "LETTER")
                {
                    dm.dmPaperSize = DMPAPER_LETTER;
                }
                else if (paperSize == "A5")
                {
                    dm.dmPaperSize = DMPAPER_A5;
                }
                else
                {
                    dm.dmPaperSize = DMPAPER_A4;
                }

                // 6. Inject Orientation
                dm.dmFields |= DM_ORIENTATION;
                dm.dmOrientation = options.Landscape ? DMORIENT_LANDSCAPE : DMORIENT_PORTRAIT;

                // 7. Inject Color vs Grayscale
                dm.dmFields |= DM_COLOR;
                dm.dmColor = options.Color ? DMCOLOR_COLOR : DMCOLOR_MONOCHROME;

                // 8. Inject Copies
                dm.dmFields |= DM_COPIES;
                dm.dmCopies = (short)Math.Max(1, Math.Min(99, options.Copies));

                // 9. Inject Duplex
                string duplex = (options.Duplex ?? "simplex").ToLowerInvariant();
                dm.dmFields |= DM_DUPLEX;
                if (duplex.Contains("long") || duplex == "duplex")
                {
                    dm.dmDuplex = DMDUP_VERTICAL;
                }
                else if (duplex.Contains("short"))
                {
                    dm.dmDuplex = DMDUP_HORIZONTAL;
                }
                else
                {
                    dm.dmDuplex = DMDUP_SIMPLEX;
                }

                // Write modified structure back to unmanaged memory
                Marshal.StructureToPtr(dm, pDevMode, false);

                // 10. Merge and validate modified DEVMODE through the printer driver
                DocumentProperties(IntPtr.Zero, hPrinter, options.PrinterName, pDevMode, pDevMode, DM_IN_BUFFER | DM_OUT_BUFFER);

                // 11. Create Device Context (HDC) with the exact modified DEVMODE
                hdc = CreateDC(null, options.PrinterName, null, pDevMode);
                if (hdc == IntPtr.Zero)
                {
                    errorMessage = $"Failed to create printer device context (HDC) for '{options.PrinterName}'.";
                    return false;
                }

                // 12. Load Bitmap Image to Print
                using (var srcImage = Image.FromFile(options.FilePath))
                {
                    string? outputFilename = null;
                    if (options.PrinterName.IndexOf("PDF", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        options.PrinterName.IndexOf("XPS", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        options.PrinterName.IndexOf("OneNote", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        outputFilename = Path.Combine(
                            Path.GetDirectoryName(options.FilePath) ?? Path.GetTempPath(),
                            $"PrintHub_Doc_{DateTime.Now.Ticks}.pdf"
                        );
                    }

                    var docInfo = new DOCINFO
                    {
                        cbSize = Marshal.SizeOf<DOCINFO>(),
                        lpszDocName = $"PrintHub Studio — {Path.GetFileName(options.FilePath)}",
                        lpszOutput = outputFilename,
                        lpszDatatype = "RAW"
                    };

                    int startDocRes = StartDoc(hdc, ref docInfo);
                    if (startDocRes <= 0)
                    {
                        errorMessage = $"StartDoc failed on printer '{options.PrinterName}'. Error code: {Marshal.GetLastWin32Error()}";
                        return false;
                    }

                    int startPageRes = StartPage(hdc);
                    if (startPageRes <= 0)
                    {
                        errorMessage = $"StartPage failed on printer '{options.PrinterName}'.";
                        EndDoc(hdc);
                        return false;
                    }

                    // Query physical printable coordinates on hardware
                    int printableWidth = GetDeviceCaps(hdc, HORZRES);
                    int printableHeight = GetDeviceCaps(hdc, VERTRES);
                    int physicalWidth = GetDeviceCaps(hdc, PHYSICALWIDTH);
                    int physicalHeight = GetDeviceCaps(hdc, PHYSICALHEIGHT);
                    int offsetX = GetDeviceCaps(hdc, PHYSICALOFFSETX);
                    int offsetY = GetDeviceCaps(hdc, PHYSICALOFFSETY);

                    int targetWidth = printableWidth > 0 ? printableWidth : physicalWidth;
                    int targetHeight = printableHeight > 0 ? printableHeight : physicalHeight;

                    // Render pristine high-DPI image to printer DC
                    using (Graphics g = Graphics.FromHdc(hdc))
                    {
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        g.SmoothingMode = SmoothingMode.HighQuality;
                        g.CompositingQuality = CompositingQuality.HighQuality;

                        // Draw full bleed / fit into printable area
                        var destRect = new Rectangle(0, 0, targetWidth, targetHeight);
                        g.DrawImage(srcImage, destRect, 0, 0, srcImage.Width, srcImage.Height, GraphicsUnit.Pixel);
                    }

                    EndPage(hdc);
                    EndDoc(hdc);
                }

                return true;
            }
            catch (Exception ex)
            {
                errorMessage = ex.Message;
                return false;
            }
            finally
            {
                if (hdc != IntPtr.Zero) DeleteDC(hdc);
                if (pDevMode != IntPtr.Zero) Marshal.FreeHGlobal(pDevMode);
                if (hPrinter != IntPtr.Zero) ClosePrinter(hPrinter);
            }
        }

        // ── Helper Operations ────────────────────────────────────────────────────

        static string GetDefaultPrinterName()
        {
            var sb = new System.Text.StringBuilder(512);
            int size = sb.Capacity;
            if (GetDefaultPrinter(sb, ref size))
            {
                return sb.ToString();
            }
            return "";
        }

        static void OpenPrinterProperties(string? printerName)
        {
            try
            {
                string target = string.IsNullOrEmpty(printerName) ? GetDefaultPrinterName() : printerName;
                if (string.IsNullOrEmpty(target))
                {
                    OutputJson(new { success = false, error = "No printer specified." });
                    return;
                }

                // Launch Windows Native Driver Printing Preferences dialog
                Process.Start(new ProcessStartInfo
                {
                    FileName = "rundll32.exe",
                    Arguments = $"printui.dll,PrintUIEntry /e /n \"{target}\"",
                    UseShellExecute = true
                });

                OutputJson(new { success = true, opened = target });
            }
            catch (Exception ex)
            {
                OutputJson(new { success = false, error = ex.Message });
            }
        }

        static void ListPrinters()
        {
            var printers = new List<string>();
            foreach (string p in System.Drawing.Printing.PrinterSettings.InstalledPrinters)
            {
                printers.Add(p);
            }
            OutputJson(new { success = true, printers = printers, defaultPrinter = GetDefaultPrinterName() });
        }

        static void OutputJson(object data)
        {
            Console.WriteLine(JsonSerializer.Serialize(data));
        }

        static void PrintHelp()
        {
            Console.WriteLine("PrintHub Studio Enterprise Native Windows Spooler");
            Console.WriteLine("Usage: PrintHubSpooler.exe [options]");
            Console.WriteLine("  --printer <name>         Target printer name (default: Windows default)");
            Console.WriteLine("  --file <path>            Path to rendered sheet image (PNG/JPG)");
            Console.WriteLine("  --paper <size>           A4, 4R, Legal, Letter, A5");
            Console.WriteLine("  --type <mediaType>       plain, premium_glossy, matte, ultra_glossy, photo_glossy");
            Console.WriteLine("  --quality <quality>      draft, standard, high, ultra_high");
            Console.WriteLine("  --orientation <mode>     portrait, landscape");
            Console.WriteLine("  --copies <num>           Number of copies (default: 1)");
            Console.WriteLine("  --color <true|false>     Color mode (default: true)");
            Console.WriteLine("  --duplex <mode>          simplex, longEdge, shortEdge");
            Console.WriteLine("  --open-properties        Open Windows driver preferences dialog");
            Console.WriteLine("  --list-printers          List all installed Windows printers");
        }

        static PrintOptions ParseArguments(string[] args)
        {
            var opt = new PrintOptions();
            for (int i = 0; i < args.Length; i++)
            {
                string arg = args[i].ToLowerInvariant();
                if (arg == "--help" || arg == "-h" || arg == "/?") opt.ShowHelp = true;
                else if (arg == "--list-printers") opt.ListPrinters = true;
                else if (arg == "--open-properties") opt.OpenProperties = true;
                else if (arg == "--printer" && i + 1 < args.Length) opt.PrinterName = args[++i];
                else if (arg == "--file" && i + 1 < args.Length) opt.FilePath = args[++i];
                else if (arg == "--paper" && i + 1 < args.Length) opt.PaperSize = args[++i];
                else if (arg == "--type" && i + 1 < args.Length) opt.PaperType = args[++i];
                else if (arg == "--quality" && i + 1 < args.Length) opt.Quality = args[++i];
                else if (arg == "--orientation" && i + 1 < args.Length) opt.Landscape = args[++i].ToLowerInvariant() == "landscape";
                else if (arg == "--copies" && i + 1 < args.Length)
                {
                    if (int.TryParse(args[++i], out int parsedCopies)) opt.Copies = parsedCopies;
                }
                else if (arg == "--color" && i + 1 < args.Length) opt.Color = args[++i].ToLowerInvariant() != "false";
                else if (arg == "--duplex" && i + 1 < args.Length) opt.Duplex = args[++i];
            }
            return opt;
        }
    }

    public class PrintOptions
    {
        public bool ShowHelp { get; set; }
        public bool ListPrinters { get; set; }
        public bool OpenProperties { get; set; }
        public string? PrinterName { get; set; }
        public string? FilePath { get; set; }
        public string PaperSize { get; set; } = "A4";
        public string PaperType { get; set; } = "plain";
        public string Quality { get; set; } = "standard";
        public bool Landscape { get; set; } = false;
        public int Copies { get; set; } = 1;
        public bool Color { get; set; } = true;
        public string Duplex { get; set; } = "simplex";
    }
}
