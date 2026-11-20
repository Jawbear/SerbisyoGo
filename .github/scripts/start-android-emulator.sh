#!/usr/bin/env bash
set -euo pipefail
if [ ! -e /dev/kvm ]; then echo 'Android emulator acceleration is unavailable'; exit 1; fi
sudo chmod 666 /dev/kvm
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export ANDROID_AVD_HOME="$RUNNER_TEMP/serbisyogo-avd"
mkdir -p "$ANDROID_AVD_HOME"
printf '%s\n' "$ANDROID_HOME/platform-tools" "$ANDROID_HOME/emulator" >> "$GITHUB_PATH"
printf 'ANDROID_SDK_ROOT=%s\nANDROID_AVD_HOME=%s\n' "$ANDROID_SDK_ROOT" "$ANDROID_AVD_HOME" >> "$GITHUB_ENV"
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" 'platform-tools' 'emulator' 'system-images;android-35;google_apis;x86_64' > "$RUNNER_TEMP/android-image.log" 2>&1
printf 'no\n' | "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd --name serbisyogo-ci --package 'system-images;android-35;google_apis;x86_64' --device pixel --force
"$ANDROID_HOME/emulator/emulator" -avd serbisyogo-ci -no-window -no-audio -no-snapshot -no-boot-anim -no-metrics -gpu swiftshader_indirect -feature -Vulkan -memory 2048 -cores 2 > "$RUNNER_TEMP/android-emulator.log" 2>&1 &
emulator_pid=$!
ready=0
for attempt in $(seq 1 90); do
  if ! kill -0 "$emulator_pid" 2>/dev/null; then tail -n 80 "$RUNNER_TEMP/android-emulator.log"; exit 1; fi
  if [ "$(timeout 5 adb -e shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)" = '1' ]; then ready=1; break; fi
  sleep 2
done
if [ "$ready" != '1' ]; then tail -n 50 "$RUNNER_TEMP/android-emulator.log"; exit 1; fi
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell input keyevent 82
