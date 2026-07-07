class CiscoCLIEngine {
  constructor(term, opts = {}) {
    this.term = term;
    this.state = new RouterState(opts);
    this.parser = new IOSParser(this.state);

    this.buffer = '';
    this.cursorPos = 0;
    this.history = [];
    this.historyIndex = -1;

    // Multi-step auth flow: 'password' -> 'enable-password' -> null
    this.authStep = null;
    this.onDisconnect = null;
  }

  /** Call this to begin the "ssh admin@router" experience. */
  connect() {
    this.state.session.connected = true;
    this.term.writeln('');
    this.term.writeln('Trying 192.168.1.1...');
    this.term.writeln('Connected to 192.168.1.1');
    this.term.writeln("Escape character is '^]'.");
    this.term.writeln('');
    this._promptForPassword();
  }

  _promptForPassword() {
    this.authStep = 'password';
    this.buffer = '';
    this.cursorPos = 0;
    this.term.write('Password: ');
  }

  _promptForEnablePassword() {
    this.authStep = 'enable-password';
    this.buffer = '';
    this.cursorPos = 0;
    this.term.write('Password: ');
  }

  isConnected() {
    return this.state.session.connected;
  }

  writePrompt() {
    this.term.write(this.state.getPrompt() + ' ');
  }

  /** Feed raw terminal input, one key/paste chunk at a time (xterm's onData). */
  handleInput(data) {
    for (const ch of data) {
      this._handleChar(ch);
    }
  }

  _handleChar(ch) {
    switch (ch) {
      case '\r':
        this._handleEnter();
        break;

      case '\u007F': // Backspace
        if (this.cursorPos > 0) {
          this.buffer =
            this.buffer.slice(0, this.cursorPos - 1) +
            this.buffer.slice(this.cursorPos);
          this.cursorPos--;
          this.term.write('\b \b');
        }
        break;

      case '\u0009': // Tab
        this._handleTab();
        break;

      case '\u001b[A': // Up arrow
        this._historyUp();
        break;

      case '\u001b[B': // Down arrow
        this._historyDown();
        break;

      case '\u0003': // Ctrl-C
        this.term.write('^C\r\n');
        this.buffer = '';
        this.cursorPos = 0;
        if (this.authStep) {
          this.authStep = null;
          this._closeConnection();
        } else {
          this.writePrompt();
        }
        break;

      default:
        if (ch.length === 1 && ch >= ' ') {
          this.buffer =
            this.buffer.slice(0, this.cursorPos) +
            ch +
            this.buffer.slice(this.cursorPos);
          this.cursorPos++;
          this.term.write(this.authStep ? '*' : ch);
        }
    }
  }

  _handleEnter() {
    this.term.write('\r\n');
    const line = this.buffer;
    this.buffer = '';
    this.cursorPos = 0;

    if (this.authStep === 'password') {
      this._checkVtyPassword(line);
      return;
    }
    if (this.authStep === 'enable-password') {
      this._checkEnablePassword(line);
      return;
    }

    if (line.trim() !== '') {
      this.history.push(line);
      this.historyIndex = this.history.length;
    }

    // Intercept bare "enable" here so we can run the password sub-dialog
    // (IOSParser assumes no-password enable for simplicity elsewhere).
    const trimmed = line.trim().toLowerCase();
    if (
      !this.state.session.privileged &&
      trimmed.length > 0 &&
      'enable'.startsWith(trimmed)
    ) {
      this._promptForEnablePassword();
      return;
    }

    const result = this.parser.run(line);
    this._printOutput(result.output);

    if (result.disconnect) {
      this._closeConnection();
      return;
    }

    this.writePrompt();
  }

  _checkVtyPassword(input) {
    this.authStep = null;
    if (input !== this.state.vtyPassword) {
      this.term.writeln('% Authentication failed');
      this.term.writeln('');
      this._closeConnection();
      return;
    }
    this.state.session.authenticated = true;
    this.term.writeln('');
    this.term.writeln(
      `Cisco IOS XE Software, Version ${this.state.version.ios}`,
    );
    this.term.writeln('Unauthorized access prohibited.');
    this.term.writeln('');
    this.writePrompt();
  }

  _checkEnablePassword(input) {
    this.authStep = null;
    if (input !== this.state.enablePassword) {
      this.term.writeln('% Access denied');
      this.writePrompt();
      return;
    }
    this.state.session.privileged = true;
    this.state.session.mode = 'privileged';
    this.writePrompt();
  }

  _closeConnection() {
    this.state.session.connected = false;
    this.state.session.authenticated = false;
    this.state.session.privileged = false;
    this.state.resetToUserMode();
    this.term.writeln('Connection to 192.168.1.1 closed by remote host.');
    this.term.writeln('');
    if (typeof this.onDisconnect === 'function') {
      this.onDisconnect();
    }
  }

  _printOutput(lines) {
    for (const l of lines) {
      this.term.writeln(l);
    }
  }

  // -----------------------------------------------------------------
  // History
  // -----------------------------------------------------------------
  _historyUp() {
    if (this.history.length === 0 || this.historyIndex <= 0) return;
    this.historyIndex--;
    this._replaceBuffer(this.history[this.historyIndex]);
  }

  _historyDown() {
    if (this.historyIndex >= this.history.length - 1) {
      this.historyIndex = this.history.length;
      this._replaceBuffer('');
      return;
    }
    this.historyIndex++;
    this._replaceBuffer(this.history[this.historyIndex]);
  }

  _replaceBuffer(newValue) {
    this.term.write('\b \b'.repeat(this.buffer.length));
    this.buffer = newValue;
    this.cursorPos = newValue.length;
    this.term.write(newValue);
  }

  // -----------------------------------------------------------------
  // Tab completion
  // -----------------------------------------------------------------
  _handleTab() {
    if (this.authStep) return;
    const suggestions = this.parser.suggest(this.buffer);
    if (suggestions.length === 1) {
      const tokens = this.buffer.split(' ');
      const lastLen = tokens[tokens.length - 1].length;
      const completion = suggestions[0].slice(lastLen);
      this.buffer += completion;
      this.cursorPos = this.buffer.length;
      this.term.write(completion);
    } else if (suggestions.length > 1) {
      this.term.write('\r\n');
      this.term.writeln(suggestions.join('  '));
      this.writePrompt();
      this.term.write(this.buffer);
    }
    // zero suggestions: real IOS just beeps; we do nothing.
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CiscoCLIEngine;
} else {
  window.CiscoCLIEngine = CiscoCLIEngine;
}
