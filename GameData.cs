using System.Text;

namespace OarTool;

/// <summary>Mod Organizer 2 instance found above an opened folder.</summary>
internal sealed record Mo2Instance(
    string InstanceDir, string ModsDir, string? GamePath, string? DataDir,
    string ProfilesDir, string OverwriteDir, List<string> Profiles, string? SelectedProfile);

/// <summary>One line of a profile's modlist.txt. The file lists the highest MO2 priority first.</summary>
internal sealed record Mo2ListEntry(string Name, bool On);

internal static class Mo2
{
    /// <summary>Walks up from <paramref name="start"/> (at most 4 levels) looking for ModOrganizer.ini.</summary>
    public static Mo2Instance? Detect(string start)
    {
        string? dir = Path.GetFullPath(start);
        for (int i = 0; i < 5 && dir is not null; i++, dir = Path.GetDirectoryName(dir))
        {
            string ini = Path.Combine(dir, "ModOrganizer.ini");
            if (File.Exists(ini))
                return Parse(dir, ini);
        }
        return null;
    }

    private static Mo2Instance Parse(string instanceDir, string ini)
    {
        string? gamePath = null, baseDir = null, modDir = null, profilesDir = null, overwriteDir = null, selected = null;
        foreach (string raw in File.ReadLines(ini))
        {
            string line = raw.Trim();
            string? Value(string key) => line.StartsWith(key + "=", StringComparison.OrdinalIgnoreCase) ? Unwrap(line[(key.Length + 1)..]) : null;
            gamePath ??= Value("gamePath");
            baseDir ??= Value("base_directory");
            modDir ??= Value("mod_directory");
            profilesDir ??= Value("profiles_directory");
            overwriteDir ??= Value("overwrite_directory");
            selected ??= Value("selected_profile");
        }
        string bas = string.IsNullOrEmpty(baseDir) ? instanceDir : baseDir;
        string Dir(string? configured, string fallback) =>
            Path.GetFullPath(string.IsNullOrEmpty(configured) ? Path.Combine(bas, fallback) : configured.Replace("%BASE_DIR%", bas, StringComparison.OrdinalIgnoreCase));
        string mods = Dir(modDir, "mods");
        string profiles = Dir(profilesDir, "profiles");
        string? data = gamePath is null ? null : Path.Combine(gamePath, "Data");
        var names = new List<string>();
        if (Directory.Exists(profiles))
        {
            foreach (string d in Directory.EnumerateDirectories(profiles))
                if (File.Exists(Path.Combine(d, "modlist.txt")))
                    names.Add(Path.GetFileName(d));
            names.Sort(StringComparer.OrdinalIgnoreCase);
        }
        return new Mo2Instance(instanceDir, mods, gamePath, data is not null && Directory.Exists(data) ? data : null,
            profiles, Dir(overwriteDir, "overwrite"), names, selected);
    }

    /// <summary>
    /// Mods of one profile in modlist.txt order (highest priority first). Separators and the
    /// unmanaged "*" entries (DLC, Creation Club) are left out — they carry no OAR folders.
    /// </summary>
    public static List<Mo2ListEntry> ReadModlist(string profilesDir, string profile)
    {
        if (profile.Length == 0 || profile.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 || profile is "." or "..")
            throw new ArgumentException($"Bad profile name: {profile}");
        string file = Path.Combine(profilesDir, profile, "modlist.txt");
        var list = new List<Mo2ListEntry>();
        foreach (string raw in File.ReadLines(file))
        {
            if (raw.Length < 2 || (raw[0] != '+' && raw[0] != '-'))
                continue;
            string name = raw[1..].TrimEnd();
            if (name.EndsWith("_separator", StringComparison.OrdinalIgnoreCase))
                continue;
            list.Add(new Mo2ListEntry(name, raw[0] == '+'));
        }
        return list;
    }

    // MO2 stores paths as @ByteArray(H:\\Game\\...) with doubled backslashes.
    private static string Unwrap(string value)
    {
        value = value.Trim();
        if (value.StartsWith("@ByteArray(", StringComparison.Ordinal) && value.EndsWith(')'))
            value = value["@ByteArray(".Length..^1];
        return value.Replace(@"\\", @"\").Replace('/', '\\');
    }
}

/// <summary>
/// Lists file names inside a Skyrim SE/LE BSA (versions 104/105) without extracting anything.
/// Only names are read: folder records → per-folder name + file count → the file-name block.
/// </summary>
internal static class BsaReader
{
    private static readonly Dictionary<string, List<string>> Cache = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Paths (relative to animations\) of .hkx files under meshes\actors\{project}\animations in the game's Animations BSA.</summary>
    public static List<string> ListAnimations(string dataDir, string project)
    {
        string key = dataDir + "|" + project;
        lock (Cache)
        {
            if (Cache.TryGetValue(key, out List<string>? hit))
                return hit;
        }
        string prefix = $@"meshes\actors\{project}\animations\";
        var result = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (string bsa in Directory.EnumerateFiles(dataDir, "*.bsa"))
        {
            if (!Path.GetFileName(bsa).Contains("Animations", StringComparison.OrdinalIgnoreCase))
                continue;
            foreach (string path in ListFiles(bsa))
                if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) && path.EndsWith(".hkx", StringComparison.OrdinalIgnoreCase))
                    result.Add(path[prefix.Length..]);
        }
        var list = result.ToList();
        lock (Cache)
            Cache[key] = list;
        return list;
    }

    public static List<string> ListFiles(string bsaPath)
    {
        using var fs = new FileStream(bsaPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        using var br = new BinaryReader(fs, Encoding.ASCII);
        if (br.ReadUInt32() != 0x00415342) // "BSA\0"
            throw new InvalidDataException("Not a BSA file");
        uint version = br.ReadUInt32();
        if (version != 104 && version != 105)
            throw new InvalidDataException($"Unsupported BSA version {version}");
        uint folderOffset = br.ReadUInt32();
        uint archiveFlags = br.ReadUInt32();
        uint folderCount = br.ReadUInt32();
        uint fileCount = br.ReadUInt32();
        br.ReadUInt32(); // total folder name length
        br.ReadUInt32(); // total file name length
        br.ReadUInt32(); // file flags
        bool hasDirNames = (archiveFlags & 0x1) != 0;
        bool hasFileNames = (archiveFlags & 0x2) != 0;
        if (!hasDirNames || !hasFileNames)
            return new List<string>();

        fs.Position = folderOffset;
        var counts = new uint[folderCount];
        for (int i = 0; i < folderCount; i++)
        {
            br.ReadUInt64(); // name hash
            counts[i] = br.ReadUInt32();
            if (version == 105)
            {
                br.ReadUInt32(); // padding
                br.ReadUInt64(); // offset
            }
            else
            {
                br.ReadUInt32(); // offset
            }
        }

        // File record blocks: [name length byte][folder name with NUL] + count × 16-byte records.
        var folders = new string[folderCount];
        for (int i = 0; i < folderCount; i++)
        {
            int len = br.ReadByte();
            byte[] nameBytes = br.ReadBytes(len);
            folders[i] = Encoding.ASCII.GetString(nameBytes, 0, Math.Max(0, len - 1));
            fs.Position += counts[i] * 16L;
        }

        // File name block: NUL-terminated names in the same order as the records.
        var files = new List<string>((int)fileCount);
        var sb = new StringBuilder();
        for (int i = 0; i < folderCount; i++)
        {
            for (uint j = 0; j < counts[i]; j++)
            {
                sb.Clear();
                int b;
                while ((b = fs.ReadByte()) > 0)
                    sb.Append((char)b);
                files.Add(folders[i] + "\\" + sb);
            }
        }
        return files;
    }
}
