using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Shell;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace OarTool;

/// <summary>
/// One window, one WebView2. The page draws its own title bar; Windows keeps the left/right/bottom frame
/// (shadow, resize, Snap). The page is served from the local "web" folder through a virtual host, so no
/// network port is opened (1.x used http://localhost:8080 and broke when another program had that port).
/// </summary>
internal sealed class ShellWindow : Window
{
    public const string Host = "oar.local";
    public static readonly string Origin = $"https://{Host}";

    private const double TopResizeStrip = 4;
    private static readonly Color Ground = Color.FromRgb(0x12, 0x12, 0x12);

    private readonly WebView2 _web = new();
    private readonly System.Windows.Controls.Grid _content = new();
    private readonly Bridge _bridge;
    private readonly bool _dev = Environment.GetEnvironmentVariable("OAR_TOOL_DEV") == "1";

    public ShellWindow()
    {
        Title = "OAR External Tool";
        AppSettings settings = AppSettings.Load();
        Rect work = SystemParameters.WorkArea;
        Width = Math.Clamp(settings.WindowWidth > 200 ? settings.WindowWidth : 1440, 1024, Math.Max(1024, work.Width));
        Height = Math.Clamp(settings.WindowHeight > 200 ? settings.WindowHeight : 900, 640, Math.Max(640, work.Height));
        MinWidth = 1024;
        MinHeight = 640;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        if (settings.WindowMaximized)
            WindowState = WindowState.Maximized;
        Background = new SolidColorBrush(Ground);
        string icon = Path.Combine(AppContext.BaseDirectory, "app_icon.ico");
        if (File.Exists(icon))
            Icon = System.Windows.Media.Imaging.BitmapFrame.Create(new Uri(icon));

        Thickness frame = SystemParameters.WindowResizeBorderThickness;
        WindowChrome.SetWindowChrome(this, new WindowChrome
        {
            CaptionHeight = 0,
            ResizeBorderThickness = new Thickness(frame.Left, TopResizeStrip, frame.Right, frame.Bottom),
            // Non-zero keeps the DWM frame (invisible border + shadow) instead of a window region.
            GlassFrameThickness = new Thickness(0, 0, 0, 1),
            CornerRadius = new CornerRadius(0),
            UseAeroCaptionButtons = false,
            NonClientFrameEdges = NonClientFrameEdges.Left | NonClientFrameEdges.Right | NonClientFrameEdges.Bottom,
        });

        _web.DefaultBackgroundColor = System.Drawing.Color.FromArgb(Ground.R, Ground.G, Ground.B);
        _content.Children.Add(_web);
        Content = _content;
        _bridge = new Bridge(this, settings, Post);

        SourceInitialized += (_, _) => UseDarkFrame();
        StateChanged += (_, _) => ApplyFrameInset();
        LocationChanged += (_, _) => ApplyFrameInset();
        Loaded += async (_, _) =>
        {
            ApplyFrameInset();
            await InitAsync();
        };
        Closing += (_, e) =>
        {
            if (_bridge.HasUnsavedChanges && !_bridge.ConfirmedClose)
            {
                e.Cancel = true;
                Post(new { type = "event", name = "closeRequested" });
                return;
            }
            SaveBounds(settings);
        };
    }

    private async Task InitAsync()
    {
        try
        {
            string udf = Path.Combine(AppPaths.DataDir, "WebView2");
            CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(null, udf);
            await _web.EnsureCoreWebView2Async(env);
            CoreWebView2 core = _web.CoreWebView2;
            CoreWebView2Settings s = core.Settings;
            s.AreDevToolsEnabled = _dev;
            s.AreDefaultContextMenusEnabled = true;
            s.AreBrowserAcceleratorKeysEnabled = _dev;
            s.AreHostObjectsAllowed = false;
            s.IsGeneralAutofillEnabled = false;
            s.IsPasswordAutosaveEnabled = false;
            s.IsStatusBarEnabled = false;
            s.IsZoomControlEnabled = false;
            s.IsWebMessageEnabled = true;
            s.IsNonClientRegionSupportEnabled = true; // CSS app-region: drag on the page's title bar

            core.SetVirtualHostNameToFolderMapping(Host, AppPaths.WebDir, CoreWebView2HostResourceAccessKind.DenyCors);
            core.NavigationStarting += OnNavigationStarting;
            core.NewWindowRequested += (_, e) =>
            {
                e.Handled = true;
                OpenExternal(e.Uri);
            };
            core.ContextMenuRequested += OnContextMenu;
            core.WebMessageReceived += OnWebMessage;
            core.ProcessFailed += (_, e) => Log.Error($"WebView2 process failed: {e.ProcessFailedKind}");
            Log.Info($"Start {typeof(ShellWindow).Assembly.GetName().Version} - WebView2 {env.BrowserVersionString}");
            core.Navigate($"{Origin}/index.html");
        }
        catch (WebView2RuntimeNotFoundException)
        {
            if (MessageBox.Show(this,
                    "OAR External Tool needs the Microsoft Edge WebView2 Runtime.\n\nOpen the download page now?",
                    "WebView2 Runtime missing", MessageBoxButton.YesNo, MessageBoxImage.Warning) == MessageBoxResult.Yes)
                OpenExternal("https://developer.microsoft.com/microsoft-edge/webview2/");
            Close();
        }
        catch (Exception ex)
        {
            Log.Error("WebView2 start failed", ex);
            MessageBox.Show(this, "Could not start the page.\n\n" + ex.Message, "OAR External Tool", MessageBoxButton.OK, MessageBoxImage.Error);
            Close();
        }
    }

    // The page only ever shows our own origin; anything else a user clicks opens in the default browser.
    private void OnNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        if (e.Uri.StartsWith(Origin + "/", StringComparison.OrdinalIgnoreCase))
            return;
        e.Cancel = true;
        if (e.IsUserInitiated)
            OpenExternal(e.Uri);
    }

    private static readonly HashSet<string> EditMenuItems = new(StringComparer.Ordinal) { "undo", "redo", "cut", "copy", "paste", "pasteAndMatchStyle", "selectAll" };

    private void OnContextMenu(object? sender, CoreWebView2ContextMenuRequestedEventArgs e)
    {
        CoreWebView2ContextMenuTarget target = e.ContextMenuTarget;
        IList<CoreWebView2ContextMenuItem> items = e.MenuItems;
        for (int i = items.Count - 1; i >= 0; i--)
        {
            CoreWebView2ContextMenuItem item = items[i];
            bool keep = item.Kind == CoreWebView2ContextMenuItemKind.Separator
                || (target.IsEditable && EditMenuItems.Contains(item.Name))
                || (!target.IsEditable && target.HasSelection && item.Name == "copy")
                || (_dev && item.Name == "inspectElement");
            if (!keep)
                items.RemoveAt(i);
        }
        for (int i = items.Count - 1; i >= 0; i--)
        {
            bool separator = items[i].Kind == CoreWebView2ContextMenuItemKind.Separator;
            if (separator && (i == 0 || i == items.Count - 1 || items[i - 1].Kind == CoreWebView2ContextMenuItemKind.Separator))
                items.RemoveAt(i);
        }
        if (items.Count == 0)
            e.Handled = true;
    }

    private void OnWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        if (!e.Source.StartsWith(Origin + "/", StringComparison.OrdinalIgnoreCase))
            return;
        JsonNode? msg;
        try
        {
            msg = JsonNode.Parse(e.WebMessageAsJson);
        }
        catch (JsonException)
        {
            return;
        }
        // File objects sent with a drop can only be read inside this event.
        List<string>? dropped = Bridge.Str(msg, "method") == "drop.paths" ? DroppedPaths(e) : null;
        // Modal dialogs inside a WebView2 event re-enter it, so handle after the event returns.
        Dispatcher.InvokeAsync(() => _bridge.Handle(msg, dropped));
    }

    private static List<string> DroppedPaths(CoreWebView2WebMessageReceivedEventArgs e)
    {
        var paths = new List<string>();
        try
        {
            foreach (object o in e.AdditionalObjects)
                if (o is CoreWebView2File f && !string.IsNullOrEmpty(f.Path))
                    paths.Add(f.Path);
        }
        catch (Exception ex) when (ex is COMException or InvalidOperationException)
        {
            Log.Error("Could not read dropped file paths", ex);
        }
        return paths;
    }

    public void Post(object message)
    {
        if (_web.CoreWebView2 is null)
            return;
        _web.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(message, Bridge.Json));
    }

    public void WindowAction(string? action)
    {
        switch (action)
        {
            case "minimize":
                WindowState = WindowState.Minimized;
                break;
            case "toggleMaximize":
                WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
                break;
            case "close":
                Close();
                break;
        }
    }

    public static void OpenExternal(string uri)
    {
        if (!Uri.TryCreate(uri, UriKind.Absolute, out Uri? u) || (u.Scheme != Uri.UriSchemeHttps && u.Scheme != Uri.UriSchemeHttp))
            return;
        try
        {
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(u.AbsoluteUri) { UseShellExecute = true });
        }
        catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or InvalidOperationException)
        {
            Log.Error("Could not open the browser", ex);
        }
    }

    // ───────── frame ─────────

    private void ApplyFrameInset()
    {
        IntPtr hwnd = new WindowInteropHelper(this).Handle;
        double top = TopResizeStrip;
        if (WindowState == WindowState.Maximized && hwnd != IntPtr.Zero)
            top = MaximizedTopOverhang(hwnd) / VisualTreeHelper.GetDpi(this).DpiScaleY;
        if (Math.Abs(_content.Margin.Top - top) > 0.1)
            _content.Margin = new Thickness(0, top, 0, 0);
    }

    private void SaveBounds(AppSettings settings)
    {
        bool maximized = WindowState == WindowState.Maximized;
        Rect bounds = maximized || WindowState == WindowState.Minimized ? RestoreBounds : new Rect(Left, Top, Width, Height);
        settings.WindowMaximized = maximized;
        if (bounds.Width > 200 && bounds.Height > 200)
        {
            settings.WindowWidth = Math.Round(bounds.Width);
            settings.WindowHeight = Math.Round(bounds.Height);
        }
        settings.Save();
    }

    private void UseDarkFrame()
    {
        IntPtr hwnd = new WindowInteropHelper(this).Handle;
        int enabled = 1;
        if (DwmSetWindowAttribute(hwnd, 20, ref enabled, sizeof(int)) != 0)
            DwmSetWindowAttribute(hwnd, 19, ref enabled, sizeof(int));
        int none = unchecked((int)0xFFFFFFFE); // DWMWA_BORDER_COLOR = DWMWA_COLOR_NONE
        DwmSetWindowAttribute(hwnd, 34, ref none, sizeof(int));
    }

    private static int MaximizedTopOverhang(IntPtr hwnd)
    {
        if (!GetWindowRect(hwnd, out RECT window))
            return 0;
        IntPtr monitor = MonitorFromWindow(hwnd, 2 /* MONITOR_DEFAULTTONEAREST */);
        var info = new MONITORINFO { cbSize = Marshal.SizeOf<MONITORINFO>() };
        return monitor != IntPtr.Zero && GetMonitorInfo(monitor, ref info) ? Math.Max(0, info.rcWork.Top - window.Top) : 0;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT { public int Left, Top, Right, Bottom; }

    [StructLayout(LayoutKind.Sequential)]
    private struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);

    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint flags);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool GetMonitorInfo(IntPtr monitor, ref MONITORINFO info);
}
