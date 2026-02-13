# OAR External Tool 1.0 - User Guide

This is an external editing tool designed to manage **Open Animation Replacer (OAR)** conditions easily and intuitively. It allows you to edit animation conditions via a web interface with clicks and drags, eliminating the need to modify complex JSON files manually.
You can easily modify conditions without launching the game, just like using the OAR UI in-game.

---

## ⚠️ Important Disclaimer & Testing Status

**Please note that this tool has not undergone extensive testing for complex condition configurations or deep edge cases.**
I have primarily tested the features I frequently use, so unforeseen issues may occur. 

> [!IMPORTANT]
> It is highly recommended to **backup your animation folders** before using this tool. 

If you encounter any problems, please report them, and I will do my best to address them and provide fixes.

---

## Key Features

- **Simplified UI**: Functions found in the in-game UI have been streamlined for ease of use without sacrificing functionality.
- **Auto Mod Base Creation**: Added a feature to automatically generate a mod base with the OAR folder structure.
- **Folder Creation**: You can now create specific condition folders directly within the tool.
- **Hybrid Editing**: Integrated a system that allows both UI-based condition editing and a raw JSON editor.

---

## ⚠️ 주의 사항 및 테스트 현황

**이 툴은 복잡한 컨디션을 구성하거나 심도 깊은 테스트는 진행하지 않았습니다.**
제가 자주 사용하는 기능들만 테스트해봤기 때문에 혹시나 문제가 생길 수도 있습니다.

> [!IMPORTANT]
> 작업을 시작하기 전에 반드시 **애니메이션 폴더를 백업**한 후 사용하시는 것을 권장합니다.

문제가 있다면 제보해 주세요. 최대한 확인하여 수정하겠습니다.

---

## Step-by-Step Guide

### 1. Open Mod Folder
1. Click the **[Open MOD]** button at the top.
2. Select the Skyrim mod folder (or the `OpenAnimationReplacer` folder) you are currently working on or want to modify.
3. When the browser asks for file access permissions, select **[Allow Edit Access]**. (This is required to save local files.)

### 2. Select Animation Set
- All animation settings (`config.json`) within the mod will appear in the **File Tree** on the left.
- Click an item to view its detailed settings in the central area.
- Use the **Search Bar** at the top right to filter by specific names or priorities.

### 3. Edit Conditions
- **Add**: Click the `+ Add Condition` button to select desired conditions (e.g., IsSneaking, HasPerk, etc.).
- **Manage**: Use the `NOT` button on each condition card to invert it, or the `Copy` button to duplicate it.
- **Move (Drag)**: Grab the left side of a card to reorder it or move it into a group like AND/OR.

### 4. Save Changes
- **Save Base**: Directly modifies and saves the original `config.json` file.
- **Save User**: Creates and saves a `user.json` override file without touching the original (the safer method).

---

## Precautions

- This tool requires a **secure environment (HTTPS or localhost)** for all features to function.
- Selecting a system folder (like the entire C drive) may slow down scanning. Please select the specific mod folder.
- Always check if the "Unsaved Changes" message is visible in the status bar before finishing to ensure nothing is lost.

---

*This program was created to support the Skyrim modding community.*
