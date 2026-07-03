document.addEventListener('DOMContentLoaded', () => {
  const term = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 15,
    lineHeight: 1.2,
    letterSpacing: 0,
    theme: {
      background: '#0c0c0c',
      foreground: '#00ff9c',
      cursor: '#00ff9c',
      selectionBackground: '#264f78',

      black: '#000000',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',

      brightBlack: '#6272a4',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff',
    },
  });

  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);

  term.open(document.getElementById('terminal'));
  fitAddon.fit();

  const prompt = '┌──(amirramzi㉿kali)-[~]\r\n└─# ';

  term.writeln('Kali GNU/Linux Rolling');
  term.writeln("Welcome to Amirhosein Ramzi's Terminal");
  term.writeln("Type 'help' to see available commands.");
  term.writeln('');
  term.write(prompt);

  let command = '';

  term.onData((e) => {
    switch (e) {
      case '\r':
        term.write('\r\n');
        execute(command.trim());
        command = '';
        term.write(prompt);
        break;

      case '\u007F':
        if (command.length > 0) {
          command = command.slice(0, -1);
          term.write('\b \b');
        }
        break;

      default:
        command += e;
        term.write(e);
    }
  });

  function execute(cmd) {
    switch (cmd) {
      case 'help':
        term.writeln('');
        term.writeln('Available commands');
        term.writeln('────────────────────────────────');
        term.writeln(
          '\x1b[1;38;2;255;209;102m📄  about\x1b[0m      \x1b[38;2;255;209;102mLearn more about me\x1b[0m',
        );
        term.writeln(
          '\x1b[1;38;2;239;71;111m⚡  skills\x1b[0m     \x1b[38;2;239;71;111mView my technical skills\x1b[0m',
        );
        term.writeln(
          '\x1b[1;38;2;0;180;216m🚀  projects\x1b[0m   \x1b[38;2;0;180;216mExplore my projects\x1b[0m',
        );
        term.writeln(
          '\x1b[1;38;2;254;127;45m🧹  clear\x1b[0m      \x1b[38;2;254;127;45mClear the terminal screen\x1b[0m',
        );
        term.writeln(
          '\x1b[1;38;2;163;196;243m❓  help\x1b[0m       \x1b[38;2;163;196;243mDisplay this help message\x1b[0m',
        );
        term.writeln('');
        break;

      case 'about':
        term.writeln('');

        const isMobile = window.innerWidth < 768;

        if (isMobile) {
          term.writeln("Hi, I'm Amirhosein Ramzi");
          term.writeln('──────────────────');
          term.writeln('Role   : Network Security Engineer');
          term.writeln('Study  : Computer Networks Student');
          term.writeln('Focus  : Cisco & Network Security');
          term.writeln('Former : React / Next.js Developer');
          term.writeln('');
          term.writeln('Current Focus');
          term.writeln('• CCNA & CCNP');
          term.writeln('• FortiGate & Linux');
          term.writeln('• EVE-NG Labs');
          term.writeln('• Network Automation');
          term.writeln('');
          term.writeln('Technical Skills');
          term.writeln('• TCP/IP & Routing');
          term.writeln('• VLANs & Subnetting');
          term.writeln('• Firewalls & VPN');
          term.writeln('• Wireshark & Linux');
          term.writeln('');
          term.writeln('Goal');
          term.writeln('Build a career in Network Security.');
        } else {
          term.writeln('╭────────────────────────────────────────────╮');
          term.writeln("│ Hi, I'm Amirhosein Ramzi                   │");
          term.writeln('├────────────────────────────────────────────┤');
          term.writeln('│ Role   : Network Security Engineer         │');
          term.writeln('│ Study  : Computer Networks Student         │');
          term.writeln('│ Focus  : Cisco & Network Security          │');
          term.writeln('│ Former : Front-End Developer (React/Next)  │');
          term.writeln('├────────────────────────────────────────────┤');
          term.writeln('│ Current Focus                              │');
          term.writeln('│ • CCNA & CCNP                              │');
          term.writeln('│ • FortiGate & Linux                        │');
          term.writeln('│ • EVE-NG Labs                              │');
          term.writeln('│ • Network Automation (Future)              │');
          term.writeln('├────────────────────────────────────────────┤');
          term.writeln('│ Technical Skills                           │');
          term.writeln('│ • TCP/IP, Routing & Switching              │');
          term.writeln('│ • VLANs, Subnetting, Troubleshooting       │');
          term.writeln('│ • Firewalls & VPN Technologies             │');
          term.writeln('│ • Wireshark, Git, GitHub, Linux            │');
          term.writeln('├────────────────────────────────────────────┤');
          term.writeln('│ Goal                                       │');
          term.writeln('│ Build a career in Network Security         │');
          term.writeln('│ through hands-on labs and real projects.   │');
          term.writeln('╰────────────────────────────────────────────╯');
        }

        term.writeln('');
        break;

      case 'skills':
        term.writeln('Cisco, Fortinet, Network Security.');
        term.writeln('');
        break;

      case 'projects':
        term.writeln('DHCP Security Research');
        term.writeln('');
        break;

      case 'clear':
        term.clear();
        break;

      case '':
        break;

      default:
        term.writeln(`Command not found: ${cmd}`);
        term.writeln('');
    }
  }

  window.addEventListener('resize', () => {
    fitAddon.fit();
  });
});
document.querySelector('.terminal-wrapper').addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);
