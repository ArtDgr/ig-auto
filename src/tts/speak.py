import argparse
import asyncio
import sys

import edge_tts


async def speak(text, voice, out_path):
    tts = edge_tts.Communicate(text, voice=voice, rate="+8%")
    await tts.save(out_path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", required=True)
    ap.add_argument("--voice", default="en-US-GuyNeural")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    asyncio.run(speak(args.text, args.voice, args.out))
    print("TTS_OK")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"TTS_ERROR: {e}", file=sys.stderr)
        sys.exit(1)