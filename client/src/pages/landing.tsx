import { useEffect, useState } from "react";

const FEATURES = [
  {
    icon: "???",
    title: "Wake-Word Triggered",
    desc: 'Say "hey banter" in any voice channel and the bot fires back instantly.',
  },
  {
    icon: "??",
    title: "AI-Powered Roasts",
    desc: "GPT-4o-mini generates short, punchy one-liners tuned to your crew.",
  },
  {
    icon: "??",
    title: "7 Personalities",
    desc: "Deadpan, Hype, Chill, Roaster, DM, Race Commentator — or stick with Default.",
  },
  {
    icon: "??",
    title: "ElevenLabs Voice",
    desc: "Realistic TTS via ElevenLabs Turbo v2. Falls back to OpenAI TTS automatically.",
  },
  {
    icon: "?",
    title: "Per-Guild Config",
    desc: "Set custom wake words, cooldowns, and personality per server — no dashboard needed.",
  },
  {
    icon: "???",
    title: "Safety Built-In",
    desc: "Content safety filter blocks inappropriate prompts and responses before they air.",
  },
];

const COMMANDS = [
  { cmd: "/banter join", desc: "Join your voice channel and start listening" },
  { cmd: "/banter leave", desc: "Leave the voice channel" },
  { cmd: "/banter say <prompt>", desc: "Manually trigger a response (text fallback)" },
  { cmd: "/banter status", desc: "Show current settings and cooldown state" },
  { cmd: "/banter config personality <preset>", desc: "Switch personality (admin only)" },
  { cmd: "/banter config wakeword <phrase>", desc: "Change the wake word (admin only)" },
  { cmd: "/banter config cooldown <seconds>", desc: "Set cooldown between responses (admin only)" },
];

export default function Landing() {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/invite")
      .then((r) => r.json())
      .then((d) => d.url && setInviteUrl(d.url))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white font-sans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 max-w-6xl mx-auto">
        <span className="text-xl font-bold tracking-tight">
          <span className="text-indigo-400">Banter</span>Box
        </span>
        {inviteUrl && (
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-indigo-500 hover:bg-indigo-400 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            Add to Discord
          </a>
        )}
      </nav>

      {/* Hero */}
      <section className="text-center py-24 px-6 max-w-3xl mx-auto">
        <div className="text-6xl mb-6">???</div>
        <h1 className="text-5xl font-extrabold mb-4 leading-tight">
          The Discord bot that{" "}
          <span className="text-indigo-400">talks back</span>
        </h1>
        <p className="text-lg text-gray-400 mb-10">
          Just say{" "}
          <span className="text-indigo-300 font-mono">"hey banter"</span> in a
          voice channel. BanterBox hears you, roasts you, and plays it back in
          seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {inviteUrl ? (
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-indigo-500 hover:bg-indigo-400 transition-colors text-white font-bold px-8 py-3 rounded-xl text-lg"
            >
              Add to Discord — it's free
            </a>
          ) : (
            <span className="bg-indigo-500/30 text-indigo-300 font-bold px-8 py-3 rounded-xl text-lg cursor-not-allowed">
              Bot invite loading…
            </span>
          )}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-white/20 hover:border-white/40 transition-colors text-white font-bold px-8 py-3 rounded-xl text-lg"
          >
            View on GitHub
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">What it does</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white/5 hover:bg-white/8 transition-colors rounded-2xl p-6 border border-white/10"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Commands */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Commands</h2>
        <div className="space-y-3">
          {COMMANDS.map((c) => (
            <div
              key={c.cmd}
              className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 bg-white/5 rounded-xl px-5 py-3 border border-white/10"
            >
              <code className="text-indigo-300 font-mono text-sm shrink-0">
                {c.cmd}
              </code>
              <span className="text-gray-400 text-sm">{c.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-10 text-gray-600 text-sm border-t border-white/10">
        BanterBox — Discord-only MVP &nbsp;·&nbsp;{" "}
        <a
          href="/api/health"
          className="hover:text-gray-400 transition-colors"
        >
          health
        </a>
      </footer>
    </div>
  );
}
