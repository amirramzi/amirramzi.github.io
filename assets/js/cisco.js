window.Cisco = {
  active: false,
  privileged: false,
  configMode: false,
  waitingPassword: false,
  hostname: 'Amir-R1',
  password: '123',

  getPrompt() {
    if (this.configMode) {
      return `${this.hostname}(config)# `;
    }

    if (this.privileged) {
      return `${this.hostname}# `;
    }

    return `${this.hostname}> `;
  },

  login(term) {
    term.writeln('');
    term.writeln('Trying 192.168.1.1...');
    term.writeln('Connected to 192.168.1.1');
    term.writeln('');
    term.write('Password: ');
    this.waitingPassword = true;
  },

  authenticate(term, inputPassword) {
    this.waitingPassword = false;

    if (inputPassword !== this.password) {
      term.writeln('');
      term.writeln('% Authentication failed');
      term.writeln('');
      return false;
    }

    this.active = true;
    this.privileged = false;
    this.configMode = false;

    term.writeln('');
    term.writeln('');
    term.writeln('Cisco IOS XE Software, Version 17.09.01');
    term.writeln('Unauthorized access prohibited.');
    term.writeln('');
    return true;
  },

  execute(term, cmd) {
    const trimmedCmd = cmd.trim();
    const lowerCmd = trimmedCmd.toLowerCase();

    if (lowerCmd === '') {
      return;
    }

    // Command HELP
    if (lowerCmd === '?' || lowerCmd === 'help') {
      term.writeln('');
      term.writeln('  enable                  Turn on privileged commands');
      term.writeln('  disable                 Turn off privileged commands');
      term.writeln('  configure terminal      Enter configuration mode');
      term.writeln(
        '  show version            System hardware and software status',
      );
      term.writeln('  show running-config     Current operating configuration');
      term.writeln(
        '  show ip interface brief IP status and configuration summary',
      );
      term.writeln('  show ip route           IP routing table');
      term.writeln('  show cdp neighbors      List of CDP neighbors');
      term.writeln('  write memory            Save running configuration');
      term.writeln(
        '  exit                    Exit from the current mode or close connection',
      );
      term.writeln('');
      return;
    }

    // Config Mode Commands
    if (this.configMode) {
      if (lowerCmd === 'exit' || lowerCmd === 'end') {
        this.configMode = false;
        return;
      }

      if (lowerCmd.startsWith('hostname ')) {
        const newHostname = trimmedCmd.substring(9).trim();
        if (newHostname) {
          this.hostname = newHostname;
        } else {
          term.writeln('% Incomplete command.');
        }
        return;
      }

      term.writeln('% Invalid input or command not supported in config mode.');
      return;
    }

    // Enable / Disable Commands
    if (lowerCmd === 'enable' || lowerCmd === 'en') {
      this.privileged = true;
      return;
    }

    if (lowerCmd === 'disable' || lowerCmd === 'dis') {
      this.privileged = false;
      this.configMode = false;
      return;
    }

    // Enter Configuration Mode
    if (lowerCmd === 'configure terminal' || lowerCmd === 'conf t') {
      if (!this.privileged) {
        term.writeln('% Privileged mode required.');
        return;
      }
      this.configMode = true;
      return;
    }

    // Show Running Config
    if (
      lowerCmd === 'show running-config' ||
      lowerCmd === 'show run' ||
      lowerCmd === 'sh run'
    ) {
      if (!this.privileged) {
        term.writeln('% Privilege level too low.');
        return;
      }
      term.writeln('');
      term.writeln('Building configuration...');
      term.writeln('');
      term.writeln(`hostname ${this.hostname}`);
      term.writeln('!');
      term.writeln(`username admin privilege 15 secret ${this.password}`);
      term.writeln('!');
      term.writeln('interface GigabitEthernet0/0');
      term.writeln(' description Portfolio Interface');
      term.writeln(' ip address 192.168.1.1 255.255.255.0');
      term.writeln(' no shutdown');
      term.writeln('!');
      term.writeln('router ospf 1');
      term.writeln(' network 192.168.1.0 0.0.0.255 area 0');
      term.writeln('!');
      term.writeln('end');
      term.writeln('');
      return;
    }

    // Show Version
    if (lowerCmd === 'show version' || lowerCmd === 'sh ver') {
      term.writeln('');
      term.writeln('Cisco IOS XE Software, Version 17.09.01');
      term.writeln('Compiled Fri 01-Jul-26');
      term.writeln('Technical Support: http://www.cisco.com');
      term.writeln(`Hostname: ${this.hostname}`);
      term.writeln('Model number: Network Security Engineer');
      term.writeln('');
      return;
    }

    // Show IP Interface Brief
    if (
      lowerCmd === 'show ip interface brief' ||
      lowerCmd === 'sh ip int br' ||
      lowerCmd === 'sh ip int brief'
    ) {
      term.writeln('');
      term.writeln('Interface              IP-Address      OK? Method Status');
      term.writeln('GigabitEthernet0/0     192.168.1.1     YES manual up');
      term.writeln('GigabitEthernet0/1     unassigned      YES unset  down');
      term.writeln('Loopback0              10.10.10.1      YES manual up');
      term.writeln('');
      return;
    }

    // Show IP Route
    if (
      lowerCmd === 'show ip route' ||
      lowerCmd === 'sh ip ro' ||
      lowerCmd === 'sh ip route'
    ) {
      term.writeln('');
      term.writeln('Gateway of last resort is not set');
      term.writeln('');
      term.writeln(
        'C    192.168.1.0/24 is directly connected, GigabitEthernet0/0',
      );
      term.writeln('C    10.10.10.1/32 is directly connected, Loopback0');
      term.writeln('');
      return;
    }

    // Show CDP Neighbors
    if (
      lowerCmd === 'show cdp neighbors' ||
      lowerCmd === 'sh cdp nei' ||
      lowerCmd === 'sh cdp neighbors'
    ) {
      term.writeln('');
      term.writeln('Device ID        Local Intrfce     Holdtme');
      term.writeln('SW-01            Gi0/0             153');
      term.writeln('');
      return;
    }

    // Write Config (Save)
    if (
      lowerCmd === 'write' ||
      lowerCmd === 'wr' ||
      lowerCmd === 'write memory' ||
      lowerCmd === 'copy run start'
    ) {
      if (!this.privileged) {
        term.writeln('% Privileged mode required.');
        return;
      }
      term.writeln('Building configuration...');
      term.writeln('[OK]');
      return;
    }

    // Exit Connection
    if (lowerCmd === 'exit') {
      this.active = false;
      this.privileged = false;
      this.configMode = false;

      term.writeln('');
      term.writeln('Connection to 192.168.1.1 closed.');
      term.writeln('');
      return;
    }

    // Default Error
    term.writeln("% Invalid input detected at '^' marker.");
  },
};
