// ForkArcade SDK v1
(function(window) {
  'use strict';

  var _sdkVersion = 1;
  var _pending = {};
  var _ready = false;
  var _slug = null;
  var _version = null;
  var _parentOrigin = null;
  var _readyCallbacks = [];
  var _readyRetryInterval = null;

  function generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  function sendToParent(msg) {
    if (window.parent !== window) {
      var origin = _parentOrigin || '*';
      window.parent.postMessage(msg, origin);
    }
  }

  function isValidFAMessage(event) {
    var data = event.data;
    if (!data || !data.type) return false;
    if (typeof data.type !== 'string' || data.type.indexOf('FA_') !== 0) return false;
    if (_parentOrigin && event.origin !== _parentOrigin) return false;
    return true;
  }

  function request(type, payload) {
    return new Promise(function(resolve, reject) {
      var id = generateId();
      _pending[id] = { resolve: resolve, reject: reject };
      sendToParent(Object.assign({ type: type, requestId: id }, payload || {}));
      setTimeout(function() {
        if (_pending[id]) {
          delete _pending[id];
          reject(new Error(type + ' timed out after 10s'));
        }
      }, 10000);
    });
  }

  window.addEventListener('message', function(event) {
    if (!isValidFAMessage(event)) return;
    var data = event.data;

    if (data.type === 'FA_INIT') {
      _parentOrigin = event.origin;
      _slug = data.slug;
      _version = data.version || null;
      _ready = true;
      // Stop retry loop
      if (_readyRetryInterval) {
        clearInterval(_readyRetryInterval);
        _readyRetryInterval = null;
      }
      // Fire all onReady callbacks
      var cbs = _readyCallbacks;
      _readyCallbacks = [];
      var ctx = { slug: _slug, version: _version };
      for (var i = 0; i < cbs.length; i++) cbs[i](ctx);
      return;
    }

    if (data.type === 'FA_SPRITES_UPDATE' && data.sprites) {
      if (typeof SPRITE_DEFS !== 'undefined') {
        SPRITE_DEFS = data.sprites;
        var cats = Object.keys(SPRITE_DEFS);
        for (var ci = 0; ci < cats.length; ci++) {
          var names = Object.keys(SPRITE_DEFS[cats[ci]]);
          for (var ni = 0; ni < names.length; ni++) {
            if (SPRITE_DEFS[cats[ci]][names[ni]]._c) delete SPRITE_DEFS[cats[ci]][names[ni]]._c;
          }
        }
      }
      return;
    }

    if (data.type === 'FA_MAP_UPDATE' && data.maps) {
      window.FA_MAP_DATA = data.maps;
      if (typeof MAP_DEFS !== 'undefined') {
        var oldKeys = Object.keys(MAP_DEFS);
        for (var oi = 0; oi < oldKeys.length; oi++) delete MAP_DEFS[oldKeys[oi]];
        var newKeys = Object.keys(data.maps);
        for (var mi = 0; mi < newKeys.length; mi++) MAP_DEFS[newKeys[mi]] = data.maps[newKeys[mi]];
      }
      var evt = new CustomEvent('fa-map-update', { detail: data.maps });
      window.dispatchEvent(evt);
      return;
    }

    if (data.requestId && _pending[data.requestId]) {
      var handler = _pending[data.requestId];
      delete _pending[data.requestId];
      if (data.error) {
        handler.reject(new Error(data.error));
      } else {
        handler.resolve(data);
      }
    }
  });

  window.ForkArcade = {
    submitScore: function(score) {
      if (typeof score !== 'number' || !isFinite(score) || score < 0 || score > 1000000000) {
        return Promise.reject(new Error('Invalid score: must be a finite number between 0 and 1,000,000,000'));
      }
      return request('FA_SUBMIT_SCORE', { score: score, version: _version });
    },
    getPlayer: function() {
      return request('FA_GET_PLAYER');
    },
    updateNarrative: function(data) {
      if (!data) return;
      sendToParent({
        type: 'FA_NARRATIVE_UPDATE',
        variables: data.variables,
        graphs: data.graphs,
        event: data.event
      });
    },
    onReady: function(callback) {
      if (_ready) { callback({ slug: _slug, version: _version }); return; }
      _readyCallbacks.push(callback);
    },
    sdkVersion: _sdkVersion
  };

  // Send FA_READY and retry every 500ms until FA_INIT is received (max 60 attempts = 30s)
  var _readyAttempts = 0;
  sendToParent({ type: 'FA_READY' });
  _readyRetryInterval = setInterval(function() {
    if (_ready) {
      clearInterval(_readyRetryInterval);
      _readyRetryInterval = null;
      return;
    }
    _readyAttempts++;
    if (_readyAttempts >= 60) {
      clearInterval(_readyRetryInterval);
      _readyRetryInterval = null;
      return;
    }
    sendToParent({ type: 'FA_READY' });
  }, 500);
})(window);
