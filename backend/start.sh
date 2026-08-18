#!/bin/bash
cd "$(dirname "$0")"
exec ./pocketbase serve --http=127.0.0.1:8090
