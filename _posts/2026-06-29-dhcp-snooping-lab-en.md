---
title: "Layer 2 Attacks: How DHCP Can Be Used Against You"
date: 2026-06-29 20:00:00 +0330
categories: [Write-ups]
image:
  path:  "../assets/img/posts/dhcp-snooping-lab/cover-dhcp.png"
tags: [DHCP, Cisco, Security , Kali]
translation_key: dhcp-attacks  
lang: en
order: 1
---

When a device connects to a network, the first thing it does is get an IP address. DHCP handles this automatically — simple, fast, and running on almost every network. But that simplicity comes with a problem: DHCP has no authentication mechanism. Anyone on the network can abuse it.

This is a hands-on case study simulating two DHCP-based Layer 2 attacks in an EVE-NG lab environment. First, DHCP Starvation — which prevents any client from getting an IP. Second, Rogue DHCP Server — where the attacker sets a fake gateway and intercepts traffic. At the end, we'll see how DHCP Snooping stops both.

---

## Lab Environment

I used EVE-NG as the simulation platform. The topology includes an attacker (Kali Linux) and a victim (Windows), both connected to SW-LAN. SW-Core handles inter-VLAN routing and relays DHCP requests to the server via ip helper-address.

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

## Attack 1: DHCP Starvation

The idea is simple. A DHCP server has a limited pool of IP addresses. If someone floods the network with DHCP Discover packets using thousands of fake MAC addresses, the pool fills up and legitimate clients can't get an IP.

### Baseline — Before the Attack

DHCP Server statistics before the attack:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/win-srv-before.png)

MAC address table on SW-LAN:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/sw-lan-before.png)

MAC address table on SW-Core:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/sw-core-berore.png)


### Running the Attack

```bash
sudo apt install yersinia
sudo yersinia dhcp -attack 1 -interface eth0
```

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/kali-during.png)


At the same time, capturing traffic with tcpdump:

```bash
sudo tcpdump -i eth0 port 67 or port 68 -w dhcp_attack.pcap
```

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/kali-during2.png)

Wireshark capture during the attack:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/Wireshark_aZVySqrYvj.png)


### Results — After the Attack

DHCP Server statistics — pool completely exhausted:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/win-srv-after.png)


MAC address table on SW-LAN — flooded with fake entries:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/sw-lan-after.png)

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/sw-lan-after2.png)

MAC address table on SW-Core:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/sw-core-after.png)



One interesting technical detail: after the attack, TotalAddresses jumped from 253 to 505. Windows DHCP Server counts PendingOffers (offered but not yet requested) as part of the total. This alone shows the abnormal load the attack placed on the server.

**Impact on the client:**

```
An error occurred while renewing interface Local Area Connection:
unable to contact your DHCP server. Request has timed out.
```

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Starvation%20Attack/win7-after.png)


---

## Attack 2: Rogue DHCP Server

This attack isn't about cutting off access — it's about making the attacker invisible while sitting in the middle of all traffic. When the pool is full and the real server can't respond, the attacker spins up a fake DHCP server. If it replies to the client's Discover before the real server does, the client accepts its settings — including a fake gateway pointing to the attacker.

### Setup

Kali's IP address — this will be set as the fake gateway:

![Topology](/assets/img/posts/dhcp-snooping-lab/Rogue%20DHCP%20Server%20Attack/vmware_F2NWAg8Xnb.png)


dnsmasq configuration on Kali:

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

### Results

After ipconfig /renew on the Windows client:

```
IPv4 Address    : 10.10.2.100
Default Gateway : 10.10.2.2   ← Fake gateway (Kali)
DHCP Server     : 10.10.2.2
```

![Topology](/assets/img/posts/dhcp-snooping-lab/Rogue%20DHCP%20Server%20Attack/vncviewer_qXhcVVbrR8.png)

![Topology](/assets/img/posts/dhcp-snooping-lab/Rogue%20DHCP%20Server%20Attack/vncviewer_lx9FFexw2f.png)

The client thinks everything is fine — ping works, internet seems reachable. But all traffic is flowing through Kali:

![Topology](/assets/img/posts/dhcp-snooping-lab/Rogue%20DHCP%20Server%20Attack/vncviewer_TwP1mzWz0u.png)

![Topology](/assets/img/posts/dhcp-snooping-lab/Rogue%20DHCP%20Server%20Attack/vmware_dAHUCtcFlj.png)
---

## Mitigation: DHCP Snooping

DHCP Snooping is a switch-level security feature that divides ports into two categories:

- **Trusted**: ports connected to the real DHCP server or upstream switches — allowed to send DHCP Offers and Replies
- **Untrusted**: ports connected to clients — only allowed to send DHCP Discover and Request. Any violation gets dropped.

### Configuration

**SW-LAN:**
```
ip dhcp snooping
ip dhcp snooping vlan 20
interface e0/2
ip dhcp snooping trust
interface range e0/0-1
ip dhcp snooping limit rate 3

SW-Core(config)# ip dhcp relay information trust-all
```
![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Snoofing/putty_EvHcY2hTeu.png)

### Testing

Baseline before re-running the attack:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Snoofing/vncviewer_e2HB5iu4E0.png)

Running the same Starvation attack:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Snoofing/vmware_BiVtOQdqO3.png)


DHCP Server statistics after the attack — pool untouched:

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Snoofing/vncviewer_fGHOZj1kVV.png)


Something worth noting: the switch actually err-disabled Kali's port during the attack. The rate limit (3 packets/second) triggered it — when the switch saw the port exceeding the threshold, it shut the port down entirely rather than just dropping packets.

![Topology](/assets/img/posts/dhcp-snooping-lab/DHCP%20Snoofing/putty_R8bntxlOLG.png)

To recover the port:

**SW-LAN:**
```
interface e0/0
shutdown
no shutdown
```

[snooping-recovery screenshot — e0/0 back to connected]
### Why DHCP Starvation Also Fails
Contrary to common belief, DHCP Snooping does not only mitigate DHCP starvation attacks by maintaining the DHCP binding table; it can stop them directly through rate limiting. When the **ip dhcp snoofing limit rate 3** command is configured on an **untrusted port**, the switch allows only three DHCP packets per second to be received on that interface.

If an attacker attempts to perform a DHCP starvation attack by sending a large number of **DHCP Discover** messages with spoofed MAC addresses, the packet rate quickly exceeds the configured threshold. The switch detects this excessive DHCP traffic and drops the additional packets, preventing the attacker from exhausting the DHCP address pool. As a result, the DHCP starvation attack fails before the available IP addresses can be depleted.

### Why Rogue DHCP Also Fails

Contrary to common belief, DHCP Snooping does not block Rogue DHCP attacks only indirectly; it prevents them directly from the moment the feature is enabled. With DHCP Snooping, all access ports are considered **untrusted** by default, and these ports are allowed to send only client-originated DHCP messages such as **DHCP Discover** and **DHCP Request**.

If a host connected to an untrusted port attempts to act as a rogue DHCP server and sends **DHCP Offer** or **DHCP ACK** messages, the switch identifies these packets as a security violation and immediately drops them. As a result, even if an attacker starts a fake DHCP server, its responses never reach the clients, and the rogue DHCP attack fails at the very beginning of the DHCP exchange.


---

## Conclusion

DHCP has no built-in authentication, which makes it vulnerable to both Starvation and Rogue Server attacks. DHCP Snooping addresses both by separating trusted from untrusted ports and enforcing rate limits. It's straightforward to configure and should be enabled on any Layer 2 switch that has clients connected to it.









# Introduction

This lab demonstrates the DHCP Starvation Attack in a Cisco enterprise network.

## Objectives

- Understand DHCP exhaustion attacks
- Analyze attack traffic
- Implement DHCP Snooping as a mitigation
 
 