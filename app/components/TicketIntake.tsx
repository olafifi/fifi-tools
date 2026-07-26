import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react';

interface TicketIntakeProps {
  onAddText(value: string): Promise<boolean>;
  onAddFiles(files: File[]): Promise<boolean>;
}

export function TicketIntake({ onAddText, onAddFiles }: TicketIntakeProps) {
  const [value, setValue] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const submitText = async () => {
    if (await onAddText(value)) setValue('');
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files);
    if (files.length) {
      event.preventDefault();
      void onAddFiles(files);
      return;
    }
    const text = event.clipboardData.getData('text/plain');
    if (text.trim()) {
      event.preventDefault();
      void onAddText(text);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length) void onAddFiles(files);
    else {
      const text = event.dataTransfer.getData('text/plain');
      if (text.trim()) void onAddText(text);
    }
  };

  return (
    <div
      className={`ticket-intake${dragging ? ' is-dragging' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <span className="ticket-intake__label">IN / 临时投递口</span>
      <textarea
        aria-label="临时票据内容"
        value={value}
        maxLength={5000}
        placeholder="粘贴文字或链接，也可以把文件拖进来"
        onChange={(event) => setValue(event.target.value)}
        onPaste={onPaste}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void submitText();
        }}
      />
      <div className="ticket-intake__actions">
        <button type="button" onClick={() => fileInput.current?.click()}>选择文件</button>
        <button type="button" className="ticket-intake__send" disabled={!value.trim()} onClick={() => void submitText()}>送入</button>
      </div>
      <input
        ref={fileInput}
        className="visually-hidden"
        type="file"
        multiple
        aria-label="选择临时文件"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          if (files.length) void onAddFiles(files);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}
