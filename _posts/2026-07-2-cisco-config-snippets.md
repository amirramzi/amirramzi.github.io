---
title: "Cisco Configuration Snippet Library"
date: 2026-06-29 20:00:00 +0330
categories: [Config]
image:
  path:  "../assets/img/posts/config/cisco-config-snippet.png"
tags: [ّFortiGate, Fortinet , config]

---


A growing collection of short, copy-paste-ready configuration snippets for Cisco IOS routers and switches. Each snippet targets a single task — combine them as needed during live device configuration.

---

## Cisco (Routers & Switches)

### Set Hostname

Sets the device hostname, shown in the CLI prompt.

```
configure terminal
hostname R1-CORE
```

### Create Local Admin User

Creates a local user account with privilege level 15 (full admin).

```
configure terminal
username admin privilege 15 secret StrongP@ssw0rd
```

> **Note:** Use `secret` instead of `password` for encrypted storage.

### Configure Enable Secret

Sets an encrypted password for privileged EXEC (enable) mode.

```
configure terminal
enable secret StrongP@ssw0rd
```

### Enable Password Encryption

Encrypts all clear-text passwords currently stored in the running configuration.

```
configure terminal
service password-encryption
```

### Configure Domain Name

Sets the IP domain name, required before generating RSA keys.

```
configure terminal
ip domain-name example.local
```

### Generate RSA Keys

Generates RSA keys for SSH. Requires a hostname and domain name to be set first.

```
configure terminal
crypto key generate rsa modulus 2048
```

### Configure SSH

Enables SSH version 2 and restricts remote management to SSH only.

```
configure terminal
ip ssh version 2
line vty 0 4
 transport input ssh
 login local
```

> **Note:** Requires local users and RSA keys to already be configured.

### Disable DNS Lookup

Prevents the device from trying to resolve mistyped commands as DNS queries.

```
configure terminal
no ip domain-lookup
```

### Disable HTTP/HTTPS Management

Disables the web-based management interface.

```
configure terminal
no ip http server
no ip http secure-server
```

### Configure Console Line

Sets a password and auto-logout timer on the console line.

```
configure terminal
line console 0
 password ConsoleP@ss
 login
 exec-timeout 5 0
```

### Configure VTY Lines

Secures remote (Telnet/SSH) access lines with login and timeout settings.

```
configure terminal
line vty 0 15
 login local
 exec-timeout 5 0
 transport input ssh
```

### Create a VLAN

Creates a new VLAN with a descriptive name.

```
configure terminal
vlan 10
 name USERS
```

### Configure a Management VLAN

Assigns an IP address to a switch VLAN interface (SVI) for remote management.

```
configure terminal
interface vlan 99
 ip address 192.168.99.2 255.255.255.0
 no shutdown
```

### Configure an Interface IP

Assigns an IP address to a routed or Layer 3 interface.

```
configure terminal
interface gigabitEthernet 0/1
 ip address 192.168.1.1 255.255.255.0
 no shutdown
```

### Configure a Default Gateway

Sets the default gateway on a Layer 2 switch (not used on routers).

```
configure terminal
ip default-gateway 192.168.99.1
```

### Configure a Trunk Port

Configures a switch port as an 802.1Q trunk carrying all VLANs.

```
configure terminal
interface gigabitEthernet 0/24
 switchport mode trunk
 switchport trunk encapsulation dot1q
```

### Configure an Access Port

Assigns a switch port to a single access VLAN.

```
configure terminal
interface gigabitEthernet 0/1
 switchport mode access
 switchport access vlan 10
```

### Configure a Default Route

Adds a static default route pointing to the next-hop gateway.

```
configure terminal
ip route 0.0.0.0 0.0.0.0 192.168.1.254
```

### Configure Static Routes

Adds a static route to a specific destination network.

```
configure terminal
ip route 10.10.10.0 255.255.255.0 192.168.1.254
```

### Save Configuration

Saves the running configuration to NVRAM.

```
copy running-config startup-config
```

### Useful Show Commands

Common commands for quickly verifying device state.

```
show running-config
show ip interface brief
show vlan brief
show interfaces status
show ip route
show version
```

---

## Contributing to This Library

To keep this page consistent as it grows:

- One task per snippet — no combined or multi-purpose blocks.
- Keep code blocks minimal (5–20 lines).
- Use `cisco` for syntax highlighting.
- Add a short note only when a snippet has a prerequisite or side effect worth flagging.
