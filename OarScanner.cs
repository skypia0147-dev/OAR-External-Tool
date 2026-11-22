namespace OarTool;

/// <summary>
/// Finds Open Animation Replacer mods under a folder the user opened and returns their raw JSON text.
/// The page parses and edits the text itself, so nothing here interprets conditions.
///
/// Accepted roots: a mod manager "mods" folder, a single mod folder, a Data folder, an
/// OpenAnimationReplacer folder, or one replacer mod folder inside it.
/// Layout (OAR): meshes\actors\{project}\animations\OpenAnimationReplacer\{mod}\config.json
///               ...\{mod}\{submod}\config.json (+ user.json) + .hkx files mirroring animations\
/// </summary>
internal static class OarScanner
{
    public const string OarFolder = "OpenAnimationReplacer";
    public const string DarFolder = "DynamicAnimationReplacer";

    public sealed record SubmodDto(string Path, string Folder, string? Config, string? User, List<string> Files);

    public sealed record ModDto(string Path, string Folder, string? ManagerMod, string Project, string? Config, string? User, List<SubmodDto> Submods);

    public sealed record LegacyDto(string Path, string? ManagerMod, string Project, int Count);

    public sealed record ScanDto(string Root, List<ModDto> Mods, List<LegacyDto> Legacy, List<string> Errors);

    public static ScanDto Scan(string root)
    {
        root = Path.GetFullPath(root.TrimEnd('\\', '/'));
        var mods = new List<ModDto>();
        var legacy = new List<LegacyDto>();
        var errors = new List<string>();

        string name = Path.GetFileName(root);
        string? parentName = Path.GetFileName(Path.GetDirectoryName(root) ?? "");

        if (name.Equals(OarFolder, StringComparison.OrdinalIgnoreCase))
        {
            ReadOarFolder(root, null, ProjectOf(root), mods, errors);
        }
        else if (string.Equals(parentName, OarFolder, StringComparison.OrdinalIgnoreCase))
        {
            if (ReadMod(root, null, ProjectOf(root), errors) is { } single)
                mods.Add(single);
        }
        else if (HasActors(root))
        {
            ReadDataLike(root, ManagerModOf(root), mods, legacy, errors);
        }
        else
        {
            // A mods folder (or any folder of folders): each child that looks like a mod / Data folder.
            foreach (string child in SafeDirs(root, errors).OrderBy(d => d, StringComparer.OrdinalIgnoreCase))
            {
                if (HasActors(child))
                    ReadDataLike(child, Path.GetFileName(child), mods, legacy, errors);
                else if (Directory.Exists(Path.Combine(child, "Data")) && HasActors(Path.Combine(child, "Data")))
                    ReadDataLike(Path.Combine(child, "Data"), Path.GetFileName(child), mods, legacy, errors);
            }
        }

        return new ScanDto(root, mods, legacy, errors);
    }

    private static bool HasActors(string dir) => Directory.Exists(Path.Combine(dir, "meshes", "actors"));

    private static string? ManagerModOf(string dataLike)
    {
        string n = Path.GetFileName(dataLike);
        return n.Equals("Data", StringComparison.OrdinalIgnoreCase) ? null : n;
    }

    private static void ReadDataLike(string dataLike, string? managerMod, List<ModDto> mods, List<LegacyDto> legacy, List<string> errors)
    {
        string actors = Path.Combine(dataLike, "meshes", "actors");
        foreach (string projectDir in SafeDirs(actors, errors))
        {
            string project = Path.GetFileName(projectDir);
            string anims = Path.Combine(projectDir, "animations");
            if (!Directory.Exists(anims))
                continue;
            string oar = Path.Combine(anims, OarFolder);
            if (Directory.Exists(oar))
                ReadOarFolder(oar, managerMod, project, mods, errors);
            string dar = Path.Combine(anims, DarFolder, "_CustomConditions");
            if (Directory.Exists(dar))
                legacy.Add(new LegacyDto(dar, managerMod, project, SafeDirs(dar, errors).Count()));
        }
    }

    private static void ReadOarFolder(string oarDir, string? managerMod, string project, List<ModDto> mods, List<string> errors)
    {
        foreach (string modDir in SafeDirs(oarDir, errors).OrderBy(d => d, StringComparer.OrdinalIgnoreCase))
            if (ReadMod(modDir, managerMod, project, errors) is { } mod)
                mods.Add(mod);
    }

    private static ModDto? ReadMod(string modDir, string? managerMod, string project, List<string> errors)
    {
        var submods = new List<SubmodDto>();
        foreach (string subDir in SafeDirs(modDir, errors).OrderBy(d => d, StringComparer.OrdinalIgnoreCase))
        {
            string? config = Read(Path.Combine(subDir, "config.json"), errors);
            string? user = Read(Path.Combine(subDir, "user.json"), errors);
            if (config is null && user is null)
                continue; // not a submod (OAR needs a config.json or user.json)
            submods.Add(new SubmodDto(subDir, Path.GetFileName(subDir), config, user, ListHkx(subDir, errors)));
        }
        string? modConfig = Read(Path.Combine(modDir, "config.json"), errors);
        string? modUser = Read(Path.Combine(modDir, "user.json"), errors);
        if (modConfig is null && modUser is null && submods.Count == 0)
            return null;
        return new ModDto(modDir, Path.GetFileName(modDir), managerMod, project, modConfig, modUser, submods);
    }

    /// <summary>Relative .hkx paths inside a submod (subfolders mirror animations\, e.g. "male\mt_idle.hkx").</summary>
    private static List<string> ListHkx(string subDir, List<string> errors)
    {
        var files = new List<string>();
        try
        {
            foreach (string f in Directory.EnumerateFiles(subDir, "*.hkx", SearchOption.AllDirectories))
                files.Add(Path.GetRelativePath(subDir, f));
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            errors.Add($"{subDir}: {ex.Message}");
        }
        files.Sort(StringComparer.OrdinalIgnoreCase);
        return files;
    }

    private static string? Read(string path, List<string> errors)
    {
        try
        {
            return FileUtil.ReadText(path);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            errors.Add($"{path}: {ex.Message}");
            return null;
        }
    }

    private static IEnumerable<string> SafeDirs(string dir, List<string> errors)
    {
        try
        {
            return Directory.EnumerateDirectories(dir).ToList();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            errors.Add($"{dir}: {ex.Message}");
            return Array.Empty<string>();
        }
    }

    /// <summary>"character" from ...\meshes\actors\character\animations\OpenAnimationReplacer\...</summary>
    private static string ProjectOf(string path)
    {
        string[] parts = path.Split(Path.DirectorySeparatorChar);
        for (int i = 0; i + 2 < parts.Length; i++)
            if (parts[i].Equals("actors", StringComparison.OrdinalIgnoreCase) && parts[i + 2].Equals("animations", StringComparison.OrdinalIgnoreCase))
                return parts[i + 1];
        return "character";
    }
}
