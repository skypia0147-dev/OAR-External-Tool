using System.Text.Json;
using System.Text.Json.Serialization;

namespace OarTool;

/// <summary>Small per-user settings file (%LOCALAPPDATA%\OAR External Tool\settings.json).</summary>
internal sealed class AppSettings
{
    private static string FilePath => Path.Combine(AppPaths.DataDir, "settings.json");

    public double WindowWidth { get; set; }
    public double WindowHeight { get; set; }
    public bool WindowMaximized { get; set; }
    public string EditMode { get; set; } = "user";
    public List<RecentFolder> Recent { get; set; } = new();

    public sealed class RecentFolder
    {
        public string Path { get; set; } = "";
        public int ModCount { get; set; }
        public DateTime OpenedAt { get; set; }
    }

    public static AppSettings Load()
    {
        try
        {
            if (File.Exists(FilePath))
                return JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(FilePath), Options) ?? new AppSettings();
        }
        catch (Exception ex) when (ex is IOException or JsonException or UnauthorizedAccessException)
        {
            Log.Error("settings.json could not be read, using defaults", ex);
        }
        return new AppSettings();
    }

    public void Save()
    {
        try
        {
            Directory.CreateDirectory(AppPaths.DataDir);
            FileUtil.WriteAllTextAtomic(FilePath, JsonSerializer.Serialize(this, Options));
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            Log.Error("settings.json could not be saved", ex);
        }
    }

    public void AddRecent(string path, int modCount)
    {
        Recent.RemoveAll(r => string.Equals(r.Path, path, StringComparison.OrdinalIgnoreCase));
        Recent.Insert(0, new RecentFolder { Path = path, ModCount = modCount, OpenedAt = DateTime.Now });
        if (Recent.Count > 8)
            Recent.RemoveRange(8, Recent.Count - 8);
        Save();
    }

    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
    };
}

internal static class FileUtil
{
    /// <summary>
    /// Writes through a temp file in the same folder and swaps it in, so a full disk or a crash never
    /// leaves a half-written (or emptied) config.json behind.
    /// </summary>
    public static void WriteAllTextAtomic(string path, string text)
    {
        string dir = Path.GetDirectoryName(path)!;
        Directory.CreateDirectory(dir);
        string temp = Path.Combine(dir, $".{Path.GetFileName(path)}.{Guid.NewGuid():N}.tmp");
        try
        {
            File.WriteAllText(temp, text, new System.Text.UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
            File.Move(temp, path, overwrite: true);
        }
        finally
        {
            if (File.Exists(temp))
                File.Delete(temp);
        }
    }

    public static string? ReadText(string path)
    {
        if (!File.Exists(path))
            return null;
        // StreamReader detects a UTF-8/UTF-16 BOM; files without one are read as UTF-8.
        using var reader = new StreamReader(path, System.Text.Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        return reader.ReadToEnd();
    }
}
