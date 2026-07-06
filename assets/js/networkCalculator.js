(function () {
  'use strict';

  /* =======================================================================
     CORE IP MATH ENGINE
  ======================================================================= */
  const NC = {};

  NC.isValidIp = function (str) {
    if (typeof str !== 'string') return false;
    const parts = str.trim().split('.');
    if (parts.length !== 4) return false;
    for (const p of parts) {
      if (!/^\d{1,3}$/.test(p)) return false;
      const n = parseInt(p, 10);
      if (n < 0 || n > 255) return false;
      if (p.length > 1 && p[0] === '0') return false; // no leading zeros
    }
    return true;
  };

  NC.ipToInt = function (str) {
    const parts = str.trim().split('.').map(Number);
    return (
      (parts[0] * 16777216 + parts[1] * 65536 + parts[2] * 256 + parts[3]) >>> 0
    );
  };

  NC.intToIp = function (n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(
      '.',
    );
  };

  NC.cidrToMaskInt = function (cidr) {
    if (cidr <= 0) return 0;
    if (cidr >= 32) return 0xffffffff >>> 0;
    return (0xffffffff << (32 - cidr)) >>> 0;
  };

  NC.maskIntToCidr = function (maskInt) {
    let count = 0;
    for (let i = 31; i >= 0; i--) {
      if ((maskInt >>> i) & 1) count++;
      else break;
    }
    return count;
  };

  NC.isValidMask = function (maskInt) {
    // must be all 1s followed by all 0s
    let seenZero = false;
    for (let i = 31; i >= 0; i--) {
      const bit = (maskInt >>> i) & 1;
      if (bit === 0) seenZero = true;
      else if (seenZero) return false;
    }
    return true;
  };

  NC.toBinaryOctets = function (n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].map(
      (o) => o.toString(2).padStart(8, '0'),
    );
  };

  NC.toHex = function (n) {
    return '0x' + n.toString(16).toUpperCase().padStart(8, '0');
  };

  NC.toHexOctets = function (n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
      .map((o) => o.toString(16).toUpperCase().padStart(2, '0'))
      .join('.');
  };

  NC.classify = function (firstOctet) {
    if (firstOctet < 128) return 'A';
    if (firstOctet < 192) return 'B';
    if (firstOctet < 224) return 'C';
    if (firstOctet < 240) return 'D (Multicast)';
    return 'E (Reserved/Experimental)';
  };

  NC.ipCategory = function (ipInt) {
    const o1 = (ipInt >>> 24) & 255,
      o2 = (ipInt >>> 16) & 255;
    if (o1 === 10) return { type: 'Private', scope: 'RFC1918 (10.0.0.0/8)' };
    if (o1 === 172 && o2 >= 16 && o2 <= 31)
      return { type: 'Private', scope: 'RFC1918 (172.16.0.0/12)' };
    if (o1 === 192 && o2 === 168)
      return { type: 'Private', scope: 'RFC1918 (192.168.0.0/16)' };
    if (o1 === 127) return { type: 'Loopback', scope: '127.0.0.0/8' };
    if (o1 === 169 && o2 === 254)
      return { type: 'Link-Local (APIPA)', scope: '169.254.0.0/16' };
    if (o1 === 100 && o2 >= 64 && o2 <= 127)
      return { type: 'Carrier-Grade NAT', scope: '100.64.0.0/10' };
    if (o1 >= 224 && o1 < 240)
      return { type: 'Multicast', scope: '224.0.0.0/4' };
    if (o1 >= 240) return { type: 'Reserved', scope: '240.0.0.0/4' };
    if (o1 === 0)
      return { type: 'Reserved', scope: '0.0.0.0/8 (this network)' };
    if (o1 === 255 && o2 === 255)
      return { type: 'Broadcast', scope: '255.255.255.255' };
    return { type: 'Public', scope: 'Globally routable' };
  };

  NC.compute = function (ipStr, cidr) {
    if (!NC.isValidIp(ipStr)) return { error: 'Invalid IPv4 address.' };
    if (cidr < 0 || cidr > 32 || isNaN(cidr))
      return { error: 'CIDR must be between /0 and /32.' };

    const ipInt = NC.ipToInt(ipStr);
    const maskInt = NC.cidrToMaskInt(cidr);
    const wildcardInt = ~maskInt >>> 0;
    const networkInt = (ipInt & maskInt) >>> 0;
    const broadcastInt = (networkInt | wildcardInt) >>> 0;

    let firstHost, lastHost, usableHosts;
    const totalHosts = Math.pow(2, 32 - cidr);
    if (cidr === 32) {
      firstHost = networkInt;
      lastHost = networkInt;
      usableHosts = 1;
    } else if (cidr === 31) {
      firstHost = networkInt;
      lastHost = broadcastInt;
      usableHosts = 2;
    } else {
      firstHost = networkInt + 1;
      lastHost = broadcastInt - 1;
      usableHosts = totalHosts - 2;
    }

    const cat = NC.ipCategory(ipInt);

    return {
      ip: ipStr,
      cidr,
      ipInt,
      maskInt,
      wildcardInt,
      networkInt,
      broadcastInt,
      firstHost,
      lastHost,
      totalHosts,
      usableHosts,
      maskDotted: NC.intToIp(maskInt),
      wildcardDotted: NC.intToIp(wildcardInt),
      networkDotted: NC.intToIp(networkInt),
      broadcastDotted: NC.intToIp(broadcastInt),
      firstHostDotted: NC.intToIp(firstHost),
      lastHostDotted: NC.intToIp(lastHost),
      networkClass: NC.classify((ipInt >>> 24) & 255),
      category: cat,
      binaryIp: NC.toBinaryOctets(ipInt).join('.'),
      binaryMask: NC.toBinaryOctets(maskInt).join('.'),
      hexIp: NC.toHexOctets(ipInt),
      hexIpCombined: NC.toHex(ipInt),
    };
  };

  NC.prefixForHosts = function (hosts) {
    hosts = parseInt(hosts, 10);
    if (hosts <= 0 || isNaN(hosts)) return null;
    if (hosts === 1) return 32;
    if (hosts === 2) return 31;
    const needed = hosts + 2;
    for (let p = 30; p >= 0; p--) {
      const size = Math.pow(2, 32 - p);
      if (size >= needed) return p;
    }
    return 0;
  };

  NC.parseCidrString = function (str) {
    // "ip/cidr" -> {ip,cidr} or null
    const m = str
      .trim()
      .match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
    if (!m) return null;
    if (!NC.isValidIp(m[1])) return null;
    const cidr = parseInt(m[2], 10);
    if (cidr < 0 || cidr > 32) return null;
    return { ip: m[1], cidr };
  };

  /* =======================================================================
     UTILITIES: clipboard + toast
  ======================================================================= */
  function copyText(text) {
    const done = () => {
      const toast = document.getElementById('nc-toast');
      toast.textContent = 'Copied: ' + text;
      toast.classList.add('show');
      clearTimeout(copyText._t);
      copyText._t = setTimeout(() => toast.classList.remove('show'), 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch (e) {}
      document.body.removeChild(ta);
      done();
    }
  }

  function fieldHtml(label, value, opts) {
    opts = opts || {};
    const accent = opts.accent ? ' accent-' + opts.accent : '';
    const tip = opts.tip
      ? `<span class="nc-tip" data-tip="${opts.tip}">?</span>`
      : '';
    const sub = opts.sub ? `<div class="nc-field-sub">${opts.sub}</div>` : '';
    return `<div class="nc-field">
      <div class="nc-field-label">${label}${tip}</div>
      <div class="nc-field-value${accent}">
        <span>${value}</span>
        <button class="nc-copy" data-copy="${String(value).replace(/"/g, '&quot;')}" title="Copy">copy</button>
      </div>
      ${sub}
    </div>`;
  }

  function wireCopyButtons(container) {
    container.querySelectorAll('.nc-copy').forEach((btn) => {
      btn.addEventListener('click', () =>
        copyText(btn.getAttribute('data-copy')),
      );
    });
  }

  /* =======================================================================
     STATE
  ======================================================================= */
  let state = { ip: '192.168.1.0', cidr: 24 };

  const els = {};
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const root = document.getElementById('netcalc-app');
    els.ipInput = document.getElementById('ipInput');
    els.cidrSlider = document.getElementById('cidrSlider');
    els.cidrCurrent = document.getElementById('cidrCurrent');
    els.ipStatus = document.getElementById('ipStatus');
    els.eduToggle = document.getElementById('eduToggle');

    // tabs
    root.querySelectorAll('.nc-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        root
          .querySelectorAll('.nc-tab')
          .forEach((t) => t.classList.remove('active'));
        root
          .querySelectorAll('.nc-panel')
          .forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        document
          .getElementById('panel-' + tab.getAttribute('data-tab'))
          .classList.add('active');
      });
    });

    els.eduToggle.addEventListener('change', () => {
      root.classList.toggle('edu-on', els.eduToggle.checked);
    });

    els.ipInput.addEventListener('input', onMainInputChange);
    els.cidrSlider.addEventListener('input', () => {
      state.cidr = parseInt(els.cidrSlider.value, 10);
      syncMainInputFromState();
      recalcAll();
    });

    // delegate copy clicks globally (for dynamically injected content)
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.nc-copy');
      if (btn) copyText(btn.getAttribute('data-copy'));
    });

    parseMainInput();
    recalcAll();
    buildReferenceTable();
    wireVlsm();
    wireSupernet();
    wireSplitter();
  }

  function onMainInputChange() {
    parseMainInput();
    recalcAll();
  }

  function parseMainInput() {
    const raw = els.ipInput.value.trim();
    const parsed = NC.parseCidrString(raw);
    if (parsed) {
      state.ip = parsed.ip;
      state.cidr = parsed.cidr;
      els.ipStatus.textContent = 'OK';
      els.ipStatus.classList.remove('err');
      els.cidrSlider.value = state.cidr;
      els.cidrCurrent.textContent = '/' + state.cidr;
    } else if (NC.isValidIp(raw)) {
      state.ip = raw;
      els.ipStatus.textContent = 'OK';
      els.ipStatus.classList.remove('err');
    } else {
      els.ipStatus.textContent = 'INVALID';
      els.ipStatus.classList.add('err');
    }
  }

  function syncMainInputFromState() {
    els.ipInput.value = state.ip + '/' + state.cidr;
    els.cidrCurrent.textContent = '/' + state.cidr;
  }

  function recalcAll() {
    const data = NC.compute(state.ip, state.cidr);
    if (data.error) {
      document.getElementById('coreGrid').innerHTML =
        `<div class="nc-card nc-card-wide" style="color:var(--nc-red)">${data.error}</div>`;
      return;
    }
    renderCore(data);
    renderBitmap(data);
    renderCisco(data);
    renderAclTester(data);
  }

  /* =======================================================================
     CORE TAB
  ======================================================================= */
  function renderCore(d) {
    const html = [
      fieldHtml('IP Address', d.ip, { accent: 'cyan' }),
      fieldHtml('CIDR Prefix', '/' + d.cidr),
      fieldHtml('Subnet Mask', d.maskDotted, {
        tip: 'Defines which bits of the address are network bits (1) vs host bits (0).',
      }),
      fieldHtml('Wildcard Mask', d.wildcardDotted, {
        tip: 'Inverse of the subnet mask. Used in Cisco ACLs and OSPF network statements.',
      }),
      fieldHtml('Network ID', d.networkDotted, {
        accent: 'cyan',
        tip: 'The base address of the subnet — all host bits set to 0.',
      }),
      fieldHtml('Broadcast Address', d.broadcastDotted, {
        accent: 'amber',
        tip: 'The top address of the subnet — all host bits set to 1.',
      }),
      fieldHtml('First Usable Host', d.firstHostDotted),
      fieldHtml('Last Usable Host', d.lastHostDotted),
      fieldHtml('Total Addresses', d.totalHosts.toLocaleString()),
      fieldHtml('Usable Hosts', d.usableHosts.toLocaleString(), {
        accent: 'green',
      }),
      fieldHtml('Network Class', d.networkClass),
      fieldHtml('Address Type', d.category.type, {
        sub: d.category.scope,
        accent: d.category.type === 'Public' ? 'green' : 'amber',
      }),
      fieldHtml('Binary IP', d.binaryIp, { accent: 'purple' }),
      fieldHtml('Binary Mask', d.binaryMask, { accent: 'purple' }),
      fieldHtml('Hex (octets)', d.hexIp),
      fieldHtml('Hex (32-bit)', d.hexIpCombined),
    ].join('');
    document.getElementById('coreGrid').innerHTML = html;
  }

  /* =======================================================================
     BINARY / BIT MAP TAB
  ======================================================================= */
  function renderBitmap(d) {
    const bin = NC.toBinaryOctets(d.ipInt);
    let sofar = 0;
    let html = '<div class="nc-bitmap-row">';
    bin.forEach((octetBits, oi) => {
      html += '<div class="nc-bitmap-octet"><div class="nc-bitmap-bits">';
      for (let i = 0; i < 8; i++) {
        const globalBit = oi * 8 + i;
        const cls = globalBit < d.cidr ? 'net' : 'host';
        html += `<span class="nc-bit ${cls}">${octetBits[i]}</span>`;
      }
      html += `</div><div class="nc-bitmap-dec">${(d.ipInt >>> (24 - oi * 8)) & 255}</div></div>`;
    });
    html += '</div>';
    html += `<div class="nc-bitmap-legend">
      <span><span class="nc-legend-swatch" style="background:rgba(79,209,197,.4)"></span>Network bits (${d.cidr})</span>
      <span><span class="nc-legend-swatch" style="background:rgba(245,166,35,.35)"></span>Host bits (${32 - d.cidr})</span>
    </div>`;
    document.getElementById('bitmapContainer').innerHTML = html;
  }

  /* =======================================================================
     CISCO / ACL TAB
  ======================================================================= */
  function renderCisco(d) {
    const acl = `access-list 10 permit ${d.networkDotted} ${d.wildcardDotted}`;
    const ospf = `router ospf 1\n network ${d.networkDotted} ${d.wildcardDotted} area 0`;
    const ifaceCfg = `interface GigabitEthernet0/0\n ip address ${d.ip} ${d.maskDotted}\n no shutdown`;
    document.getElementById('ciscoCommands').innerHTML = `
      <div class="nc-field-label">Standard ACL (permit)</div>
      <div class="nc-code-block">${acl}<button class="nc-copy" data-copy="${acl.replace(/"/g, '&quot;')}">copy</button></div>
      <div class="nc-field-label">OSPF network statement</div>
      <div class="nc-code-block">${ospf.replace(/\n/g, '<br>')}<button class="nc-copy" data-copy="${ospf.replace(/"/g, '&quot;')}">copy</button></div>
      <div class="nc-field-label">Interface configuration</div>
      <div class="nc-code-block">${ifaceCfg.replace(/\n/g, '<br>')}<button class="nc-copy" data-copy="${ifaceCfg.replace(/"/g, '&quot;')}">copy</button></div>
    `;
  }

  function renderAclTester(d) {
    const testInput = document.getElementById('aclTestIp');
    const run = () => {
      const testIpStr = testInput.value.trim();
      const box = document.getElementById('aclResult');
      if (!NC.isValidIp(testIpStr)) {
        box.innerHTML = `<div class="nc-acl-match no">Enter a valid IPv4 address to test</div>`;
        return;
      }
      const testInt = NC.ipToInt(testIpStr);
      const careMask = ~d.wildcardInt >>> 0; // bits that matter
      const matches = ((testInt ^ d.networkInt) & careMask) === 0;
      const netBin = NC.toBinaryOctets(d.networkInt).join('').split('');
      const wildBin = NC.toBinaryOctets(d.wildcardInt).join('').split('');
      const testBin = NC.toBinaryOctets(testInt).join('').split('');
      let bitsHtml = '<div class="nc-acl-bits">';
      for (let i = 0; i < 32; i++) {
        const dontCare = wildBin[i] === '1';
        const bitMatch = dontCare || netBin[i] === testBin[i];
        bitsHtml += `<span class="nc-bit ${dontCare ? 'host' : 'net'}" title="${dontCare ? "don't-care" : 'must match'}" style="opacity:${bitMatch ? 1 : 0.35}">${testBin[i]}</span>`;
      }
      bitsHtml += '</div>';
      box.innerHTML = `
        <div class="nc-field-label">ACL rule</div>
        <div class="nc-code-block">permit ${d.networkDotted} ${d.wildcardDotted}</div>
        <div class="nc-field-label">Test address bit comparison</div>
        ${bitsHtml}
        <div class="nc-acl-match ${matches ? 'yes' : 'no'}">${matches ? 'MATCH — packet permitted' : 'NO MATCH — packet denied'}</div>
      `;
    };
    testInput.oninput = run;
    run();
  }

  /* =======================================================================
     VLSM TAB
  ======================================================================= */
  function wireVlsm() {
    const rowsEl = document.getElementById('vlsmRows');
    function addRow(name, hosts) {
      const row = document.createElement('div');
      row.className = 'nc-vlsm-row';
      row.innerHTML = `
        <input type="text" class="nc-input vlsm-name" placeholder="Segment name (e.g. Sales-LAN)" value="${name || ''}">
        <input type="number" class="nc-input vlsm-hosts" placeholder="Hosts needed" min="1" value="${hosts || ''}">
        <button class="nc-remove" title="Remove">&times;</button>
      `;
      row
        .querySelector('.nc-remove')
        .addEventListener('click', () => row.remove());
      rowsEl.appendChild(row);
    }
    addRow('Sales', 50);
    addRow('Engineering', 25);
    addRow('Point-to-Point-WAN', 2);

    document
      .getElementById('vlsmAddRow')
      .addEventListener('click', () => addRow('', ''));

    document.getElementById('vlsmCalc').addEventListener('click', () => {
      const baseParsed = NC.parseCidrString(
        document.getElementById('vlsmBase').value,
      );
      const resultBox = document.getElementById('vlsmResults');
      if (!baseParsed) {
        resultBox.innerHTML = `<div style="color:var(--nc-red)">Enter a valid base network, e.g. 192.168.1.0/24</div>`;
        return;
      }

      const reqs = [];
      rowsEl.querySelectorAll('.nc-vlsm-row').forEach((row) => {
        const name = row.querySelector('.vlsm-name').value.trim() || 'Segment';
        const hosts = parseInt(row.querySelector('.vlsm-hosts').value, 10);
        if (hosts > 0) reqs.push({ name, hosts });
      });
      if (reqs.length === 0) {
        resultBox.innerHTML = `<div style="color:var(--nc-red)">Add at least one host requirement.</div>`;
        return;
      }

      reqs.sort((a, b) => b.hosts - a.hosts);

      const baseNetInt =
        NC.ipToInt(baseParsed.ip) & NC.cidrToMaskInt(baseParsed.cidr);
      const baseSize = Math.pow(2, 32 - baseParsed.cidr);
      const baseEnd = (baseNetInt >>> 0) + baseSize;

      let pointer = baseNetInt >>> 0;
      const rows = [];
      let overflow = false;
      for (const r of reqs) {
        const prefix = NC.prefixForHosts(r.hosts);
        if (prefix === null) {
          continue;
        }
        const size = Math.pow(2, 32 - prefix);
        if (pointer + size > baseEnd) {
          overflow = true;
        }
        const netInt = pointer >>> 0;
        const maskInt = NC.cidrToMaskInt(prefix);
        const broadcastInt = (netInt + size - 1) >>> 0;
        const usable = prefix >= 31 ? (prefix === 32 ? 1 : 2) : size - 2;
        const firstHost = prefix >= 31 ? netInt : netInt + 1;
        const lastHost = prefix >= 31 ? broadcastInt : broadcastInt - 1;
        rows.push({
          name: r.name,
          hostsNeeded: r.hosts,
          cidr: prefix,
          mask: NC.intToIp(maskInt),
          network: NC.intToIp(netInt) + '/' + prefix,
          broadcast: NC.intToIp(broadcastInt),
          range: NC.intToIp(firstHost) + ' - ' + NC.intToIp(lastHost),
          usable,
        });
        pointer += size;
      }

      let html = `<table class="nc-table"><thead><tr>
        <th>Segment</th><th>Needed</th><th>CIDR</th><th>Mask</th><th>Network</th><th>Usable Range</th><th>Broadcast</th><th>Usable Hosts</th>
      </tr></thead><tbody>`;
      rows.forEach((r) => {
        html += `<tr><td>${r.name}</td><td>${r.hostsNeeded}</td><td>/${r.cidr}</td><td>${r.mask}</td>
        <td>${r.network} <button class="nc-copy nc-btn-mini" data-copy="${r.network}">copy</button></td>
        <td>${r.range}</td><td>${r.broadcast}</td><td>${r.usable}</td></tr>`;
      });
      html += `</tbody></table>`;
      if (overflow) {
        html =
          `<div style="color:var(--nc-red); margin-bottom:.5rem;">⚠ Base network is too small to fit all requirements — some subnets overflow past the base range.</div>` +
          html;
      }
      resultBox.innerHTML = html;
    });
  }

  /* =======================================================================
     SUPERNET TAB
  ======================================================================= */
  function wireSupernet() {
    document.getElementById('supernetCalc').addEventListener('click', () => {
      const lines = document
        .getElementById('supernetInput')
        .value.split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const box = document.getElementById('supernetResult');
      const nets = [];
      for (const line of lines) {
        const p = NC.parseCidrString(line);
        if (!p) {
          box.innerHTML = `<div style="color:var(--nc-red)">Invalid line: "${line}"</div>`;
          return;
        }
        const netInt = NC.ipToInt(p.ip) & NC.cidrToMaskInt(p.cidr);
        const size = Math.pow(2, 32 - p.cidr);
        nets.push({
          ip: p.ip,
          cidr: p.cidr,
          netInt: netInt >>> 0,
          broadcastInt: (netInt + size - 1) >>> 0,
        });
      }
      if (nets.length === 0) {
        box.innerHTML = `<div style="color:var(--nc-red)">Enter at least one network.</div>`;
        return;
      }

      const minAddr = Math.min(...nets.map((n) => n.netInt));
      const maxAddr = Math.max(...nets.map((n) => n.broadcastInt));

      let summaryCidr = 0,
        summaryNet = 0;
      for (let p = 32; p >= 0; p--) {
        const mask = NC.cidrToMaskInt(p);
        if ((minAddr & mask) >>> 0 === (maxAddr & mask) >>> 0) {
          summaryCidr = p;
          summaryNet = (minAddr & mask) >>> 0;
          break;
        }
      }
      const summarySize = Math.pow(2, 32 - summaryCidr);
      const summaryBroadcast = (summaryNet + summarySize - 1) >>> 0;
      const wildcard = NC.intToIp(~NC.cidrToMaskInt(summaryCidr) >>> 0);

      let html = `<div class="nc-field-value accent-cyan" style="font-size:18px; margin-bottom:.6rem;">
        Summary route: ${NC.intToIp(summaryNet)}/${summaryCidr}
        <button class="nc-copy" data-copy="${NC.intToIp(summaryNet)}/${summaryCidr}">copy</button>
      </div>`;
      html += `<div class="nc-code-block">ip route ${NC.intToIp(summaryNet)} ${NC.intToIp(NC.cidrToMaskInt(summaryCidr))} [next-hop]
router ospf 1
 network ${NC.intToIp(summaryNet)} ${wildcard} area 0</div>`;
      html += `<table class="nc-table"><thead><tr><th>Input Network</th><th>Range Covered</th></tr></thead><tbody>`;
      nets.forEach((n) => {
        html += `<tr><td>${n.ip}/${n.cidr}</td><td>${NC.intToIp(n.netInt)} - ${NC.intToIp(n.broadcastInt)}</td></tr>`;
      });
      html += `</tbody></table>`;
      const wasted =
        summarySize -
        nets.reduce((s, n) => s + (n.broadcastInt - n.netInt + 1), 0);
      if (
        summaryNet !== minAddr ||
        summaryBroadcast !== maxAddr ||
        wasted > 0
      ) {
        html += `<p class="nc-hint" style="margin-top:.6rem;">Note: this summary block spans ${summarySize.toLocaleString()} addresses; the listed networks occupy a subset of it, so the route also covers additional address space not explicitly listed.</p>`;
      }
      box.innerHTML = html;
    });
  }

  /* =======================================================================
     SPLITTER TAB
  ======================================================================= */
  function wireSplitter() {
    document.getElementById('splitCalc').addEventListener('click', () => {
      const p = NC.parseCidrString(document.getElementById('splitBase').value);
      const n = parseInt(document.getElementById('splitCount').value, 10);
      const box = document.getElementById('splitResult');
      if (!p) {
        box.innerHTML = `<div style="color:var(--nc-red)">Enter a valid network, e.g. 192.168.1.0/24</div>`;
        return;
      }
      if (!n || n < 2) {
        box.innerHTML = `<div style="color:var(--nc-red)">Enter a split count of 2 or more.</div>`;
        return;
      }
      const extraBits = Math.ceil(Math.log2(n));
      const newCidr = p.cidr + extraBits;
      if (newCidr > 32) {
        box.innerHTML = `<div style="color:var(--nc-red)">Cannot split /${p.cidr} into ${n} parts — not enough host bits available.</div>`;
        return;
      }
      const baseInt = (NC.ipToInt(p.ip) & NC.cidrToMaskInt(p.cidr)) >>> 0;
      const blockSize = Math.pow(2, 32 - newCidr);
      const count = Math.pow(2, extraBits);
      let html = `<p class="nc-hint">Splitting /${p.cidr} into ${count} subnets of /${newCidr} (${blockSize} addresses each, ${blockSize - 2 > 0 ? blockSize - 2 : 0} usable hosts)</p>`;
      html += `<table class="nc-table"><thead><tr><th>#</th><th>Network</th><th>Usable Range</th><th>Broadcast</th></tr></thead><tbody>`;
      for (let i = 0; i < count; i++) {
        const netInt = (baseInt + i * blockSize) >>> 0;
        const broadcastInt = (netInt + blockSize - 1) >>> 0;
        const usableFirst = blockSize > 2 ? netInt + 1 : netInt;
        const usableLast = blockSize > 2 ? broadcastInt - 1 : broadcastInt;
        html += `<tr><td>${i + 1}</td><td>${NC.intToIp(netInt)}/${newCidr}</td><td>${NC.intToIp(usableFirst)} - ${NC.intToIp(usableLast)}</td><td>${NC.intToIp(broadcastInt)}</td></tr>`;
      }
      html += `</tbody></table>`;
      box.innerHTML = html;
    });

    document.getElementById('hostCalc').addEventListener('click', () => {
      const hosts = parseInt(document.getElementById('hostReq').value, 10);
      const box = document.getElementById('splitResult');
      const prefix = NC.prefixForHosts(hosts);
      if (prefix === null) {
        box.innerHTML = `<div style="color:var(--nc-red)">Enter a valid host count.</div>`;
        return;
      }
      const maskInt = NC.cidrToMaskInt(prefix);
      const size = Math.pow(2, 32 - prefix);
      const usable = prefix >= 31 ? (prefix === 32 ? 1 : 2) : size - 2;
      box.innerHTML = `
        <div class="nc-grid">
          ${fieldHtml('Recommended prefix', '/' + prefix, { accent: 'cyan' })}
          ${fieldHtml('Subnet mask', NC.intToIp(maskInt))}
          ${fieldHtml('Wildcard mask', NC.intToIp(~maskInt >>> 0))}
          ${fieldHtml('Total addresses', size.toLocaleString())}
          ${fieldHtml('Usable hosts', usable.toLocaleString(), { accent: 'green' })}
        </div>
        <p class="nc-hint" style="margin-top:.6rem;">This is the smallest standard subnet that accommodates ${hosts} host${hosts == 1 ? '' : 's'} (allowing for network + broadcast addresses where applicable).</p>
      `;
    });
  }

  /* =======================================================================
     REFERENCE TABLE
  ======================================================================= */
  function buildReferenceTable() {
    let html = `<table class="nc-table"><thead><tr>
      <th>CIDR</th><th>Subnet Mask</th><th>Wildcard Mask</th><th>Total Addresses</th><th>Usable Hosts</th>
    </tr></thead><tbody>`;
    for (let p = 0; p <= 32; p++) {
      const maskInt = NC.cidrToMaskInt(p);
      const wildcardInt = ~maskInt >>> 0;
      const total = Math.pow(2, 32 - p);
      const usable = p >= 31 ? (p === 32 ? 1 : 2) : total - 2;
      const highlight = p >= 8 ? '' : '';
      html += `<tr class="${p === 24 ? 'nc-row-highlight' : ''}"><td>/${p}</td><td>${NC.intToIp(maskInt)}</td><td>${NC.intToIp(wildcardInt)}</td><td>${total.toLocaleString()}</td><td>${usable.toLocaleString()}</td></tr>`;
    }
    html += `</tbody></table>`;
    document.getElementById('refTable').innerHTML = html;
  }
})();
