"use client";

export function ChatPanel({
  messages,
  input,
  onInput,
  onSend,
}: {
  messages: { role: string; content: string }[];
  input: string;
  onInput: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <section className="flex min-h-[640px] flex-col rounded-lg border border-gray-200 bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
            <div className="inline-block max-w-[80%] rounded-lg bg-gray-50 px-4 py-3 text-left text-sm leading-6 text-gray-800">
              {message.content}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => onInput(event.target.value)}
            className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
            placeholder="输入你的回答或问题"
          />
          <button onClick={onSend} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white">
            发送
          </button>
        </div>
      </div>
    </section>
  );
}
