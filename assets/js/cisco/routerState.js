class RouterState {
  constructor(opts = {}) {
    this.hostname = opts.hostname || 'Router';
    this.enablePassword = opts.enablePassword || 'cisco';
    this.vtyPassword = opts.vtyPassword || 'cisco';

    // Feature toggles — switch parts of the simulation on/off without
    // touching ios-parser.js. All default to true except deviceType,
    // which controls vocabulary differences (switch vs router).
    this.options = {
      deviceType: opts.deviceType || 'router', // 'router' | 'switch'
      enableVlans: opts.enableVlans !== false,
      enableAcls: opts.enableAcls !== false,
      enableOspf: opts.enableOspf !== false,
      enableNat: opts.enableNat !== false,
      enableDhcp: opts.enableDhcp !== false,
      motd: opts.motd || 'Unauthorized access prohibited.',
    };

    // Session / privilege state
    this.session = {
      connected: false,
      authenticated: false,
      privileged: false, // enable mode (#)
      mode: 'user', // user | privileged | config | config-if | config-router
      currentInterface: null, // e.g. 'GigabitEthernet0/0' when in config-if
      currentRouterProto: null, // e.g. 'ospf 1' when in router config
    };

    // Interfaces: keyed by normalized name
    this.interfaces = {
      'GigabitEthernet0/0': this._iface({
        ip: '192.168.1.1',
        mask: '255.255.255.0',
        status: 'up',
        protocol: 'up',
        description: 'Uplink to LAN',
      }),
      'GigabitEthernet0/1': this._iface({
        ip: null,
        mask: null,
        status: 'administratively down',
        protocol: 'down',
      }),
      Loopback0: this._iface({
        ip: '10.10.10.1',
        mask: '255.255.255.255',
        status: 'up',
        protocol: 'up',
      }),
    };

    // Static routing table: { network, mask, nextHop|exitIface, metric, proto }
    this.routes = [
      {
        proto: 'C',
        network: '192.168.1.0',
        mask: '255.255.255.0',
        via: 'GigabitEthernet0/0',
        metric: 0,
      },
      {
        proto: 'C',
        network: '10.10.10.1',
        mask: '255.255.255.255',
        via: 'Loopback0',
        metric: 0,
      },
    ];

    this.ospf = { enabled: false, processId: null, networks: [] };

    // VLANs: id -> { name, status, ports[] }
    this.vlans = {
      1: { name: 'default', status: 'active', ports: ['Gi0/1', 'Gi0/2'] },
      10: { name: 'MANAGEMENT', status: 'active', ports: [] },
      20: { name: 'USERS', status: 'active', ports: [] },
    };

    // Named/numbered ACLs: name -> { type: 'standard'|'extended', rules: [] }
    this.acls = {};

    // NAT: overload rules created via
    // "ip nat inside source list <acl> interface <if> overload"
    this.nat = {
      rules: [], // { acl, exitIface, overload: bool }
      translations: [], // simulated live entries, purely cosmetic
    };

    // DHCP pools: name -> { network, mask, defaultRouter, dnsServer }
    this.dhcpPools = {};

    this.cdpNeighbors = [
      {
        deviceId: 'SW-01',
        localIface: 'Gi0/0',
        platform: 'WS-C2960X',
        holdtime: 153,
        capability: 'S',
      },
    ];

    // For "show" of secrets, running-config, etc.
    this.users = [
      { name: 'admin', privilege: 15, secret: this.enablePassword },
    ];

    this.version = {
      ios: '17.09.01',
      uptimeSeconds: 0,
      model: 'CSR1000V',
    };

    this.history = { commands: [] };
    this._bootTime = Date.now();
  }

  _iface({ ip, mask, status, protocol, description }) {
    return {
      ip,
      mask,
      status,
      protocol,
      description: description || '',
      shutdown: status === 'administratively down',
      natDirection: null, // null | 'inside' | 'outside'
      aclIn: null, // ACL name applied inbound
      aclOut: null, // ACL name applied outbound
    };
  }

  uptimeString() {
    const secs = Math.floor((Date.now() - this._bootTime) / 1000);
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${d} days, ${h} hours, ${m} minutes, ${s} seconds`;
  }

  getPrompt() {
    const base = this.hostname;
    switch (this.session.mode) {
      case 'config':
        return `${base}(config)#`;
      case 'config-if':
        return `${base}(config-if)#`;
      case 'config-router':
        return `${base}(config-router)#`;
      case 'config-vlan':
        return `${base}(config-vlan)#`;
      case 'config-dhcp':
        return `${base}(dhcp-config)#`;
      case 'privileged':
        return `${base}#`;
      default:
        return `${base}>`;
    }
  }

  resetToUserMode() {
    this.session.mode = this.session.privileged ? 'privileged' : 'user';
    this.session.currentInterface = null;
    this.session.currentRouterProto = null;
    this.session.currentVlan = null;
    this.session.currentDhcpPool = null;
  }

  /**
   * Builds a realistic running-config text block from current state.
   */
  buildRunningConfig() {
    const lines = [];
    lines.push('Building configuration...');
    lines.push('');
    lines.push('Current configuration : 1441 bytes');
    lines.push('!');
    lines.push(`version 15.2`);
    lines.push('service timestamps debug datetime msec');
    lines.push('service timestamps log datetime msec');
    lines.push('no service password-encryption');
    lines.push('!');
    lines.push(`hostname ${this.hostname}`);
    lines.push('!');
    lines.push('boot-start-marker');
    lines.push('boot-end-marker');
    lines.push('!');
    lines.push(
      `enable secret 5 $1$mERr$${this._fakeHash(this.enablePassword)}`,
    );
    lines.push('!');
    for (const u of this.users) {
      lines.push(
        `username ${u.name} privilege ${u.privilege} secret 5 $1$mERr$${this._fakeHash(u.secret)}`,
      );
    }
    lines.push('!');
    for (const [name, i] of Object.entries(this.interfaces)) {
      lines.push(`interface ${name}`);
      if (i.description) lines.push(` description ${i.description}`);
      if (i.ip) {
        lines.push(` ip address ${i.ip} ${i.mask}`);
      } else {
        lines.push(' no ip address');
      }
      if (i.aclIn) lines.push(` ip access-group ${i.aclIn} in`);
      if (i.aclOut) lines.push(` ip access-group ${i.aclOut} out`);
      if (i.natDirection) lines.push(` ip nat ${i.natDirection}`);
      lines.push(i.shutdown ? ' shutdown' : ' no shutdown');
      lines.push('!');
    }
    if (this.options.enableDhcp) {
      for (const [name, pool] of Object.entries(this.dhcpPools)) {
        lines.push(`ip dhcp pool ${name}`);
        if (pool.network) lines.push(` network ${pool.network} ${pool.mask}`);
        if (pool.defaultRouter)
          lines.push(` default-router ${pool.defaultRouter}`);
        if (pool.dnsServer) lines.push(` dns-server ${pool.dnsServer}`);
        lines.push('!');
      }
    }
    if (this.ospf.enabled) {
      lines.push(`router ospf ${this.ospf.processId}`);
      for (const n of this.ospf.networks) {
        lines.push(` network ${n.network} ${n.wildcard} area ${n.area}`);
      }
      lines.push('!');
    }
    for (const r of this.routes.filter((r) => r.proto === 'S')) {
      lines.push(`ip route ${r.network} ${r.mask} ${r.via}`);
    }
    lines.push('!');
    if (this.options.enableAcls) {
      for (const [name, acl] of Object.entries(this.acls)) {
        for (const rule of acl.rules) {
          lines.push(`access-list ${name} ${rule.action} ${rule.spec}`);
        }
      }
      if (Object.keys(this.acls).length) lines.push('!');
    }
    if (this.options.enableNat) {
      for (const r of this.nat.rules) {
        lines.push(
          `ip nat inside source list ${r.acl} interface ${r.exitIface}${r.overload ? ' overload' : ''}`,
        );
      }
      if (this.nat.rules.length) lines.push('!');
    }
    lines.push('line con 0');
    lines.push('line vty 0 4');
    lines.push(` password ${this.vtyPassword}`);
    lines.push(' login');
    lines.push('!');
    lines.push('end');
    return lines.join('\n');
  }

  // Not real MD5 — just deterministic filler so config looks encrypted-ish.
  _fakeHash(seed) {
    let h = 0;
    const str = String(seed);
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h.toString(36).padEnd(22, '0').slice(0, 22);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RouterState;
} else {
  window.RouterState = RouterState;
}
