const STORAGE_KEY_ROUTER = 'cisco-emulator:router-state:v1';
const STORAGE_KEY_SCREEN = 'cisco-emulator:screen-buffer:v1';
const STORAGE_KEY_SESSION = 'cisco-emulator:session-flags:v1';

function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    console.warn(`localStorage read failed for "${key}":`, err);
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`localStorage write failed for "${key}":`, err);
    return false;
  }
}

function tryLoadAddon(term, label, factory) {
  try {
    const addon = factory();
    term.loadAddon(addon);
    return addon;
  } catch (err) {
    console.warn(
      `[terminal] ${label} addon failed to load — continuing without it.`,
      err,
    );
    return null;
  }
}

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

  const webglAddon = tryLoadAddon(
    term,
    'WebGL',
    () => new WebglAddon.WebglAddon(),
  );
  if (webglAddon) {
    webglAddon.onContextLoss(() => {
      webglAddon.dispose();
    });
  }
  const searchAddon = tryLoadAddon(
    term,
    'Search',
    () => new SearchAddon.SearchAddon(),
  );
  const serializeAddon = tryLoadAddon(
    term,
    'Serialize',
    () => new SerializeAddon.SerializeAddon(),
  );

  const kaliPrompt = '┌──(amirramzi@kali)-[~]\r\n└─# ';

  const ciscoEngine = new CiscoCLIEngine(term, {
    hostname: 'Amir-R1',
    enablePassword: '123',
    vtyPassword: '123',
    enableAcls: true,
    enableVlans: true,
  });

  let inCiscoSession = false;

  ciscoEngine.onDisconnect = () => {
    inCiscoSession = false;
    term.write(kaliPrompt);
  };

  let restoredScreen = false;
  const savedRouterJson = safeLocalStorageGet(STORAGE_KEY_ROUTER);
  if (savedRouterJson) {
    try {
      ciscoEngine.state.restore(JSON.parse(savedRouterJson));
    } catch (err) {
      console.warn('[terminal] Ignoring corrupted saved router state.', err);
    }
  }

  const savedSessionJson = safeLocalStorageGet(STORAGE_KEY_SESSION);
  let savedInCiscoSession = false;
  if (savedSessionJson) {
    try {
      savedInCiscoSession = !!JSON.parse(savedSessionJson).inCiscoSession;
    } catch (err) {
      console.warn('[terminal] Ignoring corrupted saved session flags.', err);
    }
  }

  if (serializeAddon) {
    const savedScreen = safeLocalStorageGet(STORAGE_KEY_SCREEN);
    if (savedScreen) {
      try {
        term.write(savedScreen);
        restoredScreen = true;
        inCiscoSession = savedInCiscoSession && ciscoEngine.isConnected();
      } catch (err) {
        console.warn('[terminal] Failed to restore screen buffer.', err);
      }
    }
  }

  if (!restoredScreen) {
    term.writeln('Kali GNU/Linux Rolling');
    term.writeln("Welcome to Amirhosein Ramzi's Terminal");
    term.writeln("Type 'help' to see available commands.");
    term.writeln('');
    term.write(kaliPrompt);
  }

  function persistState() {
    safeLocalStorageSet(
      STORAGE_KEY_ROUTER,
      JSON.stringify(ciscoEngine.state.serialize()),
    );
    safeLocalStorageSet(
      STORAGE_KEY_SESSION,
      JSON.stringify({ inCiscoSession }),
    );
    if (serializeAddon) {
      try {
        safeLocalStorageSet(STORAGE_KEY_SCREEN, serializeAddon.serialize());
      } catch (err) {
        console.warn('[terminal] Failed to serialize screen buffer.', err);
      }
    }
  }

  window.addEventListener('beforeunload', persistState);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistState();
  });
  setInterval(persistState, 5000);

  if (searchAddon) {
    term.attachCustomKeyEventHandler((e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'f' &&
        e.type === 'keydown'
      ) {
        e.preventDefault();
        const query = window.prompt('Search terminal buffer:');
        if (query) searchAddon.findNext(query, { incremental: false });
        return false;
      }
      return true;
    });
  }

  let command = '';

  term.onData((e) => {
    if (inCiscoSession) {
      ciscoEngine.handleInput(e);
      return;
    }

    switch (e) {
      case '\r':
        term.write('\r\n');
        executeKaliCommand(command.trim());
        command = '';
        if (!inCiscoSession) term.write(kaliPrompt);
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

  function executeKaliCommand(cmd) {
    switch (cmd) {
      case 'ssh admin@router':
      case 'ssh admin@192.168.1.1':
      case 'ssh router':
      case 'ssh cisco':
        inCiscoSession = true;
        ciscoEngine.connect();
        break;

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
          '\x1b[1;38;2;163;196;243m🌐  ssh admin@router\x1b[0m \x1b[38;2;163;196;243mConnect to Cisco Router\x1b[0m',
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
