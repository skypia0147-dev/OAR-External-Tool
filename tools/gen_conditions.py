"""Generate web/data/conditions.json from Open Animation Replacer source (and RaySense).

The editor needs, for every condition and function: its JSON name, description, required
version, the plugin that provides it, and the list of components (JSON key, type, help text,
enum values). OAR declares all of these in a regular way, e.g.

    numericComponent = AddComponent<NumericConditionComponent>("Type", "The type that ...");
    [[nodiscard]] RE::BSString GetName() const override { return "IsEquippedType"sv.data(); }
    numericComponent->value.getEnumMap = &IsEquippedTypeCondition::GetEnumMap;   (PostInitialize)
    enumMap[7] = "Bow"sv;                                                         (GetEnumMap)

Usage: python tools/gen_conditions.py --oar <OpenAnimationReplacer\src> [--raysense <RaySense\src>] [--out FILE]
       (or set OAR_SRC / RAYSENSE_SRC)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

DEFAULT_OAR = Path(os.environ["OAR_SRC"]) if os.environ.get("OAR_SRC") else None
DEFAULT_RAYSENSE = Path(os.environ["RAYSENSE_SRC"]) if os.environ.get("RAYSENSE_SRC") else None
DEFAULT_OUT = Path(__file__).resolve().parent.parent / "web" / "data" / "conditions.json"

COMPONENT_TYPES = {
    # "conditions": JSON array of conditions; "functions": array of functions;
    # "conditionFunctions": { "conditions": [...], "functions": [...] }
    "MultiConditionComponent": "conditions",
    "FormConditionComponent": "form",
    "NumericConditionComponent": "numeric",
    "NiPoint3ConditionComponent": "point3",
    "KeywordConditionComponent": "keyword",
    "LocRefTypeConditionComponent": "keyword",
    "TextConditionComponent": "text",
    "BoolConditionComponent": "bool",
    "ComparisonConditionComponent": "comparison",
    "ConditionStateComponent": "state",
    "ConditionPresetComponent": "preset",
    # functions
    "FormFunctionComponent": "form",
    "NumericFunctionComponent": "numeric",
    "NiPoint3FunctionComponent": "point3",
    "KeywordFunctionComponent": "keyword",
    "TextFunctionComponent": "text",
    "BoolFunctionComponent": "bool",
    "MultiFunctionComponent": "functions",
    "RANDOMFunctionComponent": "functions",
    "ConditionFunctionComponent": "conditionFunctions",
}
# RaySense (and any plugin using the public API) adds components by enum.
API_COMPONENT_TYPES = {
    "kMulti": "conditions", "kForm": "form", "kNumeric": "numeric", "kNiPoint3": "point3",
    "kKeyword": "keyword", "kText": "text", "kBool": "bool", "kComparison": "comparison", "kState": "state",
}

STR = r'"((?:[^"\\]|\\.)*)"'
RE_CLASS = re.compile(r"\bclass\s+(\w+)\s*(?:final\s*)?:\s*public\s+([\w:<>, ]+?)\s*\{")
RE_ADD = re.compile(r"(?:(\w+)\s*=\s*)?(?:static_cast<[^>]+>\()?\s*AddComponent<(\w+)>\(\s*" + STR + r"(?:\s*,\s*" + STR + r")?")
RE_ADD_BASE = re.compile(r"(\w+)\s*=\s*static_cast<[^>]+>\(\s*AddBaseComponent\(\s*\w+::\w+::(\w+)\s*,\s*" + STR + r"(?:\s*,\s*" + STR + r")?", re.S)
RE_NAME = re.compile(r"GetName\(\)\s*const\s*override\s*\{\s*return\s+" + STR)
RE_DESC = re.compile(r"GetDescription\(\)\s*const\s*override\s*\{\s*return\s+" + STR)
RE_VER = re.compile(r"GetRequiredVersion\(\)\s*const\s*override\s*\{\s*return\s*\{\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)")
RE_CONST_NAME = re.compile(r"CONDITION_NAME\s*=\s*" + STR)
RE_ENUM_HOOK = re.compile(r"(\w+)->value\.getEnumMap\s*=\s*&(\w+)::GetEnumMap")
RE_ENUM_ENTRY = re.compile(r"enumMap\[\s*(-?\d+)\s*\]\s*=\s*" + STR)
# Defaults set in constructors (what OAR puts in a newly added condition)
RE_DEF_CMP = re.compile(r"(\w+)->SetComparisonOperator\(\s*ComparisonOperator::k(\w+)\s*\)")
RE_DEF_NUM = re.compile(r"(\w+)->(?:value\.)?SetStaticValue\(\s*(-?[\d.]+)f?\s*\)")
RE_DEF_BOOL = re.compile(r"(\w+)->bValue\s*=\s*(true|false)\s*;")
RE_DEF_RESET = re.compile(r"(\w+)->SetShouldResetOnLoopOrEcho\(\s*(true|false)\s*\)")
RE_DEF_SCOPES = re.compile(r"(\w+)->SetAllowedDataScopes\(\s*([^)]*)\)")
OPERATORS = {"Equal": "==", "NotEqual": "!=", "Greater": ">", "GreaterEqual": ">=", "Less": "<", "LessEqual": "<="}
SCOPES = {"kLocal": "Local", "kSubMod": "Submod", "kReplacerMod": "Replacer mod", "kReference": "Reference"}


def parse_defaults(text: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for var, op in RE_DEF_CMP.findall(text):
        if op in OPERATORS:
            out.setdefault(var, {})["value"] = OPERATORS[op]
    for var, num in RE_DEF_NUM.findall(text):
        out.setdefault(var, {})["value"] = {"value": float(num)}
    for var, b in RE_DEF_BOOL.findall(text):
        if var != "boolComponent" or "a_bIsLeft" not in text:  # left/right variants take a constructor argument
            out.setdefault(var, {})["value"] = b == "true"
    for var, b in RE_DEF_RESET.findall(text):
        out.setdefault(var, {})["reset"] = b == "true"
    for var, scopes in RE_DEF_SCOPES.findall(text):
        out.setdefault(var, {})["scopes"] = [SCOPES[s] for s in re.findall(r"k\w+", scopes) if s in SCOPES]
    return out


def unescape(s: str) -> str:
    return bytes(s, "utf-8").decode("unicode_escape").encode("latin-1").decode("utf-8") if "\\" in s else s


def block_after(text: str, start: int) -> tuple[str, int]:
    """Text of the {...} block whose '{' is at or after start (brace matched, strings ignored)."""
    i = text.index("{", start)
    depth = 0
    j = i
    in_str = False
    while j < len(text):
        c = text[j]
        if in_str:
            if c == "\\":
                j += 1
            elif c == '"':
                in_str = False
        elif c == '"':
            in_str = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return text[i + 1:j], j
        j += 1
    raise ValueError("unbalanced braces")


def method_body(cpp: str, cls: str, method: str) -> str | None:
    m = re.search(rf"\b{cls}::{method}\s*\([^)]*\)\s*(?:const\s*)?\{{", cpp)
    if not m:
        return None
    body, _ = block_after(cpp, m.end() - 1)
    return body


def parse_classes(header: str, cpp: str, kind: str) -> dict[str, dict]:
    classes: dict[str, dict] = {}
    for m in RE_CLASS.finditer(header):
        cls = m.group(1)
        bases = [b.strip().split("<")[0].split("::")[-1] for b in m.group(2).split(",")]
        body, _ = block_after(header, m.end() - 1)
        comps = []
        for a in RE_ADD.finditer(body):
            comps.append({"var": a.group(1), "cls": a.group(2), "name": unescape(a.group(3)), "desc": unescape(a.group(4) or "")})
        ctor = method_body(cpp, cls, cls)
        if ctor:
            for a in RE_ADD.finditer(ctor):
                comps.append({"var": a.group(1), "cls": a.group(2), "name": unescape(a.group(3)), "desc": unescape(a.group(4) or "")})
            for a in RE_ADD_BASE.finditer(ctor):
                comps.append({"var": a.group(1), "cls": a.group(2), "name": unescape(a.group(3)), "desc": unescape(a.group(4) or ""), "api": True})
        name = RE_NAME.search(body) or RE_CONST_NAME.search(body)
        desc = RE_DESC.search(body)
        ver = RE_VER.search(body)
        enum_hooks = {}
        post = method_body(cpp, cls, "PostInitialize")
        if post:
            for h in RE_ENUM_HOOK.finditer(post):
                enum_hooks[h.group(1)] = h.group(2)
        # constructor body inside the class declaration ("Cls() { ... }")
        inline_ctor = re.search(rf"\b{cls}\s*\([^)]*\)\s*(?::[^{{]*)?\{{", body)
        ctor_text = (block_after(body, inline_ctor.end() - 1)[0] if inline_ctor else "") + (ctor or "")
        classes[cls] = {
            "bases": bases,
            "comps": comps,
            "defaults": parse_defaults(ctor_text),
            "name": unescape(name.group(1)) if name else None,
            "desc": unescape(desc.group(1)) if desc else "",
            "version": ".".join(ver.groups()) + ".0" if ver else None,
            "enumHooks": enum_hooks,
            "kind": kind,
        }
    return classes


def enum_map(cpp: str, cls: str) -> list[list] | None:
    body = method_body(cpp, cls, "GetEnumMap")
    if not body:
        return None
    entries = [[int(k), unescape(v)] for k, v in RE_ENUM_ENTRY.findall(body)]
    return entries or None


def resolve(classes: dict[str, dict], cls: str, seen=None) -> tuple[list, dict, dict]:
    """Components, enum hooks and constructor defaults including base classes (base first)."""
    seen = seen or set()
    if cls in seen or cls not in classes:
        return [], {}, {}
    seen.add(cls)
    comps, hooks, defaults = [], {}, {}
    for b in classes[cls]["bases"]:
        bc, bh, bd = resolve(classes, b, seen)
        comps += bc
        hooks.update(bh)
        for k, v in bd.items():
            defaults.setdefault(k, {}).update(v)
    comps += classes[cls]["comps"]
    hooks.update(classes[cls]["enumHooks"])
    for k, v in classes[cls]["defaults"].items():
        defaults.setdefault(k, {}).update(v)
    return comps, hooks, defaults


def build(classes, cpp_all: str, plugin: str | None, api: bool) -> list[dict]:
    out = []
    for cls, info in classes.items():
        # "! INVALID !" / "! DEPRECATED !" are placeholders OAR shows for unreadable entries.
        if not info["name"] or info["name"].startswith("!"):
            continue
        comps, hooks, defaults = resolve(classes, cls)
        items = []
        seen_names = set()
        for c in comps:
            if c["name"] in seen_names:
                continue
            seen_names.add(c["name"])
            ctype = API_COMPONENT_TYPES.get(c["cls"]) if c.get("api") else COMPONENT_TYPES.get(c["cls"])
            if ctype is None:
                print(f"warning: {info['name']}: unknown component class {c['cls']}", file=sys.stderr)
                ctype = "raw"
            item = {"key": c["name"], "type": ctype}
            if c["desc"]:
                item["desc"] = c["desc"]
            if c["var"] and c["var"] in hooks:
                em = enum_map(cpp_all, hooks[c["var"]])
                if em:
                    item["enum"] = em
            d = defaults.get(c["var"]) if c["var"] else None
            if d:
                if "value" in d and ctype in ("comparison", "numeric", "bool"):
                    item["default"] = d["value"]
                if ctype == "state":
                    if "reset" in d:
                        item["reset"] = d["reset"]
                    if "scopes" in d:
                        item["scopes"] = d["scopes"]
            items.append(item)
        entry = {"name": info["name"], "kind": info["kind"], "desc": info["desc"], "version": info["version"] or "1.0.0.0", "components": items}
        if plugin:
            entry["plugin"] = plugin
        out.append(entry)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--oar", type=Path, default=DEFAULT_OAR)
    ap.add_argument("--raysense", type=Path, default=DEFAULT_RAYSENSE)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = ap.parse_args()
    if args.oar is None:
        ap.error("pass --oar <OpenAnimationReplacer source 'src' folder> or set OAR_SRC")

    read = lambda p: p.read_text(encoding="utf-8", errors="replace")
    cond_h, cond_cpp = read(args.oar / "Conditions.h"), read(args.oar / "Conditions.cpp")
    base_h, base_cpp = read(args.oar / "BaseConditions.h"), read(args.oar / "BaseConditions.cpp")
    func_h, func_cpp = read(args.oar / "Functions.h"), read(args.oar / "Functions.cpp")

    conditions = parse_classes(base_h + "\n" + cond_h, base_cpp + "\n" + cond_cpp, "condition")
    functions = parse_classes(func_h, func_cpp, "function")
    result = build(conditions, cond_cpp, None, False) + build(functions, func_cpp, None, False)

    if args.raysense and (args.raysense / "OARConditions.h").exists():
        rs_h, rs_cpp = read(args.raysense / "OARConditions.h"), read(args.raysense / "OARConditions.cpp")
        main_cpp = read(args.raysense / "main.cpp")
        plugin = re.search(r'\.Name\s*=\s*"([^"]+)"', main_cpp).group(1)
        result += build(parse_classes(rs_h, rs_cpp, "condition"), rs_cpp, plugin, True)

    result.sort(key=lambda e: (e["kind"], e.get("plugin") or "", e["name"].lower()))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    tmp = args.out.with_suffix(".tmp")
    tmp.write_text(json.dumps({"source": "Open Animation Replacer + RaySense", "items": result}, indent=1, ensure_ascii=False), encoding="utf-8")
    tmp.replace(args.out)
    n_cond = sum(1 for e in result if e["kind"] == "condition")
    n_func = sum(1 for e in result if e["kind"] == "function")
    n_enum = sum(1 for e in result for c in e["components"] if "enum" in c)
    print(f"{n_cond} conditions, {n_func} functions, {n_enum} enum components -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
