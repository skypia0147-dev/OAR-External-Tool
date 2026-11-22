# OAR External Tool 2.0 — User Guide

Edit **Open Animation Replacer (OAR)** mods without starting the game. The tool shows your mods the way the in-game OAR menu does (Replacer Mods → submods → conditions), and it can also build a new OAR mod from scratch.

[한국어 설명](README_KO.md)

---

## Requirements

- **OS**: Windows 10 or 11 (64-bit)
- **Runtime**: [.NET 9.0 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/9.0)
- **WebView2**: [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (already installed on most PCs)

No network port is used. (1.x served its page on `localhost:8080` and showed "This localhost page can't be found" when another program used that port — fixed in 2.0.)

---

## Editing existing mods

1. **Open folder…** and pick your mod manager's `mods` folder (or one mod, or an `OpenAnimationReplacer` folder). Every replacer mod is listed on the left.
2. Pick a mod, then a submod. The editor follows OAR's order: **Submod settings → Animation files → Conditions → Functions**.
3. Click a condition to open it: **Negate**, condition type, and its fields. Drag rows to reorder, right panel for copy / paste / comment / delete, **Ctrl C / Ctrl V / Delete** on the selected condition.
4. **Save** (Ctrl S).

### Edit modes (top right)

| Mode | Saves to | Use it for |
|---|---|---|
| Inspect | nothing | reading only |
| User | `user.json` next to the original | changing someone else's mod — their `config.json` stays untouched, and OAR loads your `user.json` instead |
| Author | `config.json` | your own mods |

**Delete user config** (bottom bar) sends a submod's `user.json` to the Recycle Bin, so OAR uses the original again.

### Problems page

Lists configs OAR can't read (broken JSON), repeated keys (OAR uses the first), submods in one mod that share a priority and replace the same animation, and conditions from plugins this tool has no editor for (those are kept exactly as they are and can be edited as JSON).

---

## Creating a new mod

1. **Create new mod** — name, author, where to create it (your MO2 `mods` folder is found automatically), and the behavior project (Character for humanoids).
2. **New submod** — name and priority; start empty, copy another submod, or start from a template.
3. **Animation files** — drop `.hkx` files (or a folder). For each file, choose which **original animation** it replaces; the list comes from the game's `Skyrim - Animations.bsa`. Two files for the same animation become **variants** (`_variants_<name>\`) automatically.
   The right panel shows other submods that replace the same animation and their priority, with a button to put yours above them.
4. **Conditions** — add them like in the editor, or use the quick-start buttons.
5. **Save** — a review lists every file that will be written or copied. Nothing outside the new mod's folder is touched. In MO2, press F5 and enable the new mod.

New mods open in **Author** mode.

---

## Notes

- Files the tool didn't change are never rewritten. Saved files use OAR's own JSON layout, so a file saved without changes is identical to the original.
- Conditions and their fields come from OAR's source (and RaySense). Conditions from other plugins still load and save; they are edited as JSON.
- Back up your animation folders before large edits.

---

## Credits

- **Open Animation Replacer** by **Ersh** — <https://github.com/ersh1/OpenAnimationReplacer>. Condition names, descriptions and fields are taken from its source.
- Made by **Smooth**.
