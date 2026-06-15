/*jslint browser:true */

var jQuery;
var wssh = {};

jQuery(function ($) {
  var status = $('#status'),
    button = $('.btn-primary'),
    form_container = $('.form-container'),
    waiter = $('#waiter'),
    term_type = $('#term'),
    style = {},
    default_title = 'WebSSH',
    title_element = document.querySelector('title'),
    form_id = '#connect',
    debug = document.querySelector(form_id).noValidate,
    custom_font = document.fonts ? document.fonts.values().next().value : undefined,
    default_fonts,
    DISCONNECTED = 0,
    CONNECTING = 1,
    CONNECTED = 2,
    state = DISCONNECTED,
    messages = { 1: 'This client is connecting ...', 2: 'This client is already connnected.' },
    key_max_size = 16384,
    fields = ['hostname', 'port', 'username'],
    form_keys = fields.concat([]),
    opts_keys = ['bgcolor', 'title', 'encoding', 'command', 'term', 'fontsize', 'fontcolor', 'cursor'],
    url_form_data = {},
    url_opts_data = {},
    validated_form_data,
    hostname_tester = /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))|(^\s*((?=.{1,255}$)(?=.*[A-Za-z].*)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*)\s*$)/;

  // Auto-detect FitAddon UMD format: some builds export class directly,
  // others wrap it as {FitAddon: class}
  function getFitAddonClass() {
    if (typeof window.FitAddon === 'function') return window.FitAddon;
    if (window.FitAddon && typeof window.FitAddon.FitAddon === 'function') return window.FitAddon.FitAddon;
    return null;
  }


  function store_items(names, data) {
    var i, name, value;

    for (i = 0; i < names.length; i++) {
      name = names[i];
      value = data.get(name);
      if (value) {
        window.localStorage.setItem(name, value);
      }
    }
  }


  function restore_items(names) {
    var i, name, value;

    for (i = 0; i < names.length; i++) {
      name = names[i];
      value = window.localStorage.getItem(name);
      if (value) {
        $('#' + name).val(value);
      }
    }
  }


  function populate_form(data) {
    var names = form_keys.concat(['passphrase']),
      i, name;

    for (i = 0; i < names.length; i++) {
      name = names[i];
      $('#' + name).val(data.get(name));
    }
  }


  function get_object_length(object) {
    return Object.keys(object).length;
  }


  function decode_uri_component(uri) {
    try {
      return decodeURIComponent(uri);
    } catch (e) {
      console.error(e);
    }
    return '';
  }


  function decode_password(encoded) {
    try {
      return window.atob(encoded);
    } catch (e) {
      console.error(e);
    }
    return null;
  }


  function parse_url_data(string, form_keys, opts_keys, form_map, opts_map) {
    var i, pair, key, val,
      arr = string.split('&');

    for (i = 0; i < arr.length; i++) {
      pair = arr[i].split('=');
      key = pair[0].trim().toLowerCase();
      val = pair.slice(1).join('=').trim();

      if (form_keys.indexOf(key) >= 0) {
        form_map[key] = val;
      } else if (opts_keys.indexOf(key) >= 0) {
        opts_map[key] = val;
      }
    }

    if (form_map.password) {
      form_map.password = decode_password(form_map.password);
    }
  }


  function get_cell_size(term) {
    // Read raw cell dimensions (internal API, may change across xterm.js versions).
    // current_geometry handles the higher-level proposeDimensions logic.
    try {
      var css = term._core._renderService.dimensions.css;
      if (css.cell.width > 0) style.width = css.cell.width;
      if (css.cell.height > 0) style.height = css.cell.height;
    } catch(e) {
      console.warn('Cannot read cell dimensions:', e.message);
    }
  }


  function toggle_fullscreen(term) {
    $('#terminal .xterm').toggleClass('fullscreen');
    // xterm 5.x canvas 需要下一帧才有有效尺寸
    requestAnimationFrame(function () {
      try {
        if (term.fitAddon) {
          // Fullscreen CSS makes parent element collapse to 0 height,
          // so proposeDimensions() returns junk. Use viewport-based sizing.
          var geo = current_geometry(term);
          if (geo.cols > 2 && geo.rows > 3) {
            // Use on_resize so the server gets notified of the PTY size
            term.on_resize(geo.cols, geo.rows);
          }
        }
        // Fit succeeded, reveal terminal smoothly
        document.getElementById('terminal').classList.add('ready');
      } catch(e) {
        console.error('fit error:', e);
        status.text('终端自适应失败: ' + e.message).show();
        // Show terminal anyway after error
        document.getElementById('terminal').classList.add('ready');
      }
    });
    // Safety: show terminal after 2s even if rAF never fires
    setTimeout(function () {
      document.getElementById('terminal').classList.add('ready');
    }, 2000);
  }


  function current_geometry(term) {
    // Prefer public API: FitAddon.proposeDimensions()
    if (term.fitAddon) {
      var dims = term.fitAddon.proposeDimensions();
      // Sanity check: fullscreen CSS may collapse parent element,
      // causing proposeDimensions to return tiny values like rows=1.
      if (dims && dims.cols > 2 && dims.rows > 3) {
        return { 'cols': dims.cols, 'rows': dims.rows };
      }
    }
    // Fallback: measure cell size and calculate from viewport
    if (!style.width || !style.height) {
      get_cell_size(term);
    }
    if (!style.width || !style.height) {
      return { 'cols': term.cols, 'rows': term.rows };
    }
    var cols = parseInt(window.innerWidth / style.width, 10) - 1;
    var rows = parseInt(window.innerHeight / style.height, 10);
    return { 'cols': cols, 'rows': rows };
  }


  function resize_terminal(term) {
    var geometry = current_geometry(term);
    term.on_resize(geometry.cols, geometry.rows);
  }


  function set_backgound_color(term, color) {
    var t = term.options.theme || {};
    t.background = color;
    term.options.theme = t;
  }

  function set_font_color(term, color) {
    var t = term.options.theme || {};
    t.foreground = color;
    term.options.theme = t;
  }

  function custom_font_is_loaded() {
    if (!custom_font) {
      console.log('No custom font specified.');
      return false;
    } else {
      console.log('Status of custom font ' + custom_font.family + ': ' + custom_font.status);
      if (custom_font.status === 'loaded') {
        return true;
      }
      if (custom_font.status === 'unloaded') {
        return false;
      }
    }
    return false;
  }

  function update_font_family(term) {
    if (term.font_family_updated) {
      console.log('Already using custom font family');
      return;
    }

    if (!default_fonts) {
      default_fonts = term.options.fontFamily;
    }

    if (custom_font_is_loaded()) {
      var new_fonts = custom_font.family + ', ' + default_fonts;
      term.options.fontFamily = new_fonts;
      term.font_family_updated = true;
      console.log('Using custom font family ' + new_fonts);
    }
  }


  function reset_font_family(term) {
    if (!term.font_family_updated) {
      console.log('Already using default font family');
      return;
    }

    if (default_fonts) {
      term.options.fontFamily = default_fonts;
      term.font_family_updated = false;
      console.log('Using default font family ' + default_fonts);
    }
  }


  function format_geometry(cols, rows) {
    return JSON.stringify({ 'cols': cols, 'rows': rows });
  }


  function read_as_text_with_decoder(file, callback, decoder) {
    var reader = new window.FileReader();

    if (decoder === undefined) {
      decoder = new window.TextDecoder('utf-8', { 'fatal': true });
    }

    reader.onload = function () {
      var text;
      try {
        text = decoder.decode(reader.result);
      } catch (TypeError) {
        console.log('Decoding error happened.');
      } finally {
        if (callback) {
          callback(text);
        }
      }
    };

    reader.onerror = function (e) {
      console.error(e);
    };

    reader.readAsArrayBuffer(file);
  }


  function read_as_text_with_encoding(file, callback, encoding) {
    var reader = new window.FileReader();

    if (encoding === undefined) {
      encoding = 'utf-8';
    }

    reader.onload = function () {
      if (callback) {
        callback(reader.result);
      }
    };

    reader.onerror = function (e) {
      console.error(e);
    };

    reader.readAsText(file, encoding);
  }


  function read_file_as_text(file, callback, decoder) {
    if (!window.TextDecoder) {
      read_as_text_with_encoding(file, callback, decoder);
    } else {
      read_as_text_with_decoder(file, callback, decoder);
    }
  }


  function reset_wssh() {
    var name;

    for (name in wssh) {
      if (wssh.hasOwnProperty(name) && name !== 'connect') {
        delete wssh[name];
      }
    }
  }


  function log_status(text, to_populate) {
    console.log(text);
    status.text(text);

    if (to_populate && validated_form_data) {
      populate_form(validated_form_data);
      validated_form_data = undefined;
    }

    if (waiter.css('display') !== 'none') {
      waiter.hide();
    }

    if (form_container.css('display') === 'none') {
      form_container.show();
    }
  }


  function ajax_complete_callback(resp) {
    button.prop('disabled', false);

    if (resp.status !== 200) {
      log_status(resp.status + ': ' + resp.statusText, true);
      state = DISCONNECTED;
      return;
    }

    var msg = resp.responseJSON;
    if (!msg.id) {
      log_status(msg.status, true);
      state = DISCONNECTED;
      return;
    }

    var ws_url = window.location.href.split(/\?|#/, 1)[0].replace('http', 'ws'),
      join = (ws_url[ws_url.length - 1] === '/' ? '' : '/'),
      url = ws_url + join + 'ws?id=' + msg.id,
      sock = new window.WebSocket(url),
      encoding = 'utf-8',
      decoder = window.TextDecoder ? new window.TextDecoder(encoding) : encoding,
      terminal = document.getElementById('terminal'),
      termOptions = {
        cursorBlink: true,
        lineHeight: 1.2,
        theme: {
          background: url_opts_data.bgcolor || 'black',
          foreground: url_opts_data.fontcolor || 'white',
          cursor: url_opts_data.cursor || url_opts_data.fontcolor || 'white'
        }
      };

    if (url_opts_data.fontsize) {
      var fontsize = window.parseInt(url_opts_data.fontsize);
      if (fontsize && fontsize > 0) {
        termOptions.fontSize = fontsize;
      }
    }

    var term = new window.Terminal(termOptions);

    var FitAddonClass = getFitAddonClass();
    term.fitAddon = FitAddonClass ? new FitAddonClass() : null;
    if (term.fitAddon) {
      term.loadAddon(term.fitAddon);
    } else {
      console.warn('FitAddon not available, terminal will not auto-resize');
    }

    console.log(url);
    if (!msg.encoding) {
      console.log('Unable to detect the default encoding of your server');
      msg.encoding = encoding;
    } else {
      console.log('The deault encoding of your server is ' + msg.encoding);
    }

    function term_write(text) {
      if (term) {
        try {
          term.write(text);
        } catch(e) {
          console.error('term.write error:', e);
          status.text('终端写入错误: ' + e.message).show();
        }
        if (!term.resized) {
          // xterm 5.x canvas 需要下一帧才有有效尺寸
          requestAnimationFrame(function () {
            try {
              resize_terminal(term);
              term.resized = true;
            } catch(e) {
              console.error('resize error:', e);
              status.text('终端缩放错误: ' + e.message).show();
            }
          });
        }
      }
    }

    function set_encoding(new_encoding) {
      // for console use
      if (!new_encoding) {
        console.log('An encoding is required');
        return;
      }

      if (!window.TextDecoder) {
        decoder = new_encoding;
        encoding = decoder;
        console.log('Set encoding to ' + encoding);
      } else {
        try {
          decoder = new window.TextDecoder(new_encoding);
          encoding = decoder.encoding;
          console.log('Set encoding to ' + encoding);
        } catch (RangeError) {
          console.log('Unknown encoding ' + new_encoding);
          return false;
        }
      }
    }

    wssh.set_encoding = set_encoding;

    if (url_opts_data.encoding) {
      if (set_encoding(url_opts_data.encoding) === false) {
        set_encoding(msg.encoding);
      }
    } else {
      set_encoding(msg.encoding);
    }


    wssh.geometry = function () {
      // for console use
      var geometry = current_geometry(term);
      console.log('Current window geometry: ' + JSON.stringify(geometry));
    };

    wssh.send = function (data) {
      // for console use
      if (!sock) {
        console.log('Websocket was already closed');
        return;
      }

      if (typeof data !== 'string') {
        console.log('Only string is allowed');
        return;
      }

      try {
        JSON.parse(data);
        sock.send(data);
      } catch (SyntaxError) {
        data = data.trim() + '\r';
        sock.send(JSON.stringify({ 'data': data }));
      }
    };

    wssh.reset_encoding = function () {
      // for console use
      if (encoding === msg.encoding) {
        console.log('Already reset to ' + msg.encoding);
      } else {
        set_encoding(msg.encoding);
      }
    };

    wssh.resize = function (cols, rows) {
      // for console use
      if (term === undefined) {
        console.log('Terminal was already destroryed');
        return;
      }

      var valid_args = false;

      if (cols > 0 && rows > 0) {
        var geometry = current_geometry(term);
        if (cols <= geometry.cols && rows <= geometry.rows) {
          valid_args = true;
        }
      }

      if (!valid_args) {
        console.log('Unable to resize terminal to geometry: ' + format_geometry(cols, rows));
      } else {
        term.on_resize(cols, rows);
      }
    };

    wssh.set_bgcolor = function (color) {
      set_backgound_color(term, color);
    };

    wssh.set_fontcolor = function (color) {
      set_font_color(term, color);
    };

    wssh.custom_font = function () {
      update_font_family(term);
    };

    wssh.default_font = function () {
      reset_font_family(term);
    };

    term.on_resize = function (cols, rows) {
      if (cols !== this.cols || rows !== this.rows) {
        console.log('Resizing terminal to geometry: ' + format_geometry(cols, rows));
        try {
          this.resize(cols, rows);
        } catch(e) {
          console.error('resize failed:', e);
          status.text('终端缩放失败: ' + e.message).show();
        }
        sock.send(JSON.stringify({ 'resize': [cols, rows] }));
      }
    };

    term.onData(function (data) {
      // console.log(data);
      sock.send(JSON.stringify({ 'data': data }));
    });

    sock.onopen = function () {
      // 连接成功时隐藏waiter
      waiter.hide();
      term.open(terminal);
      toggle_fullscreen(term);
      update_font_family(term);
      term.focus();
      state = CONNECTED;

      // Save connection to history
      var h = document.getElementById('hostname').value.trim();
      if (h) {
        save_connection_history(h);
      }
      var u = document.getElementById('username').value.trim();
      if (u) {
        save_username_history(u);
      }

      title_element.text = url_opts_data.title || default_title;
      if (url_opts_data.command && window.ALLOW_URL_COMMAND) {
        setTimeout(function () {
          sock.send(JSON.stringify({ 'data': url_opts_data.command + '\r' }));
        }, 500);
      }
      if (document.getElementById('use_tmux').checked) {
        setTimeout(function () {
          sock.send(JSON.stringify({ 'data': 'exec tmux new -A -s webssh \\; set -g mouse on\r' }));
        }, 1500);
      }
    };

    sock.onmessage = function (msg) {
      read_file_as_text(msg.data, term_write, decoder);
    };

    sock.onerror = function (e) {
      // 连接错误时隐藏waiter
      waiter.hide();
      // github-corner removed
      console.error(e);
    };

    var on_resize_window = function () {
      if (term) {
        resize_terminal(term);
      }
    };
    $(window).resize(on_resize_window);

    sock.onclose = function (e) {
      $(window).off('resize', on_resize_window);
      term.dispose();
      term = undefined;
      sock = undefined;
      reset_wssh();
      log_status(e.reason, true);
      state = DISCONNECTED;
      default_title = 'WebSSH';
      title_element.text = default_title;
    };
  }


  function wrap_object(opts) {
    var obj = {};

    obj.get = function (attr) {
      return opts[attr] || '';
    };

    obj.set = function (attr, val) {
      opts[attr] = val;
    };

    return obj;
  }


  function clean_data(data) {
    var i, attr, val;
    var attrs = form_keys.concat(['privatekey', 'passphrase']);

    for (i = 0; i < attrs.length; i++) {
      attr = attrs[i];
      val = data.get(attr);
      if (typeof val === 'string') {
        data.set(attr, val.trim());
      }
    }
  }


  function validate_form_data(data) {
    clean_data(data);

    var hostname = data.get('hostname'),
      port = data.get('port'),
      username = data.get('username'),
      pk = data.get('privatekey'),
      result = {
        valid: false,
        data: data,
        title: ''
      },
      errors = [], size;

    if (!hostname) {
      errors.push('Value of hostname is required.');
    } else {
      if (!hostname_tester.test(hostname)) {
        errors.push('Invalid hostname: ' + hostname);
      }
    }

    if (!port) {
      port = 22;
    } else {
      if (!(port > 0 && port <= 65535)) {
        errors.push('Invalid port: ' + port);
      }
    }

    if (!username) {
      errors.push('Value of username is required.');
    }

    if (pk) {
      size = pk.size || pk.length;
      if (size > key_max_size) {
        errors.push('Invalid private key: ' + pk.name || '');
      }
    }

    if (!errors.length || debug) {
      result.valid = true;
      result.title = username + '@' + hostname + ':' + port;
    }
    result.errors = errors;

    return result;
  }

  // Fix empty input file ajax submission error for safari 11.x
  function disable_file_inputs(inputs) {
    var i, input;

    for (i = 0; i < inputs.length; i++) {
      input = inputs[i];
      if (input.files.length === 0) {
        input.setAttribute('disabled', '');
      }
    }
  }


  function enable_file_inputs(inputs) {
    var i;

    for (i = 0; i < inputs.length; i++) {
      inputs[i].removeAttribute('disabled');
    }
  }


  function connect_without_options() {
    // use data from the form
    var form = document.querySelector(form_id),
      inputs = form.querySelectorAll('input[type="file"]'),
      url = form.action,
      data, pk;

    disable_file_inputs(inputs);
    data = new FormData(form);
    pk = data.get('privatekey');
    enable_file_inputs(inputs);

    function ajax_post() {
      status.text('');
      button.prop('disabled', true);

      $.ajax({
        url: url,
        type: 'post',
        data: data,
        complete: ajax_complete_callback,
        cache: false,
        contentType: false,
        processData: false
      });
    }

    var result = validate_form_data(data);

    // Check required fields in order, focus first empty one
    if (!(data.get('hostname') || '').trim()) {
      log_status('请输入主机地址');
      setTimeout(function () { document.getElementById('hostname').focus(); }, 50);
      return;
    }
    if (!(data.get('username') || '').trim()) {
      log_status('请输入用户名');
      setTimeout(function () { document.getElementById('username').focus(); }, 50);
      return;
    }
    if (!(data.get('password') || '').trim()) {
      log_status('请输入密码');
      setTimeout(function () { document.getElementById('password').focus(); }, 50);
      return;
    }

    if (!result.valid) {
      log_status(result.errors.join('\n'));
      return;
    }

    if (pk && pk.size && !debug) {
      read_file_as_text(pk, function (text) {
        if (text === undefined) {
          log_status('Invalid private key: ' + pk.name);
        } else {
          ajax_post();
        }
      });
    } else {
      ajax_post();
    }

    return result;
  }


  function connect_with_options(data) {
    // use data from the arguments
    var form = document.querySelector(form_id),
      url = data.url || form.action,
      _xsrf = form.querySelector('input[name="_xsrf"]');

    var result = validate_form_data(wrap_object(data));

    // Check required fields in order, focus first empty one
    if (!(data.hostname || '').trim()) {
      log_status('请输入主机地址');
      setTimeout(function () { document.getElementById('hostname').focus(); }, 50);
      return;
    }
    if (!(data.username || '').trim()) {
      log_status('请输入用户名');
      setTimeout(function () { document.getElementById('username').focus(); }, 50);
      return;
    }
    if (!(data.password || '').trim()) {
      log_status('请输入密码');
      setTimeout(function () { document.getElementById('password').focus(); }, 50);
      return;
    }

    if (!result.valid) {
      log_status(result.errors.join('\n'));
      return;
    }

    data.term = term_type.val();
    data._xsrf = _xsrf.value;

    status.text('');
    button.prop('disabled', true);

    $.ajax({
      url: url,
      type: 'post',
      data: data,
      complete: ajax_complete_callback
    });

    return result;
  }


  function connect(hostname, port, username, password, privatekey, passphrase) {
    // for console use
    var result, opts;

    if (state !== DISCONNECTED) {
      console.log(messages[state]);
      return;
    }

    if (hostname === undefined) {
      result = connect_without_options();
    } else {
      if (typeof hostname === 'string') {
        opts = {
          hostname: hostname,
          port: port,
          username: username,
          password: password,
          privatekey: privatekey,
          passphrase: passphrase
        };
      } else {
        opts = hostname;
      }

      result = connect_with_options(opts);
    }

    if (result) {
      state = CONNECTING;
      default_title = result.title;
      if (hostname) {
        validated_form_data = result.data;
      }
      store_items(fields, result.data);
    }
  }

  wssh.connect = connect;

  $(form_id).submit(function (event) {
    event.preventDefault();
    connect();
  });

  // === Connection History ===
  function save_connection_history(hostname) {
    var key = 'webssh_history';
    var hist = JSON.parse(window.localStorage.getItem(key) || '[]');
    hist = hist.filter(function (e) { return e !== hostname; });
    hist.unshift(hostname);
    hist = hist.slice(0, 10);
    window.localStorage.setItem(key, JSON.stringify(hist));
    load_connection_history();
  }

  function load_connection_history() {
    var key = 'webssh_history';
    var hist = JSON.parse(window.localStorage.getItem(key) || '[]');
    var list = document.getElementById('hostname-history-list');
    if (!list) return;
    list.innerHTML = '';
    hist.forEach(function (entry) {
      var li = document.createElement('li');
      li.textContent = entry;
      li.style.cssText = 'padding:6px 12px; cursor:pointer; font-size:14px; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
      li.addEventListener('mouseenter', function () { this.style.background = '#f0f4f8'; });
      li.addEventListener('mouseleave', function () { this.style.background = ''; });
      li.addEventListener('click', function () {
        document.getElementById('hostname').value = entry;
        list.style.display = 'none';
      });
      list.appendChild(li);
    });
    // Show/hide the ▼ button based on whether there's history
    var btn = document.getElementById('hostname-history-btn');
    if (btn) btn.style.display = hist.length ? '' : 'none';
  }

  // Toggle dropdown on button click
  var histBtn = document.getElementById('hostname-history-btn');
  var histList = document.getElementById('hostname-history-list');
  if (histBtn && histList) {
    histBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      histList.style.display = histList.style.display === 'block' ? 'none' : 'block';
    });
    // Close dropdown when clicking outside
    document.addEventListener('click', function () {
      histList.style.display = 'none';
    });
  }

  load_connection_history();

  // === Username History ===
  function save_username_history(username) {
    var key = 'webssh_username_history';
    var hist = JSON.parse(window.localStorage.getItem(key) || '[]');
    hist = hist.filter(function (e) { return e !== username; });
    hist.unshift(username);
    hist = hist.slice(0, 10);
    window.localStorage.setItem(key, JSON.stringify(hist));
    load_username_history();
  }

  function load_username_history() {
    var key = 'webssh_username_history';
    var hist = JSON.parse(window.localStorage.getItem(key) || '[]');
    var list = document.getElementById('username-history-list');
    if (!list) return;
    list.innerHTML = '';
    hist.forEach(function (entry) {
      var li = document.createElement('li');
      li.textContent = entry;
      li.style.cssText = 'padding:6px 12px; cursor:pointer; font-size:14px; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
      li.addEventListener('mouseenter', function () { this.style.background = '#f0f4f8'; });
      li.addEventListener('mouseleave', function () { this.style.background = ''; });
      li.addEventListener('click', function () {
        document.getElementById('username').value = entry;
        list.style.display = 'none';
      });
      list.appendChild(li);
    });
    var btn = document.getElementById('username-history-btn');
    if (btn) btn.style.display = hist.length ? '' : 'none';
  }

  var uHistBtn = document.getElementById('username-history-btn');
  var uHistList = document.getElementById('username-history-list');
  if (uHistBtn && uHistList) {
    uHistBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      uHistList.style.display = uHistList.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', function () {
      uHistList.style.display = 'none';
    });
  }

  load_username_history();

  // tmux checkbox: load saved preference
  var tmuxEl = document.getElementById('use_tmux');
  if (tmuxEl) {
    tmuxEl.checked = window.localStorage.getItem('use_tmux') === '1';
    tmuxEl.addEventListener('change', function () {
      window.localStorage.setItem('use_tmux', this.checked ? '1' : '0');
    });
  }

  if (document.fonts) {
    document.fonts.ready.then(
      function () {
        if (custom_font_is_loaded() === false) {
          document.body.style.fontFamily = custom_font.family;
        }
      }
    );
  }


  parse_url_data(
    decode_uri_component(window.location.search.substring(1)) + '&' + decode_uri_component(window.location.hash.substring(1)),
    form_keys, opts_keys, url_form_data, url_opts_data
  );
  // console.log(url_form_data);
  // console.log(url_opts_data);

  if (url_opts_data.term) {
    term_type.val(url_opts_data.term);
  }

  if (url_form_data.password === null) {
    log_status('Password via url must be encoded in base64.');
  } else {
    if (get_object_length(url_form_data)) {
      waiter.show();
      connect(url_form_data);
    } else {
      restore_items(fields);
      form_container.show();
    }
  }

});
