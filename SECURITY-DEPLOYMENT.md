# Security deployment settings

Website hiện được phục vụ trực tiếp bởi GitHub Pages. GitHub Pages không hỗ trợ đặt response header tùy chỉnh cho từng repository, nên các header dưới đây phải được cấu hình tại CDN/reverse proxy hoặc sau khi chuyển sang nền tảng hỗ trợ custom headers.

## Response headers

```text
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://images-ext-1.discordapp.net https://cdn.discordapp.com https://cdn-icons-png.flaticon.com https://avatars.steamstatic.com https://cdn.akamai.steamstatic.com; media-src 'self' blob: https://cdn.pixabay.com https://assets.mixkit.co; connect-src 'self' https://api.lanyard.rest https://api.mcsrvstat.us https://steam-proxy.bbtu223344.workers.dev; frame-src 'self' https://www.youtube.com; worker-src 'self' blob:; manifest-src 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin-allow-popups
Cross-Origin-Resource-Policy: same-site
```

Không bật `Cross-Origin-Embedder-Policy: require-corp` trước khi kiểm thử lại YouTube, Google Fonts, Discord, Steam và các file âm thanh bên ngoài; header này có thể chặn các tài nguyên hiện tại. Nếu nền tảng hỗ trợ, thử `credentialless` trong môi trường thử nghiệm trước.

`Access-Control-Allow-Origin: *` hiện do GitHub Pages thêm vào nội dung tĩnh công khai. Đây không phải dữ liệu riêng tư và website không dùng cookie đăng nhập. Muốn gỡ header này phải đặt CDN/reverse proxy phía trước GitHub Pages hoặc chuyển hosting.

## DNS tại Tenten

Nameserver hiện tại là `ns-b1.tenten.vn`, `ns-b2.tenten.vn`, `ns-b3.tenten.vn`. Nếu tên miền không dùng để gửi email, thêm các bản ghi:

```text
@       TXT  "v=spf1 -all"
_dmarc  TXT  "v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; pct=100"
@       CAA  0 issue "letsencrypt.org"
@       CAA  0 issuewild ";"
```

Nếu có gửi email bằng tên miền này, không dùng SPF `-all` cho đến khi đã thêm đúng nhà cung cấp email vào SPF.

DNSSEC phải được bật trong bảng điều khiển DNS Tenten. Sau khi Tenten tạo DNSKEY/DS, bảo đảm DS được công bố ở zone cha trước khi coi DNSSEC là hoàn tất.

## Kiểm tra sau triển khai

```powershell
curl.exe -sI https://tuxinhtrai.io.vn/
curl.exe -s https://tuxinhtrai.io.vn/.well-known/security.txt
Resolve-DnsName tuxinhtrai.io.vn -Type TXT
Resolve-DnsName _dmarc.tuxinhtrai.io.vn -Type TXT
Resolve-DnsName tuxinhtrai.io.vn -Type DS
```
