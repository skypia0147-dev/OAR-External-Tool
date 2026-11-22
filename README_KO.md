# OAR External Tool 2.0 — 사용 설명서

게임을 켜지 않고 **Open Animation Replacer(OAR)** 모드를 편집하는 도구입니다. 인게임 OAR 메뉴와 같은 구조(Replacer Mods → 서브모드 → 조건)로 모드를 보여 주고, OAR 모드를 처음부터 만들 수도 있습니다.

[English](README_EN.md)

---

## 요구 사항

- **운영체제**: Windows 10 또는 11 (64비트)
- **런타임**: [.NET 9.0 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/9.0)
- **WebView2**: [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/ko-kr/microsoft-edge/webview2/) (대부분의 PC에 이미 설치되어 있음)

네트워크 포트를 쓰지 않습니다. (1.x는 `localhost:8080`으로 화면을 띄워서, 다른 프로그램이 그 포트를 쓰면 "이 localhost 페이지를 찾을 수 없습니다"가 떴습니다. 2.0에서 고쳤습니다.)

---

## 기존 모드 편집

1. **Open folder…**로 모드 관리자의 `mods` 폴더(또는 모드 하나, `OpenAnimationReplacer` 폴더)를 엽니다. 왼쪽에 리플레이서 모드가 모두 나옵니다.
2. 모드 → 서브모드를 고릅니다. 편집 화면은 OAR과 같은 순서입니다: **서브모드 설정 → 애니메이션 파일 → 조건 → 함수**.
3. 조건을 누르면 펼쳐집니다: **Negate**, 조건 종류, 각 값. 줄을 끌어 순서를 바꾸고, 오른쪽 패널에서 복사·붙여넣기·주석·삭제를 합니다. 고른 조건에서 **Ctrl C / Ctrl V / Delete**도 됩니다.
4. **저장**(Ctrl S).

### 편집 모드 (오른쪽 위)

| 모드 | 저장 위치 | 용도 |
|---|---|---|
| Inspect | 저장 안 함 | 보기만 |
| User | 원본 옆의 `user.json` | 남의 모드 수정 — 원본 `config.json`은 그대로 두고, OAR이 `user.json`을 대신 읽음 |
| Author | `config.json` | 내 모드 |

아래 막대의 **Delete user config**는 서브모드의 `user.json`을 휴지통으로 보내서, OAR이 원본을 다시 쓰게 합니다.

### Problems 화면

OAR이 읽지 못하는 설정(깨진 JSON), 반복된 키(OAR은 첫 번째 값을 씀), 한 모드 안에서 우선순위가 같고 같은 애니메이션을 바꾸는 서브모드, 이 도구에 편집기가 없는 플러그인 조건(그대로 보존되고 JSON으로 편집 가능)을 보여 줍니다.

---

## 새 모드 만들기

1. **Create new mod** — 이름, 작성자, 만들 위치(MO2 `mods` 폴더는 자동으로 찾음), 비헤이비어 종류(사람형은 Character).
2. **New submod** — 이름과 우선순위. 빈 상태 / 다른 서브모드 복사 / 템플릿 중에서 시작.
3. **애니메이션 파일** — `.hkx` 파일(또는 폴더)을 끌어다 놓습니다. 파일마다 **어떤 원본 애니메이션을 바꿀지** 고르면 되고, 목록은 게임의 `Skyrim - Animations.bsa`에서 읽습니다. 같은 원본에 파일 두 개를 고르면 자동으로 **변형(variants)** 폴더(`_variants_<이름>\`)로 들어갑니다.
   오른쪽 패널에 같은 애니메이션을 바꾸는 다른 서브모드와 우선순위가 나오고, 내 것을 그 위로 올리는 버튼이 있습니다.
4. **조건** — 편집 화면과 같은 방법으로 추가하거나, 빠른 시작 버튼을 씁니다.
5. **저장** — 쓰거나 복사할 파일을 모두 보여 주고 확인받습니다. 새 모드 폴더 밖은 건드리지 않습니다. MO2에서 F5를 누르고 새 모드를 켜면 됩니다.

새로 만든 모드는 **Author** 모드로 열립니다.

---

## 참고

- 바꾸지 않은 파일은 다시 쓰지 않습니다. 저장한 파일은 OAR 자체의 JSON 형식을 따르므로, 바꾸지 않고 저장하면 원본과 똑같습니다.
- 조건 목록과 각 값은 OAR 소스(와 RaySense)에서 가져왔습니다. 다른 플러그인의 조건도 그대로 읽고 저장하며, JSON으로 편집합니다.
- 크게 고치기 전에는 애니메이션 폴더를 백업하세요.

---

## 크레딧

- **Open Animation Replacer** — **Ersh** (<https://github.com/ersh1/OpenAnimationReplacer>). 조건 이름·설명·값 구성은 이 소스에서 가져왔습니다.
- 제작: **Smooth**
