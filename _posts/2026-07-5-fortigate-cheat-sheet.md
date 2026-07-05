---
title: "FortiGate Cheat Sheet"
date: 2026-07-05 20:00:00 +0330
categories: [Cheat Sheet]
image:
  path:  ""
tags: [Fortinet, FortiGate,Cheat Sheet]



---


<!-- /MarkdownTOC -->

## Configure basic Networking

| Command                                     | Description                                          |
|:---------------------------------------------|:------------------------------------------------------|
| config system interface                     | Enter interface config mode                          |
| edit "port1"                                | Select interface port1                               |
| set alias WAN-LINK                          | Human readable interface alias                       |
| set mode static                             | Use a static IP instead of DHCP/PPPoE                |
| set ip 10.23.42.5 255.255.0.0               | Add IPv4 address to interface                        |
| set allowaccess ping https ssh              | Allow management protocols on this interface         |
| set mode dhcp                               | Get IPv4 address via DHCP                            |
| set device-identification enable            | Enable device detection on this interface            |
| next                                        |                                                       |
| end                                         |                                                       |
| config system dns                           | Enter global DNS config mode                         |
| set primary 8.8.8.8                         | Set primary DNS server                               |
| set secondary 1.1.1.1                       | Set secondary DNS server                             |
| end                                         |                                                       |
| config router static                        | Enter static route config mode                       |
| edit 0                                      | Create a new static route entry                      |
| set dst 10.20.30.0 255.255.255.0            | Destination network                                  |
| set gateway 1.2.3.4                         | Next hop gateway                                     |
| set device "port1"                          | Egress interface                                     |
| next                                        |                                                       |
| end                                         |                                                       |

### Troubleshoot basic Networking

| Command                                    | Description                                              |
|:---------------------------------------------|:----------------------------------------------------------|
| get system interface physical              | Show interface link, speed, duplex status                |
| diagnose hardware deviceinfo nic port1     | Show detailed NIC hardware info                           |
| get router info routing-table all          | Show the full routing table                               |
| get router info routing-table static       | Show only static routes                                   |
| diagnose ip route list                     | Show kernel route table                                   |
| execute ping 1.2.3.4                       | Ping a host                                               |
| execute traceroute 1.2.3.4                 | Traceroute to a host                                      |
| diagnose sniffer packet any 'host 1.2.3.4' 4 | Sniff traffic to/from a host                            |
| diagnose debug flow trace start 20         | Trace packet flow for 20 packets                          |
| diagnose debug enable                      | Enable debug output on console                            |
| diagnose debug flow trace stop             | Stop flow tracing                                         |
| diagnose debug disable                     | Disable all debug output                                  |

## Zones and Interfaces

| Command                          | Description                                       |
|:-----------------------------------|:----------------------------------------------------|
| config system zone                | Enter zone config mode                            |
| edit "DMZ"                        | Create/select zone named DMZ                      |
| set interface "port3" "port4"     | Add member interfaces to the zone                 |
| next                              |                                                    |
| end                               |                                                    |
| config system interface           |                                                   |
| edit "port2"                      |                                                   |
| set role {lan, wan, dmz, undefined} | Set the interface role                          |
| next                              |                                                    |
| end                               |                                                    |

### Troubleshoot Zones

| Command                       | Description                          |
|:---------------------------------|:----------------------------------------|
| show system zone               | Show configured zones                 |
| get system interface           | Show all interfaces, roles and status |

## VLANs

Note: On FortiGate, a VLAN is a virtual sub-interface bound to a physical interface, not a separate switch database entry.

| Command                                       | Description                                        |
|:-------------------------------------------------|:------------------------------------------------------|
| config system interface                       | Enter interface config mode                        |
| edit "vlan10"                                 | Create/select VLAN sub-interface named vlan10      |
| set type vlan                                 | Mark interface as a VLAN sub-interface             |
| set interface "port1"                         | Bind VLAN to physical/parent interface             |
| set vlanid 10                                 | Set the 802.1Q VLAN ID                             |
| set ip 192.168.10.1 255.255.255.0             | Assign IP to the VLAN interface                    |
| set allowaccess ping https ssh                | Allow management protocols on this VLAN            |
| next                                          |                                                    |
| end                                           |                                                    |

### Troubleshoot VLANs

| Command                          | Description                                    |
|:------------------------------------|:---------------------------------------------------|
| get system interface               | Show all interfaces including VLAN sub-interfaces |
| diagnose netlink interface list    | Low-level interface/VLAN kernel info              |

## Firewall Addresses and Services

| Command                                     | Description                                       |
|:-----------------------------------------------|:------------------------------------------------------|
| config firewall address                    | Enter address object config mode                  |
| edit "LAN_SUBNET"                          | Create/select address object                      |
| set subnet 192.168.1.0 255.255.255.0       | Define the subnet                                 |
| next                                       |                                                    |
| end                                        |                                                    |
| config firewall addrgrp                    | Enter address group config mode                   |
| edit "INTERNAL_GROUP"                      | Create/select address group                       |
| set member "LAN_SUBNET" "SERVER_01"        | Add members to the group                          |
| next                                       |                                                    |
| end                                        |                                                    |
| config firewall service custom             | Enter custom service config mode                  |
| edit "APP_TCP_8443"                        | Create/select custom service                      |
| set tcp-portrange 8443                     | Define TCP port range                             |
| next                                       |                                                    |
| end                                        |                                                    |

### Troubleshoot Addresses and Services

| Command                       | Description                             |
|:---------------------------------|:--------------------------------------------|
| show firewall address           | Show configured address objects           |
| show firewall addrgrp           | Show configured address groups            |
| diagnose firewall ipmacbinding list | Show IP/MAC binding table if enabled  |

## Firewall Policies

| Command                             | Description                                        |
|:---------------------------------------|:--------------------------------------------------------|
| config firewall policy               | Enter firewall policy config mode                  |
| edit 0                                | Create a new policy (0 = auto-assign ID)           |
| set name "LAN_to_WAN"                | Human readable policy name                         |
| set srcintf "internal"               | Source interface/zone                              |
| set dstintf "wan1"                   | Destination interface/zone                         |
| set srcaddr "LAN_SUBNET"             | Source address object                              |
| set dstaddr "all"                    | Destination address object                         |
| set service "ALL"                    | Allowed service(s)                                 |
| set schedule "always"                | Time schedule for the policy                       |
| set action accept                    | Accept (or deny) matching traffic                  |
| set nat enable                       | Enable source NAT for this policy                  |
| set logtraffic all                   | Log all sessions matching this policy              |
| next                                 |                                                    |
| end                                  |                                                    |
| config firewall policy               |                                                    |
| move 3 before 1                      | Reorder policy ID 3 to be evaluated before ID 1    |
| end                                  |                                                    |

### Troubleshoot Firewall Policies

| Command                                   | Description                                       |
|:---------------------------------------------|:-------------------------------------------------------|
| show firewall policy                       | Show configured policies                          |
| get firewall policy [id]                   | Show a specific policy in operational form        |
| diagnose firewall iprope show [chain]      | Show internal policy lookup rules                 |
| diagnose sys session list                  | Show active sessions matching policies             |
| diagnose sys session filter dst 1.2.3.4    | Filter session list by destination                 |

## NAT

| Command                                    | Description                                       |
|:-----------------------------------------------|:------------------------------------------------------|
| config firewall policy                     |                                                    |
| edit 1                                     | Select the policy to enable NAT on                |
| set nat enable                             | Enable outbound (source) NAT / overload            |
| set ippool enable                          | Use a defined IP pool instead of egress interface  |
| set poolname "PUBLIC_POOL"                 | Reference the IP pool by name                      |
| next                                       |                                                    |
| end                                        |                                                    |
| config firewall ippool                     | Enter IP pool config mode                         |
| edit "PUBLIC_POOL"                         | Create/select an IP pool                          |
| set startip 203.0.113.10                   | First public IP in the pool                        |
| set endip 203.0.113.20                     | Last public IP in the pool                         |
| next                                       |                                                    |
| end                                        |                                                    |
| config firewall vip                        | Enter virtual IP (DNAT) config mode                |
| edit "WEB_VIP"                             | Create/select a VIP object                        |
| set extip 203.0.113.5                      | External (public) IP                               |
| set mappedip "192.168.1.10"                | Internal (private) IP                              |
| set portforward enable                     | Enable port forwarding                             |
| set extport 443                            | External port                                     |
| set mappedport 443                         | Internal port                                     |
| next                                       |                                                    |
| end                                        |                                                    |

### Troubleshoot NAT

| Command                                     | Description                              |
|:-----------------------------------------------|:---------------------------------------------|
| get firewall ippool                          | Show configured IP pools                 |
| show firewall vip                            | Show configured virtual IPs (DNAT)       |
| diagnose sys session list                    | Verify translated source/destination IPs |

## VPN

### IPsec Site-to-Site

| Command                                        | Description                                        |
|:---------------------------------------------------|:--------------------------------------------------------|
| config vpn ipsec phase1-interface              | Enter Phase 1 (IKE) config mode                    |
| edit "TO_BRANCH"                               | Create/select the Phase 1 tunnel                   |
| set interface "wan1"                           | Local outgoing interface                           |
| set remote-gw 198.51.100.10                    | Remote peer public IP                              |
| set psksecret MyPreSharedKey                   | Set pre-shared key                                 |
| set proposal aes256-sha256                     | Encryption/authentication proposal                 |
| next                                           |                                                    |
| end                                            |                                                    |
| config vpn ipsec phase2-interface              | Enter Phase 2 (IPsec SA) config mode               |
| edit "TO_BRANCH_P2"                            | Create/select the Phase 2 entry                    |
| set phase1name "TO_BRANCH"                     | Associate with the Phase 1 tunnel                  |
| set proposal aes256-sha256                     | Encryption/authentication proposal                 |
| set src-subnet 192.168.1.0 255.255.255.0       | Local protected subnet                             |
| set dst-subnet 192.168.2.0 255.255.255.0       | Remote protected subnet                            |
| next                                           |                                                    |
| end                                            |                                                    |

### SSL-VPN

| Command                                     | Description                                          |
|:-------------------------------------------------|:---------------------------------------------------------|
| config vpn ssl settings                     | Enter SSL-VPN global settings                        |
| set servercert "Fortinet_Factory"           | Certificate presented to clients                     |
| set tunnel-ip-pools "SSLVPN_POOL"           | IP pool assigned to connecting clients               |
| set port 10443                              | Listening port for SSL-VPN                           |
| end                                         |                                                    |
| config firewall address                     |                                                    |
| edit "SSLVPN_POOL"                          | Create the tunnel IP pool object                     |
| set type iprange                            | Define as an IP range                                |
| set start-ip 10.10.10.10                    | Pool start                                           |
| set end-ip 10.10.10.50                      | Pool end                                             |
| next                                        |                                                    |
| end                                         |                                                    |

### Troubleshoot VPN

| Command                                   | Description                                       |
|:---------------------------------------------|:-------------------------------------------------------|
| get vpn ipsec tunnel summary                | Show all IPsec tunnels and their status           |
| diagnose vpn ike gateway list               | Show Phase 1 (IKE) gateway detail                 |
| diagnose vpn tunnel list                    | Show Phase 2 tunnel detail and traffic counters   |
| diagnose debug application ike -1           | Enable full IKE debug logging                     |
| get vpn ssl monitor                         | Show currently connected SSL-VPN users            |

## Users and Authentication

| Command                                    | Description                                       |
|:-----------------------------------------------|:--------------------------------------------------|
| config system admin                        | Enter local admin user config mode                |
| edit "netadmin"                            | Create/select an admin user                       |
| set password StrongP@ssw0rd                | Set admin password                                |
| set accprofile "super_admin"               | Assign admin access profile                       |
| set trusthost1 10.0.0.0 255.255.255.0      | Restrict admin access to a trusted subnet         |
| next                                       |                                                    |
| end                                        |                                                    |
| config user local                          | Enter local VPN/portal user config mode           |
| edit "jdoe"                                | Create/select a local user                        |
| set type password                          | Authenticate with a static password               |
| set passwd UserP@ssw0rd                    | Set the user's password                           |
| next                                       |                                                    |
| end                                        |                                                    |
| config user group                          | Enter user group config mode                      |
| edit "VPN_USERS"                           | Create/select a user group                        |
| set member "jdoe"                          | Add member(s) to the group                        |
| next                                       |                                                    |
| end                                        |                                                    |

### Troubleshoot Users

| Command                       | Description                              |
|:---------------------------------|:----------------------------------------------|
| get system admin list           | Show configured admin accounts           |
| diagnose firewall auth list     | Show currently authenticated firewall users |
| execute disconnect-ssl-vpn-user | Disconnect a specific SSL-VPN session    |

## High Availability (HA)

| Command                                | Description                                       |
|:-------------------------------------------|:--------------------------------------------------------|
| config system ha                       | Enter HA config mode                              |
| set mode {a-p, a-a}                    | Active-Passive or Active-Active                   |
| set group-id 10                        | Unique HA group ID (must match on all members)    |
| set group-name "HA-CLUSTER"            | Human readable cluster name                       |
| set password HaP@ssw0rd                | HA heartbeat authentication password              |
| set priority 200                       | Higher priority becomes the primary unit          |
| set hbdev "port10" 50                  | Heartbeat interface(s) and priority                |
| end                                    |                                                    |

### Troubleshoot HA

| Command                       | Description                                  |
|:---------------------------------|:---------------------------------------------------|
| get system ha status            | Show cluster members, role and sync status       |
| diagnose sys ha status          | Show detailed HA state and checksums             |
| diagnose sys ha checksum show   | Compare config checksums across HA members       |
| execute ha manage 0             | Connect to the CLI of a specific HA cluster member |

## Traffic Shaping

| Command                                        | Description                                       |
|:---------------------------------------------------|:--------------------------------------------------------|
| config firewall shaper traffic-shaper          | Enter traffic shaper config mode                  |
| edit "LIMIT_10M"                               | Create/select a shaping profile                   |
| set maximum-bandwidth 10000                    | Max bandwidth in kbps                             |
| set per-policy enable                          | Apply limit per policy instead of shared           |
| next                                           |                                                    |
| end                                            |                                                    |
| config firewall policy                         |                                                    |
| edit 1                                         |                                                    |
| set traffic-shaper "LIMIT_10M"                 | Apply shaper to outbound traffic on this policy    |
| next                                           |                                                    |
| end                                            |                                                    |

### Troubleshoot Traffic Shaping

| Command                          | Description                          |
|:------------------------------------|:------------------------------------------|
| diagnose firewall shaper traffic-shaper list | Show shaper stats and current usage |

## Device Management

| Command                                         | Description                                                    |
|:-----------------------------------------------------|:---------------------------------------------------------------------|
| config system global                            | Enter global system config mode                                |
| set hostname FGT-EDGE-01                        | Set device hostname                                            |
| set admin-sport 8443                            | Change HTTPS admin port                                        |
| set admin-ssh-port 2222                         | Change SSH admin port                                          |
| set timezone 04                                 | Set device timezone by index                                   |
| end                                              |                                                                |
| config system ntp                               | Enter NTP config mode                                          |
| set ntpsync enable                              | Enable NTP time sync                                           |
| set type custom                                 | Use a manually defined NTP server                              |
| config ntpserver                                | Enter NTP server sub-table                                     |
| edit 1                                          |                                                                |
| set server "pool.ntp.org"                       | NTP server address                                              |
| next                                            |                                                                |
| end                                              |                                                                |
| end                                              |                                                                |
| execute backup config tftp backup.conf 10.0.0.5 | Backup config to a TFTP server                                 |
| execute restore config tftp backup.conf 10.0.0.5| Restore config from a TFTP server                              |
| execute reboot                                  | Reboot the device                                              |
| execute factoryreset                            | Reset device to factory defaults                               |

### Firmware Management

| Command                                      | Description                                        |
|:--------------------------------------------------|:--------------------------------------------------------|
| execute restore image tftp <file> <ip>       | Restore/flash firmware image from TFTP              |
| execute update-now                           | Force an immediate FortiGuard update check          |
| get system status                            | Show current firmware version and build             |
| diagnose sys flash list                      | List firmware partitions on flash                   |

### License Management

| Command                       | Description                              |
|:---------------------------------|:----------------------------------------------|
| execute vpn certificate local import | Import a local certificate/license file |
| get system status                | Shows license/registration status         |
| diagnose debug application update -1 | Debug FortiGuard license/update issues |

## Logging

| Command                                     | Description                                       |
|:-----------------------------------------------|:--------------------------------------------------|
| config log syslogd setting                  | Enter remote syslog config mode                   |
| set status enable                           | Enable sending logs to syslog server               |
| set server "10.0.0.50"                      | Syslog server IP                                  |
| set port 514                                | Syslog server port                                |
| end                                         |                                                    |
| config log setting                          | Enter general log settings                        |
| set fwpolicy-implicit-log enable            | Log traffic hitting the implicit deny policy       |
| end                                         |                                                    |

### Troubleshoot Logging

| Command                              | Description                            |
|:-----------------------------------------|:---------------------------------------------|
| execute log filter category 0          | Filter logs by traffic category         |
| execute log display                    | Display filtered logs on CLI            |
| diagnose test application miglogd 6    | Check local log daemon status           |

### Modes

| Mode         | Prompt                | enter                              |
|:-------------|:-----------------------|:-------------------------------------|
| Global       | (global) #             | # config global                    |
| VDOM         | (vdom-name) #          | # config vdom / edit <vdom-name>   |
| Object edit  | (object-name) #        | (config-table)# edit "name"        |
| Sub-table    | (sub-table) #          | (object-name)# config <sub-table>  |

### Navigation

| Sequence  | Function                                       |
|:----------|:------------------------------------------------|
| ?         | Show available commands/help at current level  |
| Tab       | Autocompletion                                 |
| Ctrl-C    | Abort current command / exit config level       |
| end       | Commit changes and exit a config block          |
| next      | Save current object and continue to a new entry |
| abort     | Discard changes made in the current edit block  |
| Ctrl-Z    | Exit all the way back to the top-level prompt   |

## To Sort and Misc

| Command                                   | Description                                       |
|:-----------------------------------------------|:-------------------------------------------------------|
| get system performance status               | CPU, memory and session count snapshot            |
| diagnose sys top                            | Live process/CPU usage, like `top`                |
| diagnose hardware sysinfo memory            | Detailed memory usage breakdown                   |
| execute telnet 1.2.3.4                      | Telnet to a host from the FortiGate CLI            |
| execute ssh admin@1.2.3.4                   | SSH to a host from the FortiGate CLI               |
| diagnose sys session filter clear           | Clear session filter                              |
| diagnose sys session clear                  | Clear all active sessions                          |
