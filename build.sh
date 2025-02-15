#!/bin/bash

watch_mode=false

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --watch) watch_mode=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

compile() {
    while read -r cmd; do
        echo "$cmd"
        eval "$cmd"

        if [ $? -ne 0 ]; then
            return 1
        fi
    done << 'COMMANDS'
clang-19 --target=wasm32 -std=c23 -pedantic -Wall -Os -g -nostdlib -Wl,--no-entry -fuse-ld=lld -fno-builtin -Wl,--allow-undefined -Wl,--export-table wasm/main.c wasm/vendor/walloc.c -o public/output.wasm
wasm2wat public/output.wasm > public/output.wat
COMMANDS
}

if [ "$watch_mode" = true ]; then
    echo "Watching wasm directory for changes..."
    while true; do
        compile
        inotifywait -q -e modify -r wasm/
    done
else
    compile
fi
