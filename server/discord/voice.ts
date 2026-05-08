import {
  joinVoiceChannel,
  VoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
  getVoiceConnection,
} from "@discordjs/voice";
import { Guild, VoiceBasedChannel } from "discord.js";
import { Readable } from "stream";
import { logger } from "../logger";

interface QueueItem {
  buffer: Buffer;
  resolve: () => void;
  reject: (err: Error) => void;
}

interface GuildAudio {
  player: AudioPlayer;
  queue: QueueItem[];
  playing: boolean;
}

const audioMap = new Map<string, GuildAudio>();

export class VoiceManager {
  async join(channel: VoiceBasedChannel): Promise<VoiceConnection> {
    const existing = getVoiceConnection(channel.guild.id);
    if (existing) {
      if (existing.joinConfig.channelId === channel.id) return existing;
      existing.destroy();
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false, // must be false to receive audio
      selfMute: false,
    });

    connection.on("stateChange", (oldState, newState) => {
      logger.info("Voice connection state changed", {
        guildId: channel.guild.id,
        channelId: channel.id,
        oldStatus: oldState.status,
        newStatus: newState.status,
      });
    });

    connection.on("error", (err) => {
      logger.error("Voice connection error", {
        guildId: channel.guild.id,
        channelId: channel.id,
        errorClass: err.constructor.name,
        errorMessage: err.message,
      });
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch {
      connection.destroy();
      throw new Error("Voice connection timed out");
    }

    const player = createAudioPlayer();
    connection.subscribe(player);

    audioMap.set(channel.guild.id, { player, queue: [], playing: false });

    player.on("error", (err) => {
      logger.error("AudioPlayer error", {
        guildId: channel.guild.id,
        errorMessage: err.message,
      });
    });

    logger.info("Joined voice channel", {
      guildId: channel.guild.id,
      command: channel.name,
    });

    return connection;
  }

  leave(guildId: string): void {
    const connection = getVoiceConnection(guildId);
    if (connection) {
      connection.destroy();
      logger.info("Left voice channel", { guildId });
    }
    audioMap.delete(guildId);
  }

  isConnected(guildId: string): boolean {
    const conn = getVoiceConnection(guildId);
    return !!conn && conn.state.status !== VoiceConnectionStatus.Destroyed;
  }

  isSpeaking(guildId: string): boolean {
    const audio = audioMap.get(guildId);
    return audio?.playing ?? false;
  }

  /**
   * Queues an MP3 buffer for playback. Returns a promise that resolves
   * when this specific buffer finishes playing.
   */
  playBuffer(guildId: string, buffer: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = audioMap.get(guildId);
      if (!audio) return reject(new Error("Not connected to voice in this guild"));

      audio.queue.push({ buffer, resolve, reject });
      if (!audio.playing) {
        this._playNext(guildId, audio);
      }
    });
  }

  private _playNext(guildId: string, audio: GuildAudio): void {
    const item = audio.queue.shift();
    if (!item) {
      audio.playing = false;
      return;
    }

    audio.playing = true;

    const stream = Readable.from(item.buffer);
    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });

    const onIdle = () => {
      audio.player.removeListener("error", onError);
      item.resolve();
      this._playNext(guildId, audio);
    };

    const onError = (err: Error) => {
      audio.player.removeListener(AudioPlayerStatus.Idle, onIdle);
      item.reject(err);
      this._playNext(guildId, audio);
    };

    audio.player.once(AudioPlayerStatus.Idle, onIdle);
    audio.player.once("error", onError);
    audio.player.play(resource);
  }
}
