---
title: "FortiGate Configuration Snippet Library"
date: 2026-06-29 20:00:00 +0330
categories: [Config]
image:
  path:  "../assets/img/fortinet/fortinet.jpg"
tags: [ّFortiGate, Fortinet , config]

---


A growing collection of short, copy-paste-ready configuration snippets for FortiGate firewalls. Each snippet targets a single task — combine them as needed during live device configuration.

---

## FortiGate Firewalls

### Change Hostname

Sets the device hostname shown in the CLI and GUI.

```
config system global
    set hostname FGT-EDGE-01
end
```

### Configure WAN Interface

Assigns a static IP address to the WAN-facing interface.

```
config system interface
    edit "wan1"
        set mode static
        set ip 203.0.113.2 255.255.255.0
        set allowaccess ping
    next
end
```

### Configure LAN Interface

Assigns a static IP address to the LAN-facing interface.

```
config system interface
    edit "internal"
        set mode static
        set ip 192.168.1.1 255.255.255.0
        set allowaccess ping https ssh
    next
end
```

### Set DNS Servers

Configures primary and secondary DNS servers used by the FortiGate.

```
config system dns
    set primary 8.8.8.8
    set secondary 1.1.1.1
end
```

### Configure Default Route

Adds a static default route via the WAN gateway.

```
config router static
    edit 0
        set dst 0.0.0.0 0.0.0.0
        set gateway 203.0.113.1
        set device "wan1"
    next
end
```

### Create an Admin User

Creates a local administrator account with full permissions.

```
config system admin
    edit "netadmin"
        set password StrongP@ssw0rd
        set accprofile "super_admin"
    next
end
```

### Enable SSH

Enables SSH management access on a specific interface.

```
config system interface
    edit "internal"
        append allowaccess ssh
    next
end
```

### Enable HTTPS

Enables HTTPS (GUI) management access on a specific interface.

```
config system interface
    edit "internal"
        append allowaccess https
    next
end
```

### Configure NTP

Synchronizes the FortiGate's clock using an NTP server.

```
config system ntp
    set ntpsync enable
    set type custom
    config ntpserver
        edit 1
            set server "pool.ntp.org"
        next
    end
end
```

### Create an Address Object

Defines a reusable address object for use in firewall policies.

```
config firewall address
    edit "LAN_SUBNET"
        set subnet 192.168.1.0 255.255.255.0
    next
end
```

### Create an Address Group

Groups multiple address objects for simplified policy management.

```
config firewall addrgrp
    edit "INTERNAL_GROUP"
        set member "LAN_SUBNET" "SERVER_01"
    next
end
```

> **Note:** All member objects must already exist before being added to the group.

### Create a Firewall Policy

Creates a basic policy allowing traffic between two interfaces/addresses.

```
config firewall policy
    edit 0
        set name "LAN_to_WAN"
        set srcintf "internal"
        set dstintf "wan1"
        set srcaddr "LAN_SUBNET"
        set dstaddr "all"
        set action accept
        set schedule "always"
        set service "ALL"
        set nat enable
    next
end
```

### Configure NAT

Enables outbound NAT (overload) on an existing firewall policy.

```
config firewall policy
    edit 1
        set nat enable
    next
end
```

### Configure a VLAN Interface

Creates a VLAN sub-interface tied to a physical interface.

```
config system interface
    edit "vlan10"
        set type vlan
        set interface "internal"
        set vlanid 10
        set ip 192.168.10.1 255.255.255.0
    next
end
```

### Save Configuration

 commits changes immediately after each command block; no separate save step is required.

```
show
```

> **Note:** Use `show` or `show full-configuration` to verify committed changes.

### Useful Diagnose Commands

Common commands for verifying FortiGate status and connectivity.

```
get system status
get system interface physical
diagnose ip route list
diagnose sys top
execute ping 8.8.8.8
diagnose debug flow trace start 20
```

---

## Contributing to This Library

To keep this page consistent as it grows:

- One task per snippet — no combined or multi-purpose blocks.
- Keep code blocks minimal (5–20 lines).
- Use `` for syntax highlighting.
- Add a short note only when a snippet has a prerequisite or side effect worth flagging.
