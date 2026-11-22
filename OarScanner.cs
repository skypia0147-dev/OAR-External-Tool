namespace OarTool;

/// <summary>
/// Finds Open Animation Replacer mods under a folder the user opened and returns their raw JSON text.
/// The page parses and edits the text itself, so nothing here interprets conditions.
///
/// Accepted roots: a mod manager "mods" folder, a single mod folder, a Data folder, an
/// OpenAnimationReplacer folder, or one replacer mod folder inside it.
///
/// Like OAR (Parsing.cpp, directory cache) every folder named OpenAnimationReplacer anywhere under
/// Data\meshes counts, not only meshes\actors\{project}\animations\. A replacement file's original is
/// "{folder between meshes and OpenAnimationReplacer}\{path inside the submod}" — Prefix carries the first part.
///   meshes\actors\character\animations\OpenAnimationReplacer\{mod}\{submod}\mt_idle.hkx
///   meshes\OpenAnimationReplacer\{mod}\{submod}\Actors\Character\animations\mt_idle.hkx   (same original)
/// </summary>
internal static class OarScanner
{
    public const string OarFolder = "OpenAnimationReplacer";
    public const string DarFolder = "DynamicAnimationReplacer";

    public sealed record SubmodDto(string Path, string Folder, string? Config, string? User, List<string> Files);

    public sealed record ModDto(string Path, string Folder, string? ManagerMod, string Project, string Prefix, string? Config, string? User, List<SubmodDto> Submods);

    public sealed record LegacyDto(string Path, string? ManagerMod, string Project, int Count);

    public sealed record ScanDto(string Root, List<ModDto> Mods, List<LegacyDto> Legacy, List<string> Errors);

    public static ScanDto Scan(string root)
    {
        root = Path.GetFullPath(root.TrimEnd('\\', '/'));
        var mods = new List<ModDto>();
        var legacy = new List<LegacyDto>();
        var errors = new List<string>();

        string name = Path.GetFileName(root);
        string? parent = Path.GetDirectoryName(root);
        string? parentName = Path.GetFileName(parent ?? "");

        if (name.Equals(OarFolder, StringComparison.OrdinalIgnoreCase))
        {
            ReadOarFolder(root, null, PrefixOf(root), mods, errors);
        }
        else if (string.Equals(parentName, OarFolder, StringComparison.OrdinalIgnoreCase))
        {
            if (ReadMod(root, null, PrefixOf(parent!), errors) is { } single)
                mods.Add(single);
        }
        else if (HasMeshes(root))
        {
            ReadDataLike(root, ManagerModOf(root), mods, legacy, errors);
        }
        else
        {
            // A mods folder (or any folder of folders): each child that looks like a mod / Data folder.
            foreach (string child in SafeDirs(root, errors).OrderBy(d => d, StringComparer.OrdinalIgnoreCase))
            {
                if (HasMeshes(child))
                    ReadDataLike(child, Path.GetFileName(child), mods, legacy, errors);
                else if (HasMeshes(Path.Combine(child, "Data")))
                    ReadDataLike(Path.Combine(child, "Data"), Path.GetFileName(child), mods, legacy, errors);
            }
        }

        return new ScanDto(root, mods, legacy, errors);
    }

    /// <summary>OAR mods inside one Data-like folder (used for MO2's overwrite folder). Read errors are ignored.</summary>
    public static List<ModDto> ScanDataFolder(string dataLike)
    {
        var mods = new List<ModDto>();
        if (HasMeshes(dataLike))
            ReadDataLike(dataLike, null, mods, new List<LegacyDto>(), new List<string>());
        return mods;
    }

    private static bool HasMeshes(string dir) => Directory.Exists(Path.Combine(dir, "meshes"));

    private static string? ManagerModOf(string dataLike)
    {
        string n = Path.GetFileName(dataLike);
        return n.Equals("Data", StringComparison.OrdinalIgnoreCase) ? null : n;
    }

    /// <summary>Walks meshes\ for OAR and DAR folders (not descending into them).</summary>
    private static void ReadDataLike(string dataLike, string? managerMod, List<ModDto> mods, List<LegacyDto> legacy, List<string> errors)
    {
        string meshes = Path.Combine(dataLike, "meshes");
        var stack = new Stack<string>();
        stack.Push(meshes);
        var found = new List<string>();
        while (stack.Count > 0)
        {
            string dir = stack.Pop();
            foreach (string sub in SafeDirs(dir, errors))
            {
                string n = Path.GetFileName(sub);
                if (n.Equals(OarFolder, StringComparison.OrdinalIgnoreCase))
                    found.Add(sub);
                else if (n.Equals(DarFolder, StringComparison.OrdinalIgnoreCase))
                {
                    string custom = Path.Combine(sub, "_CustomConditions");
                    if (Directory.Exists(custom))
                        legacy.Add(new LegacyDto(custom, managerMod, ProjectOfPrefix(Path.GetRelativePath(meshes, dir)), SafeDirs(custom, errors).Count()));
                }
                else
                    stack.Push(sub);
            }
        }
        found.Sort(StringComparer.OrdinalIgnoreCase);
        foreach (string oar in found)
            ReadOarFolder(oar, managerMod, Path.GetRelativePath(meshes, Path.GetDirectoryName(oar)!) is "." ? "" : Path.GetRelativePath(meshes, Path.GetDirectoryName(oar)!), mods, errors);
    }

    private static void ReadOarFolder(string oarDir, string? managerMod, string prefix, List<ModDto> mods, List<string> errors)
    {
        foreach (string modDir in SafeDirs(oarDir, errors).OrderBy(d => d, StringComparer.OrdinalIgnoreCase))
            if (ReadMod(modDir, managerMod, prefix, errors) is { } mod)
                mods.Add(mod);
    }

    private static ModDto? ReadMod(string modDir, string? managerMod, string prefix, List<string> errors)
    {
        string project = ProjectOfPrefix(prefix);
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
        return new ModDto(modDir, Path.GetFileName(modDir), managerMod, project, prefix, modConfig, modUser, submods);
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

    /// <summary>Folder between meshes\ and an OpenAnimationReplacer folder ("" when it sits right under meshes).</summary>
    private static string PrefixOf(string oarDir)
    {
        string? parent = Path.GetDirectoryName(oarDir);
        string[] parts = (parent ?? "").Split(Path.DirectorySeparatorChar);
        int m = Array.FindLastIndex(parts, p => p.Equals("meshes", StringComparison.OrdinalIgnoreCase));
        return m < 0 ? "" : string.Join(Path.DirectorySeparatorChar, parts.Skip(m + 1));
    }

    /// <summary>
    /// "character" from "actors\character\animations", "character\_1stperson" from
    /// "actors\character\_1stperson\animations"; "" when the prefix isn't a behavior project folder.
    /// </summary>
    private static string ProjectOfPrefix(string prefix)
    {
        string[] parts = prefix.Split(Path.DirectorySeparatorChar);
        return parts.Length >= 3 && parts[0].Equals("actors", StringComparison.OrdinalIgnoreCase) && parts[^1].Equals("animations", StringComparison.OrdinalIgnoreCase)
            ? string.Join(Path.DirectorySeparatorChar, parts[1..^1])
            : "";
    }
}
