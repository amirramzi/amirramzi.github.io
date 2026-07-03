---
title: ما استفاده شود؟"
date: 2026-06-29 20:00:00 +0330
image:
  path:  "../assets/img/posts/dhcp-snooping-lab/cover-dhcp.png"
translation_key: dhcp-attacks
lang: fa
hidden: true
archives: false

---

وقتی یک دستگاه به شبکه متصل می‌شود، اولین چیزی که نیاز دارد یک آدرس IP است. پروتکل DHCP این فرایند را به‌صورت خودکار انجام می‌دهد؛ ساده، سریع و مورد استفاده در تمام شبکه‌ها. اما همین سادگی یک نقطه‌ضعف مهم نیز دارد: DHCP هیچ مکانیزم احراز هویتی ندارد. به همین دلیل، هر سیستمی که به شبکه دسترسی داشته باشد، می‌تواند در این فرایند دخالت کند و از آن سوء استفاده کند.

در این مطالعه عملی (case study)، دو حمله مبتنی بر DHCP را در یک محیط آزمایشگاهی EVE-NG شبیه‌سازی می‌کنیم. ابتدا حمله DHCP Starvation که باعث می‌شود هیچ کلاینتی نتواند آدرس IP دریافت کند و سپس حمله Rogue DHCP Server که در آن مهاجم با راه‌اندازی یک سرور DHCP جعلی، ترافیک کاربران را به سمت خود هدایت می‌کند. در پایان نیز خواهیم دید که قابلیت DHCP Snooping چگونه می‌تواند از هر دو حمله جلوگیری کند.

---

## Lab Environment

برای شبیه‌سازی از EVE-NG استفاده شد. توپولوژی شامل یک مهاجم (Kali Linux) و یک قربانی (Windows) است که هر دو به SW-LAN متصل هستند. سوئیچ SW-Core وظیفه مسیریابی بین VLAN ها را بر عهده دارد و درخواست‌های DHCP را از طریق دستور ip helper-address به سرور DHCP ارسال می‌کند.

![Topology](/assets/img/posts/dhcp-snooping-lab/firefox_5Ac4xo37Nn.png)

**SW-LAN:**
```
interface Ethernet0/0
 switchport access vlan 20
 switchport mode access

interface Ethernet0/1
 switchport access vlan 20
 switchport mode access

interface Ethernet0/2
 switchport trunk encapsulation dot1q
 switchport mode trunk
```

**SW-Core:**
```
interface Vlan20
 ip address 10.10.2.1 255.255.255.0
 ip helper-address 10.10.110.10

interface Vlan110
 ip address 10.10.110.1 255.255.255.0

ip route 0.0.0.0 0.0.0.0 10.10.10.1
```

**DHCP Server — Windows Server (PowerShell):**
```powershell
Add-DhcpServerv4Scope -Name "v-20" -StartRange 10.10.2.2 -EndRange 10.10.2.254 `
    -SubnetMask 255.255.255.0

Set-DhcpServerv4OptionValue -ScopeId 10.10.2.0 -Router 10.10.2.1 -DnsServer 8.8.8.8

Set-DhcpServerv4Scope -ScopeId 10.10.2.0 -State Active
```

---

## حمله اول: DHCP Starvation

ایده پشت این حمله ساده است. سرور DHCP تعداد محدودی آدرس IP در اختیار دارد. اگر مهاجم بتواند با استفاده از هزاران آدرس MAC جعلی، تعداد زیادی بسته DHCP Discover به شبکه ارسال کند، تمام آدرس‌های موجود در Pool مصرف می‌شوند و کاربران واقعی دیگر قادر به دریافت IP نخواهند بود.

### وضعیت عادی قبل از حمله

آمار سرور DHCP قبل از اجرای حمله:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/win-srv-before.png)

جدول آدرس‌های MAC در SW-LAN:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/sw-lan-before.png)

جدول آدرس‌های MAC در SW-Core:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/sw-core-berore.png)

### اجرا و وضعیت در حین حمله

```bash
sudo apt install yersinia
sudo yersinia dhcp -attack 1 -interface eth0
```

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/kali-during.png)

هم‌زمان ترافیک توسط tcpdump کپچر می‌کنیم:

```bash
sudo tcpdump -i eth0 port 67 or port 68 -w dhcp_attack.pcap
```

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/kali-during2.png)

تحلیل بسته‌ها در Wireshark نیز نشان‌دهنده صدها هزار بسته DHCP Discover است:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/Wireshark_aZVySqrYvj.png)

### نتیجه — وضعیت غیرعادی بعد از حمله

آمار سرور DHCP نشان می‌دهد که Pool به‌طور کامل مصرف شده است:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/win-srv-after.png)

جدول MAC در SW-LAN با ورودی‌های جعلی پر شد:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/sw-lan-after.png)

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/sw-lan-after2.png)

جدول MAC در SW-Core:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/sw-core-after.png)

نکته جالب این است که پس از حمله، مقدار TotalAddresses از 253 به 505 افزایش یافت. دلیل این موضوع آن است که Windows DHCP Server، آدرس‌های PendingOffers (آدرس‌هایی که پیشنهاد شده‌اند اما هنوز توسط کلاینت درخواست نشده‌اند) را نیز جزو تعداد کل در نظر می‌گیرد. این موضوع به‌خوبی فشار غیرعادی واردشده به سرور را نشان می‌دهد.

**تأثیر حمله بر کلاینت:**

```
An error occurred while renewing interface Local Area Connection:
unable to contact your DHCP server. Request has timed out.
```

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/win7-after.png)

در نتیجه، کلاینت دیگر قادر به تمدید یا دریافت آدرس IP جدید نخواهد بود.

---

## حمله دوم: Rogue DHCP Server

هدف این حمله قطع دسترسی کاربران نیست؛ بلکه مهاجم تلاش می‌کند بدون جلب توجه، خود را در مسیر تمام ترافیک شبکه قرار دهد. در این سناریو، مهاجم یک DHCP Server جعلی راه‌اندازی می‌کند و اگر بتواند زودتر از سرور اصلی به درخواست کلاینت پاسخ دهد، کلاینت تنظیمات آن را می‌پذیرد؛ از جمله یک Default Gateway جعلی که به سمت سیستم مهاجم اشاره می‌کند.

### آماده‌سازی

آدرس IP سیستم کالی؛ این آدرس در ادامه به‌عنوان Default Gateway جعلی به قربانی اختصاص داده می‌شود:

![Topology](/assets/img/posts/dhcp-snooping-lab/Rogue%20DHCP%20Server%20Attack/vmware_F2NWAg8Xnb.png)

پیکربندی dnsmasq:

```
interface=eth0
dhcp-range=10.10.2.100,10.10.2.101,255.255.255.0,12h
dhcp-option=3,10.10.2.2   # fake gateway = Kali
dhcp-option=6,8.8.8.8
```

![Topology](/assets/img/posts/dhcp-snooping-lab/Rogue%20DHCP%20Server%20Attack/vmware_CrLo8ErgIT.png)

```bash
sudo systemctl start dnsmasq
sudo systemctl status dnsmasq
```

![Topology](/assets/img/posts/dhcp-snooping-lab/Rogue%20DHCP%20Server%20Attack/vmware_o3eOMG0ZjX.png)

### نتیجه

پس از اجرای دستور ipconfig /renew روی سیستم قربانی:

```
IPv4 Address    : 10.10.2.100
Default Gateway : 10.10.2.2   ← Gateway جعلی (Kali)
DHCP Server     : 10.10.2.2
```

![Topology](/assets/img/posts/dhcp-snooping-lab/Rogue%20DHCP%20Server%20Attack/vncviewer_qXhcVVbrR8.png)

![Topology](/assets/img/posts/dhcp-snooping-lab/Rogue%20DHCP%20Server%20Attack/vncviewer_lx9FFexw2f.png)

از دید کاربر، همه‌چیز عادی به نظر می‌رسد؛ سیستم IP دریافت کرده، پینگ برقرار است و حتی اینترنت نیز ممکن است در دسترس باشد. اما در پشت صحنه، تمام ترافیک از سیستم کالی عبور می‌کند و مهاجم می‌تواند آن را مشاهده یا حتی دست‌کاری کند.

![Topology](/assets/img/posts/dhcp-snooping-lab/Rogue%20DHCP%20Server%20Attack/vncviewer_TwP1mzWz0u.png)

![Topology](/assets/img/posts/dhcp-snooping-lab/Rogue%20DHCP%20Server%20Attack/vmware_dAHUCtcFlj.png)

---

## راهکار مقابله: DHCP Snooping

DHCP Snooping یک قابلیت امنیتی در سطح سوئیچ است که پورت‌ها را به دو دسته تقسیم می‌کند:

**Trusted**: پورت‌هایی که به سرور DHCP واقعی یا سوئیچ‌های بالادستی متصل هستند و مجاز به ارسال پیام‌های DHCP Offer و DHCP Reply هستند.

**Untrusted**: پورت‌هایی که به کلاینت‌ها متصل هستند و تنها اجازه ارسال پیام‌های DHCP Discover و DHCP Request را دارند. هرگونه پیام غیرمجاز از این پورت‌ها توسط سوئیچ حذف (Drop) خواهد شد.

### پیکربندی

**SW-LAN:**
```
ip dhcp snooping
ip dhcp snooping vlan 20
interface e0/2
ip dhcp snooping trust
interface range e0/0-1
 ip dhcp snooping limit rate 3
```

**SW-Core:**
```
ip dhcp relay information trust-all
```

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Snoofing/putty_EvHcY2hTeu.png)

### آزمایش مجدد

وضعیت سرور DHCP پیش از اجرای مجدد حمله:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Snoofing/vncviewer_e2HB5iu4E0.png)

اجرای مجدد حمله DHCP Starvation:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Snoofing/vmware_BiVtOQdqO3.png)

آمار سرور DHCP پس از حمله نشان می‌دهد که Pool آدرس‌ها تقریباً بدون تغییر باقی مانده است:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Snoofing/vncviewer_fGHOZj1kVV.png)

نکته قابل توجه این است که سوئیچ در حین حمله، پورت کالی را به حالت err-disabled برد. علت این اتفاق، عبور از محدودیت نرخ تعریف‌شده (۳ بسته در ثانیه) بود. زمانی که تعداد بسته‌های DHCP دریافتی از اینترفیس از مقدار مجاز بیشتر شد، سوئیچ به‌جای حذف تدریجی بسته‌ها، پورت را به‌طور کامل غیرفعال کرد.

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Snoofing/putty_R8bntxlOLG.png)

برای بازگرداندن پورت به حالت عادی (SW-LAN):

```
interface e0/0
shutdown
no shutdown
```

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Snoofing/putty_tSDvQ6nhle.png)

### چرا حمله DHCP Starvation نیز شکست می‌خورد؟

برخلاف تصور رایج، DHCP Snooping تنها با نگهداری DHCP Binding Table از حملات DHCP Starvation جلوگیری نمی‌کند، بلکه می‌تواند این حمله را به‌صورت مستقیم و از طریق محدود کردن نرخ ترافیک DHCP متوقف کند.

در این سناریو، دستور ip dhcp snooping limit rate 3 روی پورت Untrusted اعمال شده است. این تنظیم به سوئیچ اجازه می‌دهد حداکثر سه بسته DHCP در هر ثانیه از این اینترفیس دریافت کند.

اگر مهاجم تلاش کند با ارسال تعداد زیادی پیام DHCP Discover و استفاده از آدرس‌های MAC جعلی، حمله DHCP Starvation را اجرا کند، نرخ بسته‌های ارسالی به‌سرعت از مقدار تعیین‌شده فراتر می‌رود. در این حالت، سوئیچ ترافیک غیرعادی را تشخیص داده و بسته‌های اضافی را حذف می‌کند. در نتیجه، مهاجم دیگر قادر نخواهد بود تمام آدرس‌های موجود در DHCP Pool را مصرف کند و حمله پیش از اتمام آدرس‌های IP با شکست مواجه می‌شود.

### چرا حمله Rogue DHCP نیز شکست می‌خورد؟

با فعال‌سازی DHCP Snooping، حمله Rogue DHCP از همان ابتدا عملاً غیرقابل اجرا می‌شود. در این مکانیزم، تمامی پورت‌های متصل به کاربران به‌صورت پیش‌فرض در حالت Untrusted قرار می‌گیرند و این پورت‌ها تنها مجاز به ارسال پیام‌های سمت کلاینت، مانند DHCP Discover و DHCP Request هستند.

بنابراین اگر مهاجم تلاش کند یک DHCP Server جعلی راه‌اندازی کرده و پیام‌های DHCP Offer یا DHCP ACK را ارسال کند، سوئیچ این بسته‌ها را به‌عنوان نقض سیاست امنیتی تشخیص داده و بلافاصله آن‌ها را حذف می‌کند. در نتیجه، پاسخ‌های سرور جعلی هرگز به کلاینت‌ها نمی‌رسند و حمله Rogue DHCP پیش از آن‌که بتواند بر فرآیند تخصیص آدرس IP تأثیر بگذارد، متوقف می‌شود.

---

## نتیجه‌گیری

پروتکل DHCP به‌صورت پیش‌فرض هیچ مکانیزم احراز هویتی ندارد و همین موضوع آن را در برابر حملاتی مانند DHCP Starvation و Rogue DHCP Server آسیب‌پذیر می‌کند.

در این آزمایش مشاهده کردیم که یک مهاجم می‌تواند با ارسال تعداد زیادی درخواست DHCP، تمام آدرس‌های موجود را اشغال کرده و دسترسی کاربران به شبکه را مختل کند یا با راه‌اندازی یک سرور DHCP جعلی، تنظیمات شبکه کاربران را تحت کنترل خود بگیرد.

قابلیت DHCP Snooping با تفکیک پورت‌های Trusted و Untrusted، اعمال محدودیت نرخ بر ترافیک DHCP و جلوگیری از ارسال پیام‌های DHCP Server از پورت‌های غیرمجاز، راهکاری مؤثر برای مقابله با این تهدیدها ارائه می‌دهد. با توجه به سادگی پیاده‌سازی و تأثیر قابل توجه آن بر امنیت شبکه، فعال‌سازی DHCP Snooping بر روی سوئیچ‌های لایه دوم، به‌ویژه در شبکه‌هایی که کاربران به‌طور مستقیم به آن‌ها متصل هستند، به‌شدت توصیه می‌شود.

