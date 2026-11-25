"""Check the release payload without printing configuration values."""

import os
import sys
from pathlib import Path
from zipfile import ZipFile


def verify(apk):
    project = b"https://qkopbbxmeqqzomrawltf.supabase.co"
    key = os.environ["EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].encode()
    if not key or os.environ["EXPO_PUBLIC_SUPABASE_URL"].encode() != project:
        raise ValueError("Missing production client configuration")
    mobile = Path(__file__).resolve().parents[1]
    movie = (mobile / "modules/serbisyogo-intro/android/src/main/res/raw/serbisyogo_opening.mp4").read_bytes()
    with ZipFile(apk) as archive:
        bundle = archive.read("assets/index.android.bundle")
        if project not in bundle or key not in bundle:
            raise ValueError("Production project or client key missing from the compiled bundle")
        if any(address in bundle for address in (b"127.0.0.1:54321", b"localhost:54321", b"10.0.2.2:54321")):
            raise ValueError("Local Supabase endpoint in release bundle")
        if not any(entry.file_size == len(movie) and archive.read(entry) == movie
                   for entry in archive.infolist() if entry.filename.endswith(".mp4")):
            raise ValueError("The reviewed startup movie is missing from the APK")
    print("Verified production client configuration, standalone bundle and byte-identical startup movie.")


if __name__ == "__main__":
    verify(sys.argv[1])
