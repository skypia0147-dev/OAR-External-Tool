using System.Windows;

namespace OarTool;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        var app = new Application { ShutdownMode = ShutdownMode.OnMainWindowClose };
        app.DispatcherUnhandledException += (_, e) =>
        {
            Log.Error("Unhandled UI exception", e.Exception);
            MessageBox.Show(e.Exception.Message, "OAR External Tool", MessageBoxButton.OK, MessageBoxImage.Error);
            e.Handled = true;
        };
        app.Run(new ShellWindow());
    }
}

/// <summary>Plain text log next to the settings file. Kept small: one line per event.</summary>
internal static class Log
{
    private static readonly object Gate = new();

    public static string FilePath => Path.Combine(AppPaths.DataDir, "oar-tool.log");

    public static void Info(string message) => Write("INFO", message);

    public static void Error(string message, Exception? ex = null) => Write("ERROR", ex is null ? message : $"{message}: {ex}");

    private static void Write(string level, string message)
    {
        try
        {
            lock (Gate)
            {
                Directory.CreateDirectory(AppPaths.DataDir);
                var info = new FileInfo(FilePath);
                if (info.Exists && info.Length > 512 * 1024)
                    info.Delete();
                File.AppendAllText(FilePath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {level} {message}{Environment.NewLine}");
            }
        }
        catch (IOException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }
    }
}

internal static class AppPaths
{
    /// <summary>Per-user data (settings, log, WebView2 profile). Never next to the exe, so the install folder can stay read-only.</summary>
    public static string DataDir { get; } = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OAR External Tool");

    /// <summary>The page files. OAR_TOOL_WEB points at the source "web" folder while developing (no rebuild per edit).</summary>
    public static string WebDir { get; } =
        Environment.GetEnvironmentVariable("OAR_TOOL_WEB") is { Length: > 0 } dev && Directory.Exists(dev)
            ? dev
            : Path.Combine(AppContext.BaseDirectory, "web");
}
