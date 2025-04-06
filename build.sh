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

log() {
    local cmd="$@"
    echo $cmd
    time eval "$cmd"
}

compile() {
    log bear -- clang-19 \
         --target=wasm32 \
         -std=c23 \
         -pedantic \
         -Wall \
         -Os \
         -g \
         -gdwarf-5 \
         -gsplit-dwarf \
         -nostdlib \
         -fuse-ld=lld \
         -fno-builtin \
         -Wl,--no-entry \
         -Wl,--allow-undefined \
         -Wl,--export-table \
         wasm/main.c wasm/vendor/walloc.c \
         -o public/output.wasm
    log "wasm2wat public/output.wasm > public/output.wat"
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
