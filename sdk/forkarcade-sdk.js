(function(window) {
  'use strict';

  var _pending = {};
  var _ready = false;
  var _slug = null;

  function generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  function sendToParent(msg) {
    if (window.parent !== window) {
      window.parent.postMessage(msg, '*');
    }
  }

  function request(type, payload) {
    return new Promise(function(resolve, reject) {
      var id = generateId();
      _pending[id] = { resolve: resolve, reject: reject };
      sendToParent(Object.assign({ type: type, requestId: id }, payload || {}));
      setTimeout(function() {
        if (_pending[id]) {
          delete _pending[id];
          reject(new Error('Request timed out'));
        }
      }, 10000);
    });
  }

  window.addEventListener('message', function(event) {
    var data = event.data;
    if (!data || !data.type) return;

    if (data.type === 'FA_INIT') {
      _slug = data.slug;
      _ready = true;
      sendToParent({ type: 'FA_READY' });
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
      return request('FA_SUBMIT_SCORE', { score: score });
    },
    getPlayer: function() {
      return request('FA_GET_PLAYER');
    },
    updateNarrative: function(data) {
      sendToParent({
        type: 'FA_NARRATIVE_UPDATE',
        variables: data.variables,
        currentNode: data.currentNode,
        graph: data.graph,
        event: data.event
      });
    },
    onReady: function(callback) {
      if (_ready) { callback({ slug: _slug }); return; }
      var interval = setInterval(function() {
        if (_ready) { clearInterval(interval); callback({ slug: _slug }); }
      }, 50);
    }
  };

  sendToParent({ type: 'FA_READY' });
})(window);
