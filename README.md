web by takeshi.
remake by Dogkun.
  
# ⚡ Chinatsu Kamado Profile

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-35e8ff?style=for-the-badge&labelColor=070a15" alt="Status" />
  <img src="https://img.shields.io/badge/Made%20with-HTML%20%2B%20CSS%20%2B%20JS-ff5ef1?style=for-the-badge&labelColor=070a15" alt="Tech" />
  <img src="https://img.shields.io/badge/Theme-Cyber%20Anime-8b5cf6?style=for-the-badge&labelColor=070a15" alt="Theme" />
</p>

<p align="center">
  AMột hồ sơ cá nhân theo phong cách anime điện tử cao cấp với phần giới thiệu bằng Windows CMD, thẻ trạng thái kiểu Discord, liên kết mạng xã hội, trang trí hình đại diện và trình phát  nhạc lofi nổi.
</p>

---

## ✨ Preview Vibe

```txt
C:\Users\Chinatsu Kamado boot profile
[ OK ] loading cyber interface...
[ OK ] syncing Discord presence...
[ OK ] joining world...
```


<div align="center">
Trang này bắt đầu bằng phần giới thiệu theo phong cách terminal chân thực, sau đó chuyển sang bảng điều khiển hồ sơ được thiết kế tinh tế với hiệu ứng glassmorphism, các điểm nhấn hoạt hình, trạng thái thời gian thực giống Discord và bộ điều khiển nhạc nhỏ gọn.
    <br/>
    </div>

---

## 🌟 Features

- 🖥️ **CMD Intro Experience**
  - Windows-style terminal window
  - Multi-tab UI behavior
  - Interactive command input tab
  - Vietnamese typing tips and fake command responses

- 👤 **Cyber Profile Home**
  - Animated banner and avatar frame
  - Discord-inspired presence/status sections
  - Custom status line
  - Activity and Spotify display areas

- 🎵 **Floating Music Player**
  - Lofi background music
  - Play/pause button
  - Progress indicator
  - External volume icon beside the player
  - Expandable volume slider
  - Auto-collapse after inactivity

- 🔗 **Social Buttons**
  - Monochrome SVG icons
  - Rounded compact button layout
  - Opens links in a new tab

- 🎨 **Premium UI Polish**
  - Glassmorphism panels
  - Cyber gradients
  - Ambient glow effects
  - Scanline overlay
  - Responsive mobile layout
  - Cute anime-style custom cursor

---

## 🧩 Tech Stack

| Layer | Usage |
|---|---|
| **HTML** | Semantic page structure |
| **CSS** | Cyber theme, responsive layout, animations |
| **JavaScript** | Terminal logic, music controls, Discord presence rendering |
| **Assets** | Local decorations and music under `data/` |

No framework required — this project is intentionally lightweight and runs as a static website.

---

## 📁 Project Structure

```txt
pro5/
├─ index.html          # Main HTML structure
├─ styles.css          # Full cyber-anime design system
├─ script.js           # Terminal, music, presence, and UI logic
└─ data/
   ├─ decoration/      # Avatar decoration assets
   └─ music/           # Background music file
```

---

## 🚀 Run Locally

Because this is a static site, you can open `index.html` directly in a browser.

Recommended local server:

```bash
npx serve .
```

Or with Python:

```bash
python -m http.server 5500
```

Then open:

```txt
http://localhost:5500
```

---

## ⚙️ Customization

### Change music

Edit the audio source in `index.html`:

```html
<audio id="audio-player" src="./data/music/Weathering_with_you_Lofi.mp3" preload="auto" loop></audio>
```

### Change profile text

Update the profile content in `index.html`:

- Display name
- About section
- Tags
- Social links
- Footer links

### Change styling

Most visual tuning is inside `styles.css`:

- Color tokens
- Glass panels
- Terminal styles
- Music player
- Responsive breakpoints

---

## 🎮 Terminal Commands

The CMD tab supports playful fake commands, for example:

```txt
help
status
ping
clear
https://example.com
```

URL-like commands open in a new browser tab, while other commands return fun terminal-style responses.

---

## 📌 Notes

- Browser autoplay rules may require one user interaction before music can start.
- Discord/presence data depends on the configured API/source in `script.js`.
- The UI is optimized for modern browsers with CSS backdrop-filter support.

---

## 🖤 Author

Made for **Chinatsu Kamado** — cyber, anime, lofi, and terminal vibes.

<p align="center">
  <sub>Designed to feel like joining a small digital world.</sub>
</p>
