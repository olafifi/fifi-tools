export type GameCommand = 'pause' | 'resume' | 'restart' | 'focus' | 'destroy';

export function postGameCommand(
  frame: HTMLIFrameElement | null,
  type: GameCommand
) {
  frame?.contentWindow?.postMessage(
    { source: 'fifi-tools', type },
    window.location.origin
  );
}
