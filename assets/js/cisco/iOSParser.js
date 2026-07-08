class IOSParser {
  constructor(routerState) {
    this.state = routerState;
  }

  /**
   * Entry point. Returns { output: string[], disconnect?: boolean }.
   */
  run(rawLine) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (line === '') return { output: [] };

    if (line === '?') {
      return { output: this._helpForCurrentMode() };
    }

    const tokens = line.split(' ');
    const lc0 = tokens[0].toLowerCase();

    // "do <exec-command>" works from any config sub-mode, like real IOS —
    // it runs an EXEC command without leaving config mode.
    if (
      this.state.session.mode !== 'user' &&
      this.state.session.mode !== 'privileged' &&
      lc0.length > 0 &&
      'do'.startsWith(lc0) &&
      lc0 !== 'd'
    ) {
      const rest = tokens.slice(1).join(' ');
      if (rest === '') return { output: ['% Incomplete command.'] };
      return this._execExec(rest.split(' '), rest);
    }

    // "terminal length 0" / "terminal width 0" etc. — accepted everywhere,
    // no visible effect in a browser terminal, but real IOS accepts them
    // in both EXEC and config mode so we do too.
    if ('terminal'.startsWith(lc0) && lc0.length > 0 && tokens.length > 1) {
      return { output: [] };
    }

    if (this.state.session.mode === 'config-if') {
      return this._execInterfaceConfig(tokens, line);
    }
    if (this.state.session.mode === 'config-router') {
      return this._execRouterConfig(tokens, line);
    }
    if (this.state.session.mode === 'config-vlan') {
      return this._execVlanConfig(tokens, line);
    }
    if (this.state.session.mode === 'config-dhcp') {
      return this._execDhcpConfig(tokens, line);
    }
    if (this.state.session.mode === 'config') {
      return this._execGlobalConfig(tokens, line);
    }
    return this._execExec(tokens, line);
  }

  // ---------------------------------------------------------------------
  // EXEC mode (user '>' and privileged '#')
  // ---------------------------------------------------------------------
  _execExec(tokens, line) {
    const [cmd, ...rest] = tokens;
    const lc = cmd.toLowerCase();
    const priv = this.state.session.privileged;

    if (this._matches(lc, 'enable')) {
      if (priv) return { output: [] };
      this.state.session.privileged = true;
      this.state.session.mode = 'privileged';
      return { output: [] };
    }

    if (this._matches(lc, 'disable')) {
      this.state.session.privileged = false;
      this.state.session.mode = 'user';
      return { output: [] };
    }

    if (this._matches(lc, 'configure')) {
      if (!priv) return { output: this._invalidAt(line, 0) };
      if (rest[0] && !'terminal'.startsWith(rest[0].toLowerCase())) {
        return { output: this._invalidAt(line, this._tokenOffset(line, 1)) };
      }
      this.state.session.mode = 'config';
      return {
        output: [
          'Enter configuration commands, one per line.  End with CNTL/Z.',
        ],
      };
    }

    if (this._matches(lc, 'show')) {
      return this._execShow(rest, line);
    }

    if (this._matches(lc, 'ping')) {
      return { output: this._execPing(rest) };
    }

    if (this._matches(lc, 'traceroute')) {
      return { output: this._execTraceroute(rest) };
    }

    if (this._matches(lc, 'write') || this._matches(lc, 'copy')) {
      if (!priv) return { output: this._invalidAt(line, 0) };
      return { output: ['Building configuration...', '[OK]'] };
    }

    if (this._matches(lc, 'exit') || this._matches(lc, 'logout')) {
      this.state.session.connected = false;
      return { output: [], disconnect: true };
    }

    if (this._matches(lc, 'reload')) {
      if (!priv) return { output: this._invalidAt(line, 0) };
      return { output: ['Proceed with reload? [confirm]'] };
    }

    return { output: this._invalidAt(line, 0) };
  }

  _execShow(rest, line) {
    if (rest.length === 0) return { output: ['% Incomplete command.'] };
    const sub = rest.join(' ').toLowerCase();

    if (sub.startsWith('running-config') || sub.startsWith('run')) {
      if (!this.state.session.privileged)
        return { output: this._invalidAt(line, 0) };
      return { output: this.state.buildRunningConfig().split('\n') };
    }
    if (sub.startsWith('version') || sub.startsWith('ver')) {
      return { output: this._showVersion() };
    }
    if (
      sub.startsWith('ip interface brief') ||
      sub.startsWith('ip int br') ||
      sub.startsWith('ip int brief')
    ) {
      return { output: this._showIpIntBrief() };
    }
    if (sub.startsWith('ip route') || sub.startsWith('ip ro')) {
      return { output: this._showIpRoute() };
    }
    if (sub.startsWith('cdp neighbors') || sub.startsWith('cdp nei')) {
      return { output: this._showCdpNeighbors() };
    }
    if (sub.startsWith('interfaces') || sub.startsWith('int')) {
      return { output: this._showInterfaces() };
    }
    if (sub.startsWith('clock')) {
      return { output: [new Date().toString()] };
    }
    if (
      this.state.options.enableVlans &&
      (sub.startsWith('vlan brief') || sub.startsWith('vlan'))
    ) {
      return { output: this._showVlanBrief() };
    }
    if (
      this.state.options.enableAcls &&
      (sub.startsWith('access-lists') ||
        sub.startsWith('access-list') ||
        sub.startsWith('acc'))
    ) {
      return { output: this._showAccessLists() };
    }
    if (sub.startsWith('spanning-tree')) {
      return { output: this._showSpanningTree() };
    }
    if (
      this.state.options.enableNat &&
      (sub.startsWith('ip nat translations') || sub.startsWith('ip nat trans'))
    ) {
      return { output: this._showNatTranslations() };
    }
    if (
      this.state.options.enableDhcp &&
      (sub.startsWith('ip dhcp binding') || sub.startsWith('ip dhcp bind'))
    ) {
      return { output: this._showDhcpBindings() };
    }

    return { output: this._invalidAt(line, this._tokenOffset(line, 1)) };
  }

  _showVlanBrief() {
    const rows = [['VLAN', 'Name', 'Status', 'Ports']];
    for (const [id, v] of Object.entries(this.state.vlans)) {
      rows.push([id, v.name, v.status, v.ports.join(', ') || '-']);
    }
    return ['', ...this._padTable(rows), ''];
  }

  _showAccessLists() {
    const names = Object.keys(this.state.acls);
    if (names.length === 0) return ['', '% No access lists configured', ''];
    const out = [''];
    for (const name of names) {
      const acl = this.state.acls[name];
      out.push(
        `${acl.type === 'standard' ? 'Standard' : 'Extended'} IP access list ${name}`,
      );
      acl.rules.forEach((r, i) =>
        out.push(`    ${i + 1} ${r.action} ${r.spec}`),
      );
    }
    out.push('');
    return out;
  }

  _showSpanningTree() {
    return [
      '',
      'VLAN0001',
      '  Spanning tree enabled protocol ieee',
      `  Root ID    Priority    32769`,
      `             Address     0011.2233.4455`,
      '             This bridge is the root',
      '',
      'Interface           Role Sts Cost      Prio.Nbr Type',
      '-------------------- ---- --- --------- -------- ----',
      'Gi0/1                Desg FWD 4         128.1    P2p',
      'Gi0/2                Desg FWD 4         128.2    P2p',
      '',
    ];
  }

  _showNatTranslations() {
    if (this.state.nat.rules.length === 0) {
      return [
        '',
        'Pro Inside global      Inside local       Outside local      Outside global',
        '',
      ];
    }
    const out = [
      '',
      'Pro Inside global      Inside local       Outside local      Outside global',
    ];
    // Purely cosmetic simulated entry per configured overload rule, so the
    // table isn't empty once NAT has actually been configured.
    for (const rule of this.state.nat.rules) {
      const iface = this.state.interfaces[rule.exitIface];
      const globalIp = iface && iface.ip ? iface.ip : '0.0.0.0';
      out.push(
        `tcp ${globalIp}:1024      192.168.1.10:1024  8.8.8.8:80         8.8.8.8:80`,
      );
    }
    out.push('');
    return out;
  }

  _showDhcpBindings() {
    const pools = Object.entries(this.state.dhcpPools);
    if (pools.length === 0) {
      return [
        '',
        'Bindings from all pools not associated with VRF:',
        'IP address       Client-ID/       Lease expiration        Type',
        '',
      ];
    }
    const out = [
      '',
      'Bindings from all pools not associated with VRF:',
      'IP address       Client-ID/       Lease expiration        Type',
    ];
    for (const [name, pool] of pools) {
      if (!pool.network) continue;
      // Simulated single lease per configured pool.
      const octets = pool.network.split('.');
      octets[3] = String(Number(octets[3]) + 10);
      out.push(
        `${octets.join('.')}   0100.5e00.0${name.length}  ${new Date().toDateString()}      Automatic`,
      );
    }
    out.push('');
    return out;
  }

  _showVersion() {
    const s = this.state;
    return [
      '',
      `Cisco IOS XE Software, Version ${s.version.ios}`,
      `Cisco IOS Software [Cupertino], ${s.version.model} Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version ${s.version.ios}`,
      'Copyright (c) 1986-2026 by Cisco Systems, Inc.',
      'Compiled Fri 01-Jul-26',
      '',
      'ROM: IOS-XE ROMMON',
      '',
      `${s.hostname} uptime is ${s.uptimeString()}`,
      'System returned to ROM by reload',
      `System image file is "flash:${s.version.model.toLowerCase()}.bin"`,
      '',
      `cisco ${s.version.model} (1RU) processor with 1048576K/86016K bytes of memory.`,
      '2 Gigabit Ethernet interfaces',
      '1 terabyte flash memory',
      '',
      'Configuration register is 0x2102',
      '',
    ];
  }

  _showIpIntBrief() {
    const rows = [
      ['Interface', 'IP-Address', 'OK?', 'Method', 'Status', 'Protocol'],
    ];
    for (const [name, i] of Object.entries(this.state.interfaces)) {
      rows.push([
        name,
        i.ip || 'unassigned',
        'YES',
        i.ip ? 'manual' : 'unset',
        i.status,
        i.protocol,
      ]);
    }
    return ['', ...this._padTable(rows), ''];
  }

  _showIpRoute() {
    const out = [
      '',
      'Codes: L - local, C - connected, S - static, O - OSPF',
      '',
    ];
    if (!this.state.routes.some((r) => r.proto === 'S')) {
      out.push('Gateway of last resort is not set');
      out.push('');
    }
    for (const r of this.state.routes) {
      const bits = this._maskToCidr(r.mask);
      out.push(
        `${r.proto}    ${r.network}/${bits} is directly connected, ${r.via}`,
      );
    }
    out.push('');
    return out;
  }

  _showCdpNeighbors() {
    const rows = [
      ['Device ID', 'Local Intrfce', 'Holdtme', 'Capability', 'Platform'],
    ];
    for (const n of this.state.cdpNeighbors) {
      rows.push([
        n.deviceId,
        n.localIface,
        String(n.holdtime),
        n.capability,
        n.platform,
      ]);
    }
    return ['', ...this._padTable(rows), ''];
  }

  _showInterfaces() {
    const out = [''];
    for (const [name, i] of Object.entries(this.state.interfaces)) {
      out.push(`${name} is ${i.status}, line protocol is ${i.protocol}`);
      out.push(`  Description: ${i.description || '(none)'}`);
      out.push(
        `  Internet address is ${i.ip ? `${i.ip}/${this._maskToCidr(i.mask)}` : 'unassigned'}`,
      );
      out.push('  MTU 1500 bytes, BW 1000000 Kbit/sec, DLY 10 usec');
      out.push('');
    }
    return out;
  }

  _execTraceroute(rest) {
    if (rest.length === 0) return ['% Incomplete command.'];
    const target = rest[0];
    const reachable =
      Object.values(this.state.interfaces).some(
        (i) => i.ip === target && i.status === 'up',
      ) ||
      this.state.routes.some((r) =>
        target.startsWith(r.network.split('.').slice(0, 3).join('.')),
      );

    const out = [
      '',
      `Type escape sequence to abort.`,
      `Tracing the route to ${target}`,
      '',
    ];
    if (reachable) {
      out.push(`  1 ${target} 1 msec 1 msec 1 msec`);
    } else {
      out.push('  1  * * *');
      out.push('  2  * * *');
      out.push('  3  * * *');
    }
    out.push('');
    return out;
  }

  _execPing(rest) {
    if (rest.length === 0) return ['% Incomplete command.'];
    const target = rest[0];
    const reachable =
      Object.values(this.state.interfaces).some(
        (i) => i.ip === target && i.status === 'up',
      ) ||
      this.state.routes.some((r) =>
        target.startsWith(r.network.split('.').slice(0, 3).join('.')),
      );

    const out = [
      '',
      'Type escape sequence to abort.',
      `Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:`,
    ];
    if (reachable) {
      out.push('!!!!!');
      out.push(
        'Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms',
      );
    } else {
      out.push('.....');
      out.push('Success rate is 0 percent (0/5)');
    }
    out.push('');
    return out;
  }

  // ---------------------------------------------------------------------
  // Global config mode
  // ---------------------------------------------------------------------
  _execGlobalConfig(tokens, line) {
    const [cmd, ...rest] = tokens;
    const lc = cmd.toLowerCase();

    if (this._matches(lc, 'exit') || lc === 'end') {
      this.state.resetToUserMode();
      return { output: [] };
    }

    if (this._matches(lc, 'hostname')) {
      if (rest.length === 0) return { output: ['% Incomplete command.'] };
      this.state.hostname = rest[0];
      return { output: [] };
    }

    if (this._matches(lc, 'interface')) {
      if (rest.length === 0) return { output: ['% Incomplete command.'] };
      const ifaceName = this._normalizeInterfaceName(rest.join(''));
      if (!ifaceName) return { output: ['% Invalid interface'] };
      if (!this.state.interfaces[ifaceName]) {
        this.state.interfaces[ifaceName] = {
          ip: null,
          mask: null,
          status: 'administratively down',
          protocol: 'down',
          description: '',
          shutdown: true,
          natDirection: null,
          aclIn: null,
          aclOut: null,
        };
      }
      this.state.session.mode = 'config-if';
      this.state.session.currentInterface = ifaceName;
      return { output: [] };
    }

    if (
      this.state.options.enableNat &&
      lc === 'ip' &&
      rest[0] === 'nat' &&
      rest[1] === 'inside' &&
      rest[2] === 'source'
    ) {
      // ip nat inside source list <acl> interface <iface> [overload]
      const [, , , listKw, acl, ifaceKw, ifaceRaw, overloadKw] = rest;
      if (listKw !== 'list' || !acl || ifaceKw !== 'interface' || !ifaceRaw) {
        return { output: ['% Incomplete command.'] };
      }
      const ifaceName = this._normalizeInterfaceName(ifaceRaw);
      if (!ifaceName || !this.state.interfaces[ifaceName])
        return { output: ['% Invalid interface'] };
      this.state.nat.rules.push({
        acl,
        exitIface: ifaceName,
        overload: overloadKw === 'overload',
      });
      return { output: [] };
    }

    if (
      this.state.options.enableDhcp &&
      lc === 'ip' &&
      rest[0] === 'dhcp' &&
      rest[1] === 'pool'
    ) {
      const poolName = rest[2];
      if (!poolName) return { output: ['% Incomplete command.'] };
      if (!this.state.dhcpPools[poolName]) {
        this.state.dhcpPools[poolName] = {
          network: null,
          mask: null,
          defaultRouter: null,
          dnsServer: null,
        };
      }
      this.state.session.mode = 'config-dhcp';
      this.state.session.currentDhcpPool = poolName;
      return { output: [] };
    }

    if (this._matches(lc, 'router')) {
      if (rest[0] && rest[0].toLowerCase() === 'ospf') {
        const pid = rest[1] || '1';
        this.state.ospf.enabled = true;
        this.state.ospf.processId = pid;
        this.state.session.mode = 'config-router';
        this.state.session.currentRouterProto = `ospf ${pid}`;
        return { output: [] };
      }
      return { output: this._invalidAt(line, this._tokenOffset(line, 1)) };
    }

    if (lc === 'ip' && rest[0] && rest[0].toLowerCase() === 'route') {
      const [network, mask, via] = rest.slice(1);
      if (!network || !mask || !via)
        return { output: ['% Incomplete command.'] };
      this.state.routes.push({ proto: 'S', network, mask, via, metric: 1 });
      return { output: [] };
    }

    if (this.state.options.enableVlans && this._matches(lc, 'vlan')) {
      const id = parseInt(rest[0], 10);
      if (!id) return { output: ['% Incomplete command.'] };
      if (!this.state.vlans[id]) {
        this.state.vlans[id] = {
          name: `VLAN${String(id).padStart(4, '0')}`,
          status: 'active',
          ports: [],
        };
      }
      this.state.session.mode = 'config-vlan';
      this.state.session.currentVlan = id;
      return { output: [] };
    }

    if (this.state.options.enableAcls && lc === 'access-list') {
      // access-list <number|name> <permit|deny> <spec...>
      const [name, action, ...specParts] = rest;
      if (!name || !action || specParts.length === 0)
        return { output: ['% Incomplete command.'] };
      if (action !== 'permit' && action !== 'deny') {
        return { output: this._invalidAt(line, this._tokenOffset(line, 2)) };
      }
      if (!this.state.acls[name]) {
        const num = parseInt(name, 10);
        const type = num >= 1 && num <= 99 ? 'standard' : 'extended';
        this.state.acls[name] = { type, rules: [] };
      }
      this.state.acls[name].rules.push({ action, spec: specParts.join(' ') });
      return { output: [] };
    }

    if (this._matches(lc, 'username')) {
      const [name, , , secret] = rest; // username X privilege 15 secret Y (simplified)
      if (!name) return { output: ['% Incomplete command.'] };
      this.state.users.push({ name, privilege: 15, secret: secret || 'cisco' });
      return { output: [] };
    }

    if (
      this._matches(lc, 'enable') &&
      rest[0] &&
      rest[0].toLowerCase() === 'secret'
    ) {
      if (!rest[1]) return { output: ['% Incomplete command.'] };
      this.state.enablePassword = rest[1];
      return { output: [] };
    }

    if (this._matches(lc, 'no')) {
      return this._execGlobalConfigNo(rest, line);
    }

    return { output: this._invalidAt(line, 0) };
  }

  _execGlobalConfigNo(rest, line) {
    if (
      rest[0] &&
      this._matches(rest[0].toLowerCase(), 'router') &&
      rest[1] === 'ospf'
    ) {
      this.state.ospf.enabled = false;
      return { output: [] };
    }
    return { output: this._invalidAt(line, 0) };
  }

  // ---------------------------------------------------------------------
  // Interface config mode
  // ---------------------------------------------------------------------
  _execInterfaceConfig(tokens, line) {
    const [cmd, ...rest] = tokens;
    const lc = cmd.toLowerCase();
    const iface = this.state.interfaces[this.state.session.currentInterface];

    if (this._matches(lc, 'exit')) {
      this.state.session.mode = 'config';
      this.state.session.currentInterface = null;
      return { output: [] };
    }
    if (lc === 'end') {
      this.state.resetToUserMode();
      return { output: [] };
    }

    if (lc === 'ip' && rest[0] && rest[0].toLowerCase() === 'address') {
      const [ip, mask] = rest.slice(1);
      if (!ip || !mask) return { output: ['% Incomplete command.'] };
      iface.ip = ip;
      iface.mask = mask;
      return { output: [] };
    }

    if (
      this.state.options.enableNat &&
      lc === 'ip' &&
      rest[0] === 'nat' &&
      (rest[1] === 'inside' || rest[1] === 'outside')
    ) {
      iface.natDirection = rest[1];
      return { output: [] };
    }

    if (
      this.state.options.enableAcls &&
      lc === 'ip' &&
      rest[0] === 'access-group'
    ) {
      const [aclName, direction] = rest.slice(1);
      if (!aclName || (direction !== 'in' && direction !== 'out')) {
        return { output: ['% Incomplete command.'] };
      }
      if (!this.state.acls[aclName]) {
        return { output: [`% ACL ${aclName} does not exist`] };
      }
      if (direction === 'in') iface.aclIn = aclName;
      else iface.aclOut = aclName;
      return { output: [] };
    }

    if (this._matches(lc, 'shutdown')) {
      iface.shutdown = true;
      iface.status = 'administratively down';
      iface.protocol = 'down';
      return { output: [] };
    }

    if (this._matches(lc, 'description')) {
      iface.description = rest.join(' ');
      return { output: [] };
    }

    if (this._matches(lc, 'no')) {
      const [sub, ...subRest] = rest;
      if (sub && this._matches(sub.toLowerCase(), 'shutdown')) {
        iface.shutdown = false;
        iface.status = 'up';
        iface.protocol = iface.ip ? 'up' : 'down';
        return { output: [] };
      }
      if (sub && sub.toLowerCase() === 'ip' && subRest[0] === 'address') {
        iface.ip = null;
        iface.mask = null;
        return { output: [] };
      }
      if (
        this.state.options.enableNat &&
        sub &&
        sub.toLowerCase() === 'ip' &&
        subRest[0] === 'nat'
      ) {
        iface.natDirection = null;
        return { output: [] };
      }
      if (
        this.state.options.enableAcls &&
        sub &&
        sub.toLowerCase() === 'ip' &&
        subRest[0] === 'access-group'
      ) {
        const direction = subRest[2];
        if (direction === 'in') iface.aclIn = null;
        else if (direction === 'out') iface.aclOut = null;
        else {
          iface.aclIn = null;
          iface.aclOut = null;
        }
        return { output: [] };
      }
      return { output: this._invalidAt(line, 0) };
    }

    return { output: this._invalidAt(line, 0) };
  }

  // ---------------------------------------------------------------------
  // Router (routing protocol) config mode
  // ---------------------------------------------------------------------
  _execRouterConfig(tokens, line) {
    const [cmd, ...rest] = tokens;
    const lc = cmd.toLowerCase();

    if (this._matches(lc, 'exit')) {
      this.state.session.mode = 'config';
      this.state.session.currentRouterProto = null;
      return { output: [] };
    }
    if (lc === 'end') {
      this.state.resetToUserMode();
      return { output: [] };
    }

    if (this._matches(lc, 'network')) {
      const [network, wildcard, areaKw, area] = rest;
      if (!network || !wildcard || areaKw !== 'area' || !area) {
        return { output: ['% Incomplete command.'] };
      }
      this.state.ospf.networks.push({ network, wildcard, area });
      return { output: [] };
    }

    return { output: this._invalidAt(line, 0) };
  }

  // ---------------------------------------------------------------------
  // VLAN config mode
  // ---------------------------------------------------------------------
  _execVlanConfig(tokens, line) {
    const [cmd, ...rest] = tokens;
    const lc = cmd.toLowerCase();
    const vlan = this.state.vlans[this.state.session.currentVlan];

    if (this._matches(lc, 'exit')) {
      this.state.session.mode = 'config';
      this.state.session.currentVlan = null;
      return { output: [] };
    }
    if (lc === 'end') {
      this.state.resetToUserMode();
      this.state.session.currentVlan = null;
      return { output: [] };
    }
    if (this._matches(lc, 'name')) {
      if (rest.length === 0) return { output: ['% Incomplete command.'] };
      vlan.name = rest[0];
      return { output: [] };
    }
    return { output: this._invalidAt(line, 0) };
  }

  // ---------------------------------------------------------------------
  // DHCP pool config mode
  // ---------------------------------------------------------------------
  _execDhcpConfig(tokens, line) {
    const [cmd, ...rest] = tokens;
    const lc = cmd.toLowerCase();
    const pool = this.state.dhcpPools[this.state.session.currentDhcpPool];

    if (this._matches(lc, 'exit')) {
      this.state.session.mode = 'config';
      this.state.session.currentDhcpPool = null;
      return { output: [] };
    }
    if (lc === 'end') {
      this.state.resetToUserMode();
      this.state.session.currentDhcpPool = null;
      return { output: [] };
    }
    if (this._matches(lc, 'network')) {
      const [network, mask] = rest;
      if (!network || !mask) return { output: ['% Incomplete command.'] };
      pool.network = network;
      pool.mask = mask;
      return { output: [] };
    }
    if (lc === 'default-router') {
      if (!rest[0]) return { output: ['% Incomplete command.'] };
      pool.defaultRouter = rest[0];
      return { output: [] };
    }
    if (lc === 'dns-server') {
      if (!rest[0]) return { output: ['% Incomplete command.'] };
      pool.dnsServer = rest[0];
      return { output: [] };
    }
    return { output: this._invalidAt(line, 0) };
  }

  // ---------------------------------------------------------------------
  // Tab completion support (used by cli-engine.js)
  // ---------------------------------------------------------------------
  suggest(partialLine) {
    const tokens = partialLine.split(' ');
    const lastToken = tokens[tokens.length - 1] || '';
    const candidates = this._candidatesForMode();
    return candidates.filter((c) => c.startsWith(lastToken.toLowerCase()));
  }

  _candidatesForMode() {
    const mode = this.state.session.mode;
    if (mode === 'config-if') {
      const cands = ['ip', 'shutdown', 'no', 'description', 'exit'];
      return cands;
    }
    if (mode === 'config-router') return ['network', 'exit'];
    if (mode === 'config-vlan') return ['name', 'exit'];
    if (mode === 'config-dhcp')
      return ['network', 'default-router', 'dns-server', 'exit'];
    if (mode === 'config') {
      const cands = [
        'interface',
        'hostname',
        'router',
        'ip',
        'username',
        'enable',
        'no',
        'exit',
        'end',
      ];
      if (this.state.options.enableVlans) cands.push('vlan');
      if (this.state.options.enableAcls) cands.push('access-list');
      return cands;
    }
    if (this.state.session.privileged) {
      return [
        'show',
        'configure',
        'write',
        'copy',
        'ping',
        'reload',
        'disable',
        'exit',
      ];
    }
    return ['enable', 'show', 'ping', 'exit'];
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  /** Cisco allows unambiguous prefix abbreviations for keywords. */
  _matches(token, full) {
    return token.length > 0 && full.startsWith(token);
  }

  _invalidAt() {
    return [`% Invalid input detected at '^' marker.`];
  }

  _tokenOffset(line, tokenIndex) {
    const tokens = line.split(' ');
    let offset = 0;
    for (let i = 0; i < tokenIndex; i++) {
      offset += tokens[i].length + 1;
    }
    return offset;
  }

  _normalizeInterfaceName(raw) {
    const map = {
      gi: 'GigabitEthernet',
      gig: 'GigabitEthernet',
      gigabitethernet: 'GigabitEthernet',
      fa: 'FastEthernet',
      fastethernet: 'FastEthernet',
      lo: 'Loopback',
      loopback: 'Loopback',
      se: 'Serial',
      serial: 'Serial',
    };
    const m = raw.match(/^([a-zA-Z]+)([\d\/.]+)$/);
    if (!m) return null;
    const prefix = m[1].toLowerCase();
    const full = map[prefix];
    if (!full) return null;
    return `${full}${m[2]}`;
  }

  _maskToCidr(mask) {
    if (!mask) return 0;
    return mask.split('.').reduce((acc, octet) => {
      return acc + (parseInt(octet, 10).toString(2).match(/1/g) || []).length;
    }, 0);
  }

  _padTable(rows) {
    const widths = rows[0].map((_, colIdx) =>
      Math.max(...rows.map((r) => String(r[colIdx]).length)),
    );
    return rows.map((r) =>
      r
        .map((cell, i) => String(cell).padEnd(widths[i] + 2))
        .join('')
        .trimEnd(),
    );
  }

  _helpForCurrentMode() {
    const cands = this._candidatesForMode();
    return ['', ...cands.map((c) => `  ${c}`), ''];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = IOSParser;
} else {
  window.IOSParser = IOSParser;
}
