using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Windows;

namespace OarTool;

/// <summary>
/// Page → host calls. Message: { type: "call", id, method, params }. Reply: { type: "reply", id, ok, result | error }.
///
/// Writes are limited to folders the user opened or picked (and new mods created inside them), and to the
/// file types this tool owns: .json configs and .hkx copies. Deletes go to the Recycle Bin.
/// </summary>
internal sealed class Bridge
{
    public static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never,
    };

    private readonly ShellWindow _window;
    private readonly AppSettings _settings;
    private readonly Action<object> _post;
    private readonly List<string> _writeRoots = new();

    public bool HasUnsavedChanges { get; private set; }
    public bool ConfirmedClose { get; private set; }

    public Bridge(ShellWindow window, AppSettings settings, Action<object> post)
    {
        _window = window;
        _settings = settings;
        _post = post;
    }

    public void Handle(JsonNode? msg, List<string>? dropped)
    {
        string? id = Str(msg, "id");
        string method = Str(msg, "method") ?? "";
        JsonNode? p = msg?["params"];
        try
        {
            object? result = method switch
            {
                "app.info" => new { version = typeof(Bridge).Assembly.GetName().Version?.ToString(3), dataDir = AppPaths.DataDir, editMode = _settings.EditMode },
                "app.setDirty" => SetDirty(Bool(p, "dirty")),
                "app.confirmClose" => ConfirmClose(),
                "app.setEditMode" => SetEditMode(Str(p, "mode")),
                "window" => Do(() => _window.WindowAction(Str(p, "action"))),
                "settings.recent" => _settings.Recent.Where(r => Directory.Exists(r.Path)).ToList(),
                "settings.removeRecent" => RemoveRecent(Need(p, "path")),
                "dialog.pickFolder" => PickFolder(p),
                "dialog.pickFiles" => PickFiles(p),
                "drop.paths" => new { paths = ExpandHkx(dropped ?? new List<string>()), raw = dropped ?? new List<string>() },
                "oar.scan" => Scan(Need(p, "root")),
                "fs.readText" => new { text = FileUtil.ReadText(Need(p, "path")) },
                "fs.exists" => new { exists = File.Exists(Need(p, "path")) || Directory.Exists(Need(p, "path")) },
                "fs.writeText" => WriteText(Need(p, "path"), Str(p, "text") ?? ""),
                "fs.mkdir" => Mkdir(Need(p, "path")),
                "fs.copyFile" => CopyFile(Need(p, "src"), Need(p, "dst")),
                "fs.recycle" => Recycle(Need(p, "path")),
                "shell.reveal" => Reveal(Need(p, "path")),
                "mo2.detect" => Mo2.Detect(Need(p, "path")),
                "mo2.modlist" => new { mods = Mo2.ReadModlist(Need(p, "profilesDir"), Need(p, "profile")) },
                "game.animations" => new { files = BsaReader.ListAnimations(Need(p, "dataDir"), Str(p, "project") ?? "character") },
                _ => throw new BridgeException("unknown_method", $"Unknown method {method}"),
            };
            Reply(id, result);
        }
        catch (BridgeException ex)
        {
            ReplyError(id, ex.Code, ex.Message);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or InvalidDataException or ArgumentException or NotSupportedException)
        {
            Log.Error($"{method} failed", ex);
            ReplyError(id, "io", ex.Message);
        }
    }

    // ───────── app ─────────

    private object? SetDirty(bool dirty)
    {
        HasUnsavedChanges = dirty;
        return null;
    }

    private object? ConfirmClose()
    {
        ConfirmedClose = true;
        _window.Dispatcher.InvokeAsync(_window.Close);
        return null;
    }

    private object? SetEditMode(string? mode)
    {
        if (mode is "inspect" or "user" or "author")
        {
            _settings.EditMode = mode;
            _settings.Save();
        }
        return null;
    }

    private object? RemoveRecent(string path)
    {
        _settings.Recent.RemoveAll(r => string.Equals(r.Path, path, StringComparison.OrdinalIgnoreCase));
        _settings.Save();
        return null;
    }

    // ───────── dialogs ─────────

    private object? PickFolder(JsonNode? p)
    {
        var dlg = new Microsoft.Win32.OpenFolderDialog { Title = Str(p, "title") ?? "Choose a folder" };
        if (Str(p, "initial") is { } initial && Directory.Exists(initial))
            dlg.InitialDirectory = initial;
        if (dlg.ShowDialog(_window) != true)
            return null;
        // A folder the user picked to create something in becomes writable.
        if (Str(p, "purpose") == "write")
            AllowWrite(dlg.FolderName);
        return new { path = dlg.FolderName };
    }

    private object PickFiles(JsonNode? p)
    {
        var dlg = new Microsoft.Win32.OpenFileDialog
        {
            Title = Str(p, "title") ?? "Choose files",
            CheckFileExists = true,
            Multiselect = true,
            Filter = "Havok animations (*.hkx)|*.hkx|All files (*.*)|*.*",
        };
        if (Str(p, "initial") is { } initial && Directory.Exists(initial))
            dlg.InitialDirectory = initial;
        return new { paths = dlg.ShowDialog(_window) == true ? dlg.FileNames : Array.Empty<string>() };
    }

    /// <summary>Dropped items: .hkx files as-is, folders expanded to the .hkx files inside.</summary>
    private static List<string> ExpandHkx(List<string> dropped)
    {
        var files = new List<string>();
        foreach (string path in dropped)
        {
            if (Directory.Exists(path))
                files.AddRange(Directory.EnumerateFiles(path, "*.hkx", SearchOption.AllDirectories).OrderBy(f => f, StringComparer.OrdinalIgnoreCase));
            else if (path.EndsWith(".hkx", StringComparison.OrdinalIgnoreCase) && File.Exists(path))
                files.Add(path);
        }
        return files;
    }

    // ───────── OAR / files ─────────

    private object Scan(string root)
    {
        if (!Directory.Exists(root))
            throw new BridgeException("not_found", $"Folder not found: {root}");
        OarScanner.ScanDto scan = OarScanner.Scan(root);
        AllowWrite(scan.Root);
        _settings.AddRecent(scan.Root, scan.Mods.Count);
        Mo2Instance? mo2 = Mo2.Detect(scan.Root);
        // OAR's in-game "Save" writes user.json into MO2's overwrite folder; in game those copies win.
        var overwrite = mo2 is not null && Directory.Exists(mo2.OverwriteDir) ? OarScanner.ScanDataFolder(mo2.OverwriteDir) : new List<OarScanner.ModDto>();
        return new { scan, mo2, overwrite };
    }

    private object? WriteText(string path, string text)
    {
        string full = Writable(path);
        if (!full.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            throw new BridgeException("denied", "Only .json files can be written.");
        FileUtil.WriteAllTextAtomic(full, text);
        return null;
    }

    private object? Mkdir(string path)
    {
        Directory.CreateDirectory(Writable(path));
        return null;
    }

    private object? CopyFile(string src, string dst)
    {
        string full = Writable(dst);
        if (!full.EndsWith(".hkx", StringComparison.OrdinalIgnoreCase) || !src.EndsWith(".hkx", StringComparison.OrdinalIgnoreCase))
            throw new BridgeException("denied", "Only .hkx files can be copied.");
        if (!File.Exists(src))
            throw new BridgeException("not_found", $"File not found: {src}");
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        if (!string.Equals(Path.GetFullPath(src), full, StringComparison.OrdinalIgnoreCase))
            File.Copy(src, full, overwrite: true);
        return null;
    }

    private object? Recycle(string path)
    {
        string full = Writable(path);
        string fileName = Path.GetFileName(full);
        if (!fileName.Equals("user.json", StringComparison.OrdinalIgnoreCase) && !full.EndsWith(".hkx", StringComparison.OrdinalIgnoreCase))
            throw new BridgeException("denied", "Only user.json and .hkx files can be removed.");
        if (File.Exists(full))
            SendToRecycleBin(full);
        return null;
    }

    private static object? Reveal(string path)
    {
        string arg = File.Exists(path) ? $"/select,\"{path}\"" : Directory.Exists(path) ? $"\"{path}\"" : throw new BridgeException("not_found", "Path not found");
        System.Diagnostics.Process.Start("explorer.exe", arg);
        return null;
    }

    private void AllowWrite(string dir)
    {
        string full = Path.GetFullPath(dir).TrimEnd('\\');
        if (!_writeRoots.Any(r => r.Equals(full, StringComparison.OrdinalIgnoreCase)))
            _writeRoots.Add(full);
    }

    private string Writable(string path)
    {
        string full = Path.GetFullPath(path);
        if (!_writeRoots.Any(r => full.StartsWith(r + "\\", StringComparison.OrdinalIgnoreCase)))
            throw new BridgeException("denied", $"Outside the opened folder: {full}");
        return full;
    }

    // ───────── replies ─────────

    private static object? Do(Action action)
    {
        action();
        return null;
    }

    private void Reply(string? id, object? result)
    {
        if (id is not null)
            _post(new { type = "reply", id, ok = true, result });
    }

    private void ReplyError(string? id, string code, string message)
    {
        if (id is not null)
            _post(new { type = "reply", id, ok = false, error = new { code, message } });
    }

    public static string? Str(JsonNode? node, string key) =>
        node is JsonObject obj && obj[key] is JsonValue v && v.TryGetValue(out string? s) ? s : null;

    private static bool Bool(JsonNode? node, string key) =>
        node is JsonObject obj && obj[key] is JsonValue v && v.TryGetValue(out bool b) && b;

    private static string Need(JsonNode? node, string key) =>
        Str(node, key) is { Length: > 0 } s ? s : throw new BridgeException("bad_request", $"Missing {key}");

    private sealed class BridgeException(string code, string message) : Exception(message)
    {
        public string Code { get; } = code;
    }

    // ───────── Recycle Bin (SHFileOperation, FOF_ALLOWUNDO) ─────────

    private static void SendToRecycleBin(string path)
    {
        var op = new SHFILEOPSTRUCT
        {
            wFunc = 0x0003, // FO_DELETE
            pFrom = path + "\0\0",
            fFlags = 0x0040 | 0x0010 | 0x0004 | 0x0400, // ALLOWUNDO | NOCONFIRMATION | SILENT | NOERRORUI
        };
        int rc = SHFileOperation(ref op);
        if (rc != 0 || op.fAnyOperationsAborted)
            throw new IOException($"Could not move to the Recycle Bin (code {rc}).");
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct SHFILEOPSTRUCT
    {
        public IntPtr hwnd;
        public uint wFunc;
        public string pFrom;
        public string? pTo;
        public ushort fFlags;
        public bool fAnyOperationsAborted;
        public IntPtr hNameMappings;
        public string? lpszProgressTitle;
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern int SHFileOperation(ref SHFILEOPSTRUCT op);
}
