---
layout: page
title: Terminal
icon: fas fa-terminal
permalink: /terminal/
order: 1
mermaid: true
---
<link rel="stylesheet" href="/assets/js/xterm/xterm.css">

```mermaid
    flowchart LR
    K["Kali Terminal"]
    R["Cisco Router"]

    K -------------->|ssh admin@192.168.1.1 password: 123| R
```


<div class="terminal-wrapper">
  <div id="terminal"></div>
</div>
<script src="/assets/js/xterm/xterm.js"></script>
<script src="/assets/js/xterm/addon-fit.js"></script>
<script src="/assets/js/cisco.js"></script>
<script src="/assets/js/terminal.js"></script>
