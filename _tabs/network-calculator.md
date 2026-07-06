---
layout: page
icon: fas fa-calculator
order: 3
title: Calculator
permalink: /network-calculator/
---


{%- comment -%}
  Stylesheet and script are shipped as plain static assets under /assets,
  not inlined here. Jekyll copies them byte-for-byte (no front matter means
  no Liquid/kramdown processing), so they are completely unaffected by
  jekyll-compress-html's production-only whitespace collapsing -- the exact
  thing that silently breaks inline "//" JS comments on GitHub Pages builds
  while working fine under `bundle exec jekyll serve`. relative_url makes
  the paths correct whether the site is served at a root domain or under a
  GitHub Pages project subpath (baseurl).
{%- endcomment -%}
<link rel="stylesheet" href="{{ '/assets/css/network-calculator.css' | relative_url }}">

<div class="netcalc-app" id="netcalc-app">

<!-- ============================================================
     HEADER / INPUT TOOLBAR
============================================================ -->
<div class="nc-toolbar">
  <div class="nc-toolbar-top">
    <div>
      <h2 class="nc-title">Network Calculator</h2>
      <p class="nc-subtitle">IPv4 subnetting, VLSM, summarization &amp; Cisco command reference</p>
    </div>
    <label class="nc-edu-toggle">
      <input type="checkbox" id="eduToggle">
      <span>Show explanations</span>
    </label>
  </div>

  <div class="nc-input-row">
    <label class="nc-input-label" for="ipInput">IP address / CIDR</label>
    <div class="nc-input-group">
      <input type="text" id="ipInput" class="nc-input nc-input-main" placeholder="192.168.1.0/24" value="192.168.1.0/24" autocomplete="off" spellcheck="false">
      <span class="nc-status-badge" id="ipStatus">OK</span>
    </div>
  </div>

  <div class="nc-cidr-row">
    <span class="nc-cidr-label">/0</span>
    <input type="range" id="cidrSlider" min="0" max="32" value="24" class="nc-slider">
    <span class="nc-cidr-label">/32</span>
    <span class="nc-cidr-current" id="cidrCurrent">/24</span>
  </div>
</div>

<!-- ============================================================
     TAB NAVIGATION
============================================================ -->
<div class="nc-tabs" role="tablist">
  <button class="nc-tab active" data-tab="core">01 · Core</button>
  <button class="nc-tab" data-tab="binary">02 · Bit Map</button>
  <button class="nc-tab" data-tab="vlsm">03 · VLSM</button>
  <button class="nc-tab" data-tab="supernet">04 · Supernet</button>
  <button class="nc-tab" data-tab="splitter">05 · Splitter</button>
  <button class="nc-tab" data-tab="cisco">06 · Cisco/ACL</button>
  <button class="nc-tab" data-tab="reference">07 · Reference</button>
</div>

<!-- ============================================================
     PANEL: CORE
============================================================ -->
<section class="nc-panel active" id="panel-core">
  <div class="nc-grid" id="coreGrid"><!-- populated by JS --></div>
  <p class="edu-note">Every field below is derived from the same two inputs: the IP address and the prefix length (CIDR). Change either one above — the entire dashboard recalculates instantly, nothing is submitted to a server.</p>
</section>

<!-- ============================================================
     PANEL: BINARY / BIT MAP
============================================================ -->
<section class="nc-panel" id="panel-binary">
  <div class="nc-card nc-card-wide">
    <div class="nc-card-head">
      <span>Bit-Level Map</span>
      <span class="nc-tip" data-tip="Cyan bits are the network portion (fixed by the mask). Amber bits are the host portion (free to vary per device).">?</span>
    </div>
    <div id="bitmapContainer"></div>
  </div>
  <p class="edu-note">The subnet mask decides where the network ID stops and host addresses begin. Every bit set to <strong>1</strong> in the mask locks that bit of the IP as part of the network; every <strong>0</strong> bit is free for hosts. Drag the CIDR slider above and watch the boundary move.</p>
</section>

<!-- ============================================================
     PANEL: VLSM
============================================================ -->
<section class="nc-panel" id="panel-vlsm">
  <div class="nc-card nc-card-wide">
    <div class="nc-card-head"><span>Variable Length Subnet Masking</span></div>
    <div class="nc-vlsm-controls">
      <label>Base network for allocation
        <input type="text" id="vlsmBase" class="nc-input" value="192.168.1.0/24">
      </label>
      <button id="vlsmAddRow" class="nc-btn">+ Add requirement</button>
      <button id="vlsmCalc" class="nc-btn nc-btn-primary">Allocate subnets</button>
    </div>
    <div id="vlsmRows" class="nc-vlsm-rows"></div>
    <div id="vlsmResults" class="nc-table-wrap"></div>
  </div>
</section>

<!-- ============================================================
     PANEL: SUPERNET / SUMMARY
============================================================ -->
<section class="nc-panel" id="panel-supernet">
  <div class="nc-card nc-card-wide">
    <div class="nc-card-head"><span>Supernetting / Route Summarization</span></div>
    <p class="nc-hint">Enter one network per line, e.g. <code>192.168.0.0/24</code></p>
    <textarea id="supernetInput" class="nc-textarea" rows="6" placeholder="192.168.0.0/24"></textarea>
    <button id="supernetCalc" class="nc-btn nc-btn-primary">Summarize</button>
    <div id="supernetResult" class="nc-table-wrap"></div>
  </div>
</section>

<!-- ============================================================
     PANEL: SPLITTER
============================================================ -->
<section class="nc-panel" id="panel-splitter">
  <div class="nc-card nc-card-wide">
    <div class="nc-card-head"><span>Network Splitter</span></div>
    <div class="nc-vlsm-controls">
      <label>Network to split
        <input type="text" id="splitBase" class="nc-input" value="192.168.1.0/24">
      </label>
      <label>Split into
        <input type="number" id="splitCount" class="nc-input nc-input-narrow" value="4" min="2">
        <span class="nc-hint-inline">equal subnets</span>
      </label>
      <button id="splitCalc" class="nc-btn nc-btn-primary">Split</button>
    </div>
    <div class="nc-divider"><span>or</span></div>
    <div class="nc-vlsm-controls">
      <label>Hosts required
        <input type="number" id="hostReq" class="nc-input nc-input-narrow" value="50" min="1">
      </label>
      <button id="hostCalc" class="nc-btn nc-btn-primary">Suggest best subnet</button>
    </div>
    <div id="splitResult" class="nc-table-wrap"></div>
  </div>
</section>

<!-- ============================================================
     PANEL: CISCO / ACL
============================================================ -->
<section class="nc-panel" id="panel-cisco">
  <div class="nc-grid nc-grid-2">
    <div class="nc-card">
      <div class="nc-card-head"><span>Wildcard &amp; Command Generator</span></div>
      <div id="ciscoCommands"></div>
    </div>
    <div class="nc-card">
      <div class="nc-card-head"><span>ACL Match Tester</span></div>
      <label class="nc-inline-label">Test IP address
        <input type="text" id="aclTestIp" class="nc-input" value="192.168.1.55" placeholder="10.0.0.5">
      </label>
      <div id="aclResult"></div>
    </div>
  </div>
</section>

<!-- ============================================================
     PANEL: REFERENCE
============================================================ -->
<section class="nc-panel" id="panel-reference">
  <div class="nc-card nc-card-wide">
    <div class="nc-card-head"><span>CIDR / Prefix Reference Table (/0 &ndash; /32)</span></div>
    <div class="nc-table-wrap" id="refTable"></div>
  </div>
</section>

<div class="nc-toast" id="nc-toast">Copied to clipboard</div>

</div>

<script defer src="{{ '/assets/js/networkCalculator.js' | relative_url }}"></script>
