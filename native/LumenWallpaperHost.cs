using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

// LumenWallpaperHost
// Windows live-wallpaper host. Creates a borderless WebView2 window and
// attaches it to the desktop wallpaper layer (WorkerW / Progman), below the
// desktop icons.
//
// Usage:
//   LumenWallpaperHost.exe --html <path> [--parent-pid <pid>] [--duration <seconds>]

internal static class Program
{
    internal const int GWL_STYLE = -16;
    internal const int GWL_EXSTYLE = -20;
    internal const long WS_CHILD = 0x40000000L;
    internal const long WS_POPUP = 0x80000000L;
    internal const long WS_VISIBLE = 0x10000000L;
    internal const long WS_CLIPCHILDREN = 0x02000000L;
    internal const long WS_CLIPSIBLINGS = 0x04000000L;
    internal const long WS_EX_TOOLWINDOW = 0x00000080L;
    internal const long WS_EX_APPWINDOW = 0x00040000L;
    internal const long WS_EX_NOACTIVATE = 0x08000000L;
    private const long WS_EX_NOREDIRECTIONBITMAP = 0x00200000L;
    internal const int SM_CXSCREEN = 0;
    internal const int SM_CYSCREEN = 1;
    internal const uint SWP_NOACTIVATE = 0x0010;
    internal const uint SWP_FRAMECHANGED = 0x0020;
    internal const uint SWP_SHOWWINDOW = 0x0040;
    internal const uint SWP_NOSIZE = 0x0001;
    internal const uint SWP_NOMOVE = 0x0002;
    internal const int SW_SHOWNOACTIVATE = 4;

    private static string s_htmlPath;
    private static string s_previewPath;
    private static int s_parentPid;

    [STAThread]
    private static void Main(string[] args)
    {
        EnableDpiAwareness();

        s_htmlPath = ArgValue(args, "--html");
        s_previewPath = ArgValue(args, "--preview");
        int parentPid;
        s_parentPid = int.TryParse(ArgValue(args, "--parent-pid"), out parentPid) ? parentPid : 0;
        int duration;
        int durationSeconds = int.TryParse(ArgValue(args, "--duration"), out duration) ? duration : 0;

        if (string.IsNullOrEmpty(s_htmlPath) || !File.Exists(s_htmlPath))
        {
            WriteJson("{\"ok\":false,\"error\":\"wallpaper html not found\"}");
            Environment.ExitCode = 2;
            return;
        }

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        WallpaperForm form = new WallpaperForm(s_htmlPath, s_previewPath, s_parentPid, durationSeconds);
        Application.Run(form);
    }

    private static string ArgValue(string[] args, string name)
    {
        for (int i = 0; i < args.Length - 1; i++)
            if (args[i] == name) return args[i + 1];
        return null;
    }

    private static void EnableDpiAwareness()
    {
        try
        {
            if (SetProcessDpiAwarenessContext(new IntPtr(-4))) return;
        }
        catch { }
        try { SetProcessDPIAware(); } catch { }
    }

    internal static void WriteJson(string json)
    {
        try
        {
            Console.WriteLine(json);
            Console.Out.Flush();
        }
        catch { }
    }

    // ---------- Win32 ----------

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    internal static extern IntPtr FindWindow(string c, string n);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    internal static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string n);
    [DllImport("user32.dll")]
    internal static extern bool EnumWindows(EnumWindowsProc f, IntPtr l);
    [DllImport("user32.dll")]
    internal static extern bool EnumChildWindows(IntPtr p, EnumWindowsProc f, IntPtr l);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    internal static extern int GetClassName(IntPtr h, StringBuilder b, int n);
    [DllImport("user32.dll")]
    internal static extern IntPtr SendMessageTimeout(IntPtr h, uint msg, IntPtr w, IntPtr l, uint flags, uint timeout, out IntPtr result);
    [DllImport("user32.dll", SetLastError = true)]
    internal static extern IntPtr SetParent(IntPtr child, IntPtr parent);
    [DllImport("user32.dll", SetLastError = true)]
    internal static extern IntPtr GetParent(IntPtr h);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW", SetLastError = true)]
    internal static extern IntPtr GetWindowLongPtr(IntPtr h, int index);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW", SetLastError = true)]
    internal static extern IntPtr SetWindowLongPtr(IntPtr h, int index, IntPtr value);
    [DllImport("user32.dll", SetLastError = true)]
    internal static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll", SetLastError = true)]
    internal static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hh, bool repaint);
    [DllImport("user32.dll")]
    internal static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")]
    internal static extern bool IsWindow(IntPtr h);
    [DllImport("user32.dll")]
    internal static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")]
    internal static extern int GetSystemMetrics(int index);
    [DllImport("user32.dll")]
    internal static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")]
    internal static extern bool SetProcessDpiAwarenessContext(IntPtr value);

    internal delegate bool EnumWindowsProc(IntPtr h, IntPtr l);

    internal static string ClassName(IntPtr h)
    {
        if (h == IntPtr.Zero) return "0";
        StringBuilder b = new StringBuilder(256);
        GetClassName(h, b, b.Capacity);
        return b.ToString();
    }

    internal static IntPtr FindWallpaperLayer(out bool parentIsProgman)
    {
        parentIsProgman = false;
        IntPtr progman = FindWindow("Progman", null);
        if (progman == IntPtr.Zero) return IntPtr.Zero;

        IntPtr unused;
        SendMessageTimeout(progman, 0x052C, IntPtr.Zero, IntPtr.Zero, 0, 1000, out unused);

        long exStyle = GetWindowLongPtr(progman, GWL_EXSTYLE).ToInt64();
        bool raised = (exStyle & WS_EX_NOREDIRECTIONBITMAP) != 0;

        if (raised)
        {
            // Windows 11 24H2+ raised desktop: the shell wallpaper layer is a
            // direct child WorkerW (below the layered icon view). Use it when
            // present; otherwise parent straight to Progman and slot below the
            // icon view.
            IntPtr child = FindWindowEx(progman, IntPtr.Zero, "WorkerW", null);
            while (child != IntPtr.Zero)
            {
                if (IsWindowVisible(child) &&
                    FindWindowEx(child, IntPtr.Zero, "SHELLDLL_DefView", null) == IntPtr.Zero)
                    return child;
                child = FindWindowEx(progman, child, "WorkerW", null);
            }

            // Some builds keep the icon view inside a WorkerW child.
            child = FindWindowEx(progman, IntPtr.Zero, "WorkerW", null);
            while (child != IntPtr.Zero)
            {
                if (IsWindowVisible(child) &&
                    FindWindowEx(child, IntPtr.Zero, "SHELLDLL_DefView", null) != IntPtr.Zero)
                {
                    IntPtr sibling = FindWindowEx(progman, child, "WorkerW", null);
                    if (sibling != IntPtr.Zero) return sibling;
                }
                child = FindWindowEx(progman, child, "WorkerW", null);
            }

            parentIsProgman = true;
            return progman;
        }

        // Classic desktop: top-level WorkerW sibling after the icon host.
        IntPtr worker = IntPtr.Zero;
        EnumWindows(delegate(IntPtr top, IntPtr l)
        {
            IntPtr defView = FindWindowEx(top, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (defView != IntPtr.Zero)
            {
                IntPtr sibling = FindWindowEx(IntPtr.Zero, top, "WorkerW", null);
                if (sibling != IntPtr.Zero)
                {
                    worker = sibling;
                    return false;
                }
            }
            return true;
        }, IntPtr.Zero);

        if (worker != IntPtr.Zero) return worker;

        parentIsProgman = true;
        return progman;
    }
}

internal sealed class WallpaperForm : Form
{
    private readonly string m_htmlPath;
    private readonly string m_previewPath;
    private readonly int m_parentPid;
    private readonly int m_durationSeconds;
    private IntPtr m_parentLayer;
    private bool m_parentIsProgman;
    private WebView2 m_webView;
    private System.Windows.Forms.Timer m_lifeTimer;
    private bool m_ready;
    private int m_tickCount;
    private DateTime m_startedAt;

    public WallpaperForm(string htmlPath, string previewPath, int parentPid, int durationSeconds)
    {
        m_htmlPath = htmlPath;
        m_previewPath = previewPath;
        m_parentPid = parentPid;
        m_durationSeconds = durationSeconds;
        m_startedAt = DateTime.UtcNow;

        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.Manual;
        BackColor = Color.Black;
        Text = "Lumen Wallpaper";
        AutoScaleMode = AutoScaleMode.None;
        DoubleBuffered = true;

        int width = Program.GetSystemMetrics(Program.SM_CXSCREEN);
        int height = Program.GetSystemMetrics(Program.SM_CYSCREEN);
        Bounds = new Rectangle(0, 0, width, height);

        bool parentIsProgman;
        m_parentLayer = Program.FindWallpaperLayer(out parentIsProgman);
        m_parentIsProgman = parentIsProgman;
        if (Environment.GetEnvironmentVariable("LUMEN_FORCE_PROGMAN") == "1")
        {
            m_parentLayer = Program.FindWindow("Progman", null);
            m_parentIsProgman = true;
        }

        if (m_parentLayer == IntPtr.Zero)
        {
            Program.WriteJson("{\"ok\":false,\"error\":\"desktop wallpaper layer not found\"}");
            Environment.ExitCode = 3;
            Close();
            return;
        }

        Shown += OnShown;
        FormClosed += delegate { Application.Exit(); };
    }

    protected override bool ShowWithoutActivation
    {
        get { return true; }
    }

    protected override CreateParams CreateParams
    {
        get
        {
            CreateParams cp = base.CreateParams;
            cp.ExStyle |= 0x08000000; // WS_EX_NOACTIVATE
            return cp;
        }
    }

    private void OnShown(object sender, EventArgs e)
    {
        AttachToDesktop();
        SetupLifecycleTimer();
        InitializeWebView();
    }

    private void AttachToDesktop()
    {
        IntPtr hwnd = Handle;

        if (!Program.IsWindow(m_parentLayer))
        {
            bool parentIsProgman;
            m_parentLayer = Program.FindWallpaperLayer(out parentIsProgman);
            m_parentIsProgman = parentIsProgman;
        }
        if (m_parentLayer == IntPtr.Zero)
        {
            Program.WriteJson("{\"ok\":false,\"error\":\"desktop wallpaper layer not found\"}");
            return;
        }

        long style = Program.GetWindowLongPtr(hwnd, Program.GWL_STYLE).ToInt64();
        style &= ~(Program.WS_POPUP);
        style |= Program.WS_CHILD | Program.WS_VISIBLE | Program.WS_CLIPCHILDREN | Program.WS_CLIPSIBLINGS;
        Program.SetWindowLongPtr(hwnd, Program.GWL_STYLE, new IntPtr(style));

        long ex = Program.GetWindowLongPtr(hwnd, Program.GWL_EXSTYLE).ToInt64();
        ex &= ~Program.WS_EX_APPWINDOW;
        ex |= Program.WS_EX_TOOLWINDOW | Program.WS_EX_NOACTIVATE;
        Program.SetWindowLongPtr(hwnd, Program.GWL_EXSTYLE, new IntPtr(ex));

        Program.SetParent(hwnd, m_parentLayer);

        IntPtr insertAfter;
        if (m_parentIsProgman)
        {
            IntPtr defView = Program.FindWindowEx(m_parentLayer, IntPtr.Zero, "SHELLDLL_DefView", null);
            insertAfter = defView != IntPtr.Zero ? defView : IntPtr.Zero;
        }
        else
        {
            insertAfter = IntPtr.Zero; // top of the wallpaper layer
        }

        int width = Program.GetSystemMetrics(Program.SM_CXSCREEN);
        int height = Program.GetSystemMetrics(Program.SM_CYSCREEN);
        Program.SetWindowPos(hwnd, insertAfter, 0, 0, width, height,
            Program.SWP_NOACTIVATE | Program.SWP_FRAMECHANGED | Program.SWP_SHOWWINDOW);
        Program.MoveWindow(hwnd, 0, 0, width, height, true);
        Program.ShowWindow(hwnd, Program.SW_SHOWNOACTIVATE);

        EnforceTopOfLayer(hwnd);

        Program.WriteJson("{\"ok\":true,\"stage\":\"attached\",\"parent\":\"" + m_parentLayer.ToInt64() +
                          "\",\"parentIsProgman\":" + (m_parentIsProgman ? "true" : "false") + "}");
    }

    private void EnforceTopOfLayer(IntPtr hwnd)
    {
        if (m_parentIsProgman || m_parentLayer == IntPtr.Zero) return;

        Program.SetWindowPos(hwnd, IntPtr.Zero /* HWND_TOP */, 0, 0, 0, 0,
            Program.SWP_NOMOVE | Program.SWP_NOSIZE | Program.SWP_NOACTIVATE);

        // Other live-wallpaper windows (Wallpaper Engine, Lively, ...) also
        // live in this layer. Keep them behind ours without touching their
        // size or position, or they would collapse to 0x0.
        Program.EnumChildWindows(m_parentLayer, delegate(IntPtr child, IntPtr l)
        {
            if (child != hwnd && Program.IsWindowVisible(child))
            {
                Program.SetWindowPos(child, new IntPtr(1) /* HWND_BOTTOM */, 0, 0, 0, 0,
                    Program.SWP_NOMOVE | Program.SWP_NOSIZE | Program.SWP_NOACTIVATE);
            }
            return true;
        }, IntPtr.Zero);
    }

    private async void InitializeWebView()
    {
        try
        {
            string userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "LumenWallpaper", "WebView2");
            Directory.CreateDirectory(userData);

            CoreWebView2EnvironmentOptions options = new CoreWebView2EnvironmentOptions(
                "--autoplay-policy=no-user-gesture-required " +
                "--disable-background-timer-throttling " +
                "--disable-renderer-backgrounding " +
                "--disable-backgrounding-occluded-windows " +
                "--disable-features=CalculateNativeWinOcclusion,msWebOOUI,msPdfOOUI " +
                "--mute-audio");
            CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(null, userData, options);

            m_webView = new WebView2();
            m_webView.Dock = DockStyle.Fill;
            m_webView.DefaultBackgroundColor = Color.Black;
            Controls.Add(m_webView);
            m_webView.BringToFront();

            await m_webView.EnsureCoreWebView2Async(env);

            CoreWebView2Settings settings = m_webView.CoreWebView2.Settings;
            settings.AreDevToolsEnabled = false;
            settings.AreDefaultContextMenusEnabled = false;
            settings.IsStatusBarEnabled = false;
            settings.AreBrowserAcceleratorKeysEnabled = false;
            settings.IsZoomControlEnabled = false;
            settings.IsPasswordAutosaveEnabled = false;
            settings.IsGeneralAutofillEnabled = false;
            settings.AreHostObjectsAllowed = false;

            m_webView.CoreWebView2.NavigationCompleted += OnNavigationCompleted;
            m_webView.CoreWebView2.ProcessFailed += delegate
            {
                Program.WriteJson("{\"ok\":false,\"error\":\"webview process failed\"}");
                BeginInvoke(new Action(Close));
            };

            string url = new Uri(m_htmlPath).AbsoluteUri;
            m_webView.CoreWebView2.Navigate(url);
        }
        catch (Exception ex)
        {
            Program.WriteJson("{\"ok\":false,\"error\":\"" + Escape(ex.Message) + "\"}");
            Environment.ExitCode = 4;
            BeginInvoke(new Action(Close));
        }
    }

    private void OnNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (!e.IsSuccess)
        {
            Program.WriteJson("{\"ok\":false,\"error\":\"navigation failed: " + e.WebErrorStatus + "\"}");
            Environment.ExitCode = 5;
            BeginInvoke(new Action(Close));
            return;
        }
        m_ready = true;
        Program.WriteJson("{\"ok\":true,\"ready\":true}");
    }

    private void SetupLifecycleTimer()
    {
        m_lifeTimer = new System.Windows.Forms.Timer();
        m_lifeTimer.Interval = 1000;
        m_lifeTimer.Tick += delegate
        {
            if (m_durationSeconds > 0 &&
                (DateTime.UtcNow - m_startedAt).TotalSeconds >= m_durationSeconds)
            {
                Close();
                return;
            }

            if (m_parentPid > 0)
            {
                try
                {
                    Process p = Process.GetProcessById(m_parentPid);
                    if (p.HasExited)
                    {
                        Close();
                        return;
                    }
                }
                catch
                {
                    Close();
                    return;
                }
            }

            // Re-attach if Explorer restarted and our layer changed.
            if (m_ready && Program.GetParent(Handle) != m_parentLayer)
            {
                AttachToDesktop();
            }

            m_tickCount++;
            if (m_ready && (m_tickCount % 5) == 0)
            {
                EnforceTopOfLayer(Handle);
            }
        };
        m_lifeTimer.Start();
    }

    private static string Escape(string s)
    {
        if (string.IsNullOrEmpty(s)) return string.Empty;
        return s.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }
}

