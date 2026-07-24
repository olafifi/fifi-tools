(function () {
  let hooks = {};
  let destroyed = false;

  function register(nextHooks) {
    hooks = nextHooks || {};
    parent.postMessage(
      {
        source: 'fifi-game',
        type: 'ready',
        gameId: document.documentElement.dataset.gameId
      },
      location.origin
    );
  }

  function receive(event) {
    if (
      event.origin !== location.origin ||
      event.data?.source !== 'fifi-tools' ||
      destroyed
    ) return;

    const type = event.data.type;
    if (type === 'destroy') {
      destroyed = true;
      hooks.destroy?.();
      window.removeEventListener('message', receive);
      return;
    }
    hooks[type]?.();
  }

  window.addEventListener('message', receive);
  window.FifiGameBridge = { register };
})();
