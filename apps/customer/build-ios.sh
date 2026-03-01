#!/bin/bash
set -e
cd "$(dirname "$0")"
rm -rf ios android
exec npx expo run:ios 2>&1
