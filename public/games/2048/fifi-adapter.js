FifiGameBridge.register({
  restart() {
    window.fifi2048?.restart();
  },
  destroy() {
    document.body.replaceChildren();
  }
});
